import { randomUUID } from 'node:crypto';
import { sql,type Kysely,type ExpressionBuilder } from 'kysely';
import { z } from 'zod';
import { database, lockCatalog, type DB } from '@/modules/platform';
import { actorFor, canCreate } from '@/modules/identity';
export type Category = { code: string; label: string };
export async function listCategories(locale:'en'|'es', db:Kysely<DB> = database()):Promise<Category[]> {
 const rows = await db.selectFrom('taxonomy_term as t').innerJoin('category_display as d','d.term_id','t.id').select(['t.code','d.label_en','d.label_es']).orderBy('d.sort_order').execute();
 return rows.map(r=>({code:r.code,label:locale==='es'?r.label_es:r.label_en}));
}
export async function assertCategoryCodes(codes:readonly string[], db:Kysely<DB>):Promise<string[]> {
 const unique = [...new Set(codes)];
 const found = unique.length ? await db.selectFrom('taxonomy_term as t').innerJoin('category_display as d','d.term_id','t.id').select('t.code').where('t.code','in',unique).execute() : [];
 if (found.length !== unique.length) throw new Error('Unknown category');
 return unique;
}
// A service has at least one category attribute whose code is in `codes`.
function hasCategory(eb:ExpressionBuilder<any,any>, serviceRef:string, codes:readonly string[]) {
 return eb.exists(eb.selectFrom('attribute as at').innerJoin('taxonomy_term as tt','tt.id','at.taxonomy_term_id').select('at.id').whereRef('at.link_id','=',serviceRef).where('tt.code','in',codes.length?codes:['__none__']));
}
const categoryCodes = (eb:ExpressionBuilder<any,any>) => eb.selectFrom('attribute as at').innerJoin('taxonomy_term as tt','tt.id','at.taxonomy_term_id').innerJoin('category_display as cd','cd.term_id','tt.id').select(sql<string[]>`COALESCE(array_agg(tt.code ORDER BY cd.sort_order),'{}')`.as('codes')).whereRef('at.link_id','=','s.id').as('categories');
const optionalUrl = z.union([z.literal(''),z.url().refine(v=>['https:','http:'].includes(new URL(v).protocol),'Use an HTTP or HTTPS address')]);
export const resourceInput = z.object({
 name:z.string().trim().min(3).max(150), description:z.string().trim().min(10).max(3000),
 organization_name:z.string().trim().min(2).max(150), categories:z.array(z.string()).min(1).max(10),
 postal_code:z.string().regex(/^[0-9]{5}$/, 'Use a five-digit ZIP code'),
 eligibility_description:z.string().trim().min(3).max(2000), application_process:z.string().trim().min(3).max(2000),
 url:optionalUrl, source_note:z.string().trim().min(10).max(2000),
}).strict();
export async function acceptResource(userId:string, raw:unknown, existingId?:string) {
 const input = resourceInput.parse(raw);
 return database().transaction().execute(async trx=>{
  await lockCatalog(trx);
  const actor = await actorFor(userId,trx);
  const codes = await assertCategoryCodes(input.categories,trx);
  if (!canCreate(actor) || (actor.role === 'community' && (actor.postal_code !== input.postal_code || !codes.every(c=>actor.category_scope.includes(c))))) throw new Error('Access denied');
  const existing = existingId ? await trx.selectFrom('service').selectAll().where('id','=',existingId).forUpdate().executeTakeFirstOrThrow() : null;
  if (existing && actor.role !== 'admin' && (actor.role !== 'organization' || existing.organization_id !== actor.organization_id)) throw new Error('Access denied');
  const previousState = existing ? await trx.selectFrom('listing_state').select('created_by').where('service_id','=',existing.id).executeTakeFirstOrThrow() : null;
  let organizationId = existing?.organization_id ?? actor.organization_id;
  if (!organizationId) {
   organizationId = randomUUID();
   await trx.insertInto('organization').values({id:organizationId,name:input.organization_name}).execute();
  }
  const owner = await trx.selectFrom('organization').select('name').where('id','=',organizationId).executeTakeFirstOrThrow();
  if (owner.name !== input.organization_name) throw new Error('Organization name changes require a separate organization update');
  const id = existing?.id ?? randomUUID();
  const values = {organization_id:organizationId,name:input.name,description:input.description,url:input.url || null,eligibility_description:input.eligibility_description,application_process:input.application_process};
  if (existing) await trx.updateTable('service').set(values).where('id','=',id).execute();
  else await trx.insertInto('service').values({id,...values}).execute();
  await trx.insertInto('service_area').values({id:randomUUID(),service_id:id,name:'ZIP '+input.postal_code,extent:input.postal_code,extent_type:'text'}).onConflict(o=>o.column('service_id').doUpdateSet({name:'ZIP '+input.postal_code,extent:input.postal_code})).execute();
  const revisionId = randomUUID();
  await trx.insertInto('field_assertion').values({id:revisionId,service_id:id,actor_id:actor.user_id,origin:actor.role,value:JSON.stringify({input,previous:existing}),status:'accepted'}).execute();
  const terms = await trx.selectFrom('taxonomy_term as t').innerJoin('category_display as d','d.term_id','t.id').select('t.id').where('t.code','in',codes).execute();
  await trx.deleteFrom('attribute').where('link_id','=',id).where('taxonomy_term_id','not in',terms.map(t=>t.id)).execute();
  await trx.insertInto('attribute').values(terms.map(t=>({id:randomUUID(),link_id:id,link_entity:'service',link_type:'category',taxonomy_term_id:t.id}))).onConflict(o=>o.columns(['link_id','taxonomy_term_id']).doNothing()).execute();
  await trx.insertInto('listing_state').values({service_id:id,created_by:actor.user_id,revision_id:revisionId}).onConflict(o=>o.column('service_id').doUpdateSet({revision_id:revisionId,state:'unreviewed',checked_at:null,next_review_due:null})).execute();
  const verifier = await trx.selectFrom('membership').select('user_id').where('role','=','community').where('approved','=',true).where('postal_code','=',input.postal_code).where(sql<boolean>`category_scope && ${codes}::text[]`).where('user_id','!=',actor.user_id).where('user_id','!=',previousState?.created_by ?? actor.user_id).orderBy('user_id').executeTakeFirst();
  await trx.insertInto('work_item').values({service_id:id,assigned_to:verifier?.user_id ?? null}).onConflict(o=>o.column('service_id').doUpdateSet({assigned_to:verifier?.user_id ?? null,due_at:new Date()})).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:actor.user_id,action:existing?'resource.updated':'resource.created',subject:id,detail:JSON.stringify({asserted_by:actor.role})}).execute();
  return id;
 });
}
export async function publicResources(filters?:{postal_code:string;needs:readonly string[]}) {
 let query = database().selectFrom('service as s').innerJoin('listing_state as l','l.service_id','s.id').innerJoin('service_area as a','a.service_id','s.id')
 .select(['s.id','s.name','s.description','s.url','s.eligibility_description','s.application_process','l.checked_at','l.next_review_due','a.extent as postal_code'])
 .select(eb=>[categoryCodes(eb),eb.selectFrom('verification_event as v').select('v.method').whereRef('v.service_id','=','s.id').orderBy('v.observed_at','desc').orderBy('v.id','desc').limit(1).as('check_method'),eb.selectFrom('verification_event as v').select('v.fields_checked').whereRef('v.service_id','=','s.id').orderBy('v.observed_at','desc').orderBy('v.id','desc').limit(1).as('fields_checked')])
 .where('s.status','=','active').where('l.state','=','checked').where('l.next_review_due','>',new Date());
 if(filters){if(!filters.needs.length)return [];query=query.where('a.extent','=',filters.postal_code).where(eb=>hasCategory(eb,'s.id',filters.needs));}
 return query.orderBy('s.name').limit(100).execute();
}
export async function ownedResources(userId:string,resourceId?:string) {
 const actor = await actorFor(userId);
 if (!['admin','organization'].includes(actor.role)) throw new Error('Access denied');
 if(resourceId&&!z.uuid().safeParse(resourceId).success)return [];
 let query = database().selectFrom('service as s').innerJoin('listing_state as l','l.service_id','s.id').innerJoin('service_area as a','a.service_id','s.id').innerJoin('organization as o','o.id','s.organization_id').select(eb=>[categoryCodes(eb)]).select(['s.id','s.name','s.description','s.url','s.eligibility_description','s.application_process','l.state','l.checked_at','l.next_review_due','a.extent as postal_code','o.name as organization_name']);
 if (actor.role === 'organization') query = query.where('s.organization_id','=',actor.organization_id!);
 if(resourceId)query=query.where('s.id','=',resourceId);
 return query.orderBy('s.name').limit(100).execute();
}
export async function ownedResource(userId:string,resourceId:string){return (await ownedResources(userId,resourceId))[0];}
export async function verificationQueue(userId:string) {
 const actor = await actorFor(userId);
 if (actor.role !== 'admin' && !(actor.role === 'community' && actor.approved)) throw new Error('Access denied');
 let query = database().selectFrom('work_item as w').innerJoin('service as s','s.id','w.service_id').innerJoin('service_area as a','a.service_id','s.id').innerJoin('listing_state as l','l.service_id','s.id').select(['s.id','s.name','s.description','s.eligibility_description','s.application_process','s.url','w.due_at','a.extent as postal_code','l.revision_id']).where('w.due_at','<=',new Date());
 if (actor.role !== 'admin') query = query.where('w.assigned_to','=',actor.user_id).where('a.extent','=',actor.postal_code!).where(eb=>hasCategory(eb,'s.id',actor.category_scope));
 return query.orderBy('w.due_at').limit(100).execute();
}
export async function verifyResource(userId:string, serviceId:string, raw:unknown) {
 const input = z.object({revision_id:z.uuid(),method:z.enum(['phone','website','in_person']),evidence:z.string().trim().min(10).max(2000),fields_checked:z.string().trim().min(5).max(500)}).parse(raw);
 await database().transaction().execute(async trx=>{
  await lockCatalog(trx);
  const actor = await actorFor(userId,trx);
  await trx.selectFrom('service').select('id').where('id','=',serviceId).forUpdate().executeTakeFirstOrThrow();
  const item = await trx.selectFrom('work_item as w').innerJoin('service_area as a','a.service_id','w.service_id').innerJoin('listing_state as l','l.service_id','w.service_id').select(['w.assigned_to','a.extent','l.created_by','l.revision_id']).where('w.service_id','=',serviceId).forUpdate().executeTakeFirstOrThrow();
  const scoped = actor.role === 'community' && !!(await trx.selectFrom('attribute as at').innerJoin('taxonomy_term as tt','tt.id','at.taxonomy_term_id').select('at.id').where('at.link_id','=',serviceId).where('tt.code','in',actor.category_scope.length?actor.category_scope:['__none__']).executeTakeFirst());
  if (actor.role !== 'admin' && !(actor.role === 'community' && actor.approved && item.assigned_to === actor.user_id && item.extent === actor.postal_code && item.created_by !== actor.user_id && scoped)) throw new Error('Access denied');
  if (item.revision_id !== input.revision_id) throw new Error('The resource changed; review the current version');
  const now = new Date(), due = new Date(now.getTime()+30*86400000);
  await trx.insertInto('verification_event').values({id:randomUUID(),service_id:serviceId,actor_id:userId,method:input.method,evidence:input.evidence,fields_checked:input.fields_checked,expires_at:due}).execute();
  await trx.updateTable('listing_state').set({state:'checked',checked_at:now,next_review_due:due}).where('service_id','=',serviceId).execute();
  await trx.updateTable('work_item').set({due_at:due}).where('service_id','=',serviceId).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:userId,action:'resource.verified',subject:serviceId,detail:JSON.stringify({method:input.method,fields:input.fields_checked,revision_id:input.revision_id})}).execute();
 });
}

export async function organizationFor(userId:string) { const actor=await actorFor(userId);if(!actor.organization_id) throw new Error('Access denied');return database().selectFrom('organization').select(['id','name']).where('id','=',actor.organization_id).executeTakeFirstOrThrow(); }
