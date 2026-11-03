import { randomUUID } from 'node:crypto';
import { sql,type Kysely,type ExpressionBuilder } from 'kysely';
import { z } from 'zod';
import { database, lockCatalog, type DB } from '@/modules/platform';
import { actorFor, canCreate, isAdmin, organizationIds, verifierScope } from '@/modules/identity';
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
const categoryTaxonomyId='7f3c2a10-0c5e-4d8e-9a51-0a0000000001';
export const categoryCodeList=z.array(z.string().regex(/^[a-z][a-z0-9_]{1,39}$/)).min(1).max(50);
const categoryInput=z.object({code:z.string().regex(/^[a-z][a-z0-9_]{1,39}$/,'Use lower-case letters, digits and underscores'),label_en:z.string().trim().min(2).max(60),label_es:z.string().trim().min(2).max(60)}).strict();
export async function addCategory(adminId:string, raw:unknown):Promise<string> {
 const input = categoryInput.parse(raw);
 return database().transaction().execute(async trx=>{
  await lockCatalog(trx);
  if (!isAdmin(await actorFor(adminId,trx))) throw new Error('Access denied');
  if (await trx.selectFrom('taxonomy_term').select('id').where('taxonomy_id','=',categoryTaxonomyId).where('code','=',input.code).executeTakeFirst()) throw new Error('Category already exists');
  const id = randomUUID();
  const last = await trx.selectFrom('category_display').select(sql<number>`COALESCE(MAX(sort_order),0)`.as('max')).executeTakeFirstOrThrow();
  await trx.insertInto('taxonomy_term').values({id,taxonomy_id:categoryTaxonomyId,code:input.code,name:input.label_en}).execute();
  await trx.insertInto('category_display').values({term_id:id,sort_order:Number(last.max)+1,label_en:input.label_en,label_es:input.label_es}).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:adminId,action:'category.added',subject:input.code,detail:JSON.stringify({label_en:input.label_en,label_es:input.label_es})}).execute();
  return input.code;
 });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyBuilder = ExpressionBuilder<any,any>;
// A service has at least one category attribute whose code is in `codes`.
function categoryAttributes(eb:AnyBuilder, codes:readonly string[]) {
 return eb.selectFrom('attribute as at').innerJoin('taxonomy_term as tt','tt.id','at.taxonomy_term_id').innerJoin('category_display as cd','cd.term_id','tt.id').where('at.link_entity','=','service').where('at.link_type','=','category').where('tt.code','in',codes.length?codes:['__none__']);
}
function hasCategory(eb:AnyBuilder, serviceRef:string, codes:readonly string[]) {
 return eb.exists(categoryAttributes(eb,codes).select('at.id').whereRef('at.link_id','=',serviceRef));
}
export async function serviceHasCategory(db:Kysely<DB>, serviceId:string, codes:readonly string[]) {
 return !!(await categoryAttributes(db as never,codes).select('at.id').where('at.link_id','=',serviceId).executeTakeFirst());
}
const categoryCodes = (eb:AnyBuilder) => eb.fn.coalesce(eb.selectFrom('attribute as at').innerJoin('taxonomy_term as tt','tt.id','at.taxonomy_term_id').innerJoin('category_display as cd','cd.term_id','tt.id').select(sql<string[]>`COALESCE(array_agg(tt.code ORDER BY cd.sort_order),'{}')`.as('codes')).whereRef('at.link_id','=','s.id').where('at.link_entity','=','service').where('at.link_type','=','category'),sql<string[]>`'{}'::text[]`).as('categories');
const optionalUrl = z.union([z.literal(''),z.url().refine(v=>['https:','http:'].includes(new URL(v).protocol),'Use an HTTP or HTTPS address')]);
export const resourceInput = z.object({
 name:z.string().trim().min(3).max(150), description:z.string().trim().min(10).max(3000),
 organization_name:z.string().trim().min(2).max(150), organization_id:z.uuid().optional(), categories:categoryCodeList,
 postal_code:z.string().regex(/^[0-9]{5}$/, 'Use a five-digit ZIP code'),
 eligibility_description:z.string().trim().min(3).max(2000), application_process:z.string().trim().min(3).max(2000),
 url:optionalUrl, source_note:z.string().trim().min(10).max(2000),
}).strict();
export async function acceptResource(userId:string, raw:unknown, existingId?:string) {
 const input = resourceInput.parse(raw);
 return database().transaction().execute(async trx=>{
  await lockCatalog(trx);
  const actor = await actorFor(userId,trx), admin = isAdmin(actor), orgs = organizationIds(actor), scope = verifierScope(actor);
  const codes = await assertCategoryCodes(input.categories,trx);
  if (!canCreate(actor)) throw new Error('Access denied');
  const existing = existingId ? await trx.selectFrom('service').selectAll().where('id','=',existingId).forUpdate().executeTakeFirstOrThrow() : null;
  // The listing's organization: its current owner or the one chosen.
  let organizationId = existing?.organization_id ?? input.organization_id;
  if (organizationId && !admin && !orgs.includes(organizationId)) throw new Error('Access denied');
  if (existing && input.organization_id && input.organization_id !== existing.organization_id) throw new Error('Organization changes require a separate organization update');
  const inScope = !!scope && scope.postal_code === input.postal_code && codes.every(c=>scope.category_scope.includes(c));
  if (!organizationId && orgs.length) {
   // Staff file under their only organization when the name matches; admins and in-scope verifiers may name a new one.
   const matches = (await trx.selectFrom('organization').select('id').where('id','in',orgs).where('name','=',input.organization_name).execute()).map(o=>o.id);
   if (orgs.length === 1 && matches.length === 1) organizationId = matches[0];
   else if (matches.length || !(admin || inScope)) throw new Error(orgs.length === 1 ? 'Organization name changes require a separate organization update' : 'Choose an organization');
  }
  // The capacity used; with no organization, a verifier files only inside their area and categories.
  const capacity = admin ? 'admin' : organizationId ? 'organization' : 'community';
  if (capacity === 'community' && !inScope) throw new Error('Access denied');
  const previousState = existing ? await trx.selectFrom('listing_state').select('created_by').where('service_id','=',existing.id).executeTakeFirstOrThrow() : null;
  if (!organizationId) {
   organizationId = randomUUID();
   await trx.insertInto('organization').values({id:organizationId,name:input.organization_name}).execute();
  }
  const owner = await trx.selectFrom('organization').select('name').where('id','=',organizationId).executeTakeFirst();
  if (!owner) throw new Error('Unknown organization');
  if (owner.name !== input.organization_name) throw new Error('Organization name changes require a separate organization update');
  const id = existing?.id ?? randomUUID();
  const values = {organization_id:organizationId,name:input.name,description:input.description,url:input.url || null,eligibility_description:input.eligibility_description,application_process:input.application_process};
  if (existing) await trx.updateTable('service').set(values).where('id','=',id).execute();
  else await trx.insertInto('service').values({id,...values}).execute();
  await trx.insertInto('service_area').values({id:randomUUID(),service_id:id,name:'ZIP '+input.postal_code,extent:input.postal_code,extent_type:'text'}).onConflict(o=>o.column('service_id').doUpdateSet({name:'ZIP '+input.postal_code,extent:input.postal_code})).execute();
  const revisionId = randomUUID();
  await trx.insertInto('field_assertion').values({id:revisionId,service_id:id,actor_id:actor.user_id,origin:capacity,value:JSON.stringify({input,previous:existing}),status:'accepted'}).execute();
  const terms = await trx.selectFrom('taxonomy_term as t').innerJoin('category_display as d','d.term_id','t.id').select('t.id').where('t.code','in',codes).execute();
  await trx.deleteFrom('attribute').where('link_id','=',id).where('link_entity','=','service').where('link_type','=','category').where('taxonomy_term_id','not in',terms.map(t=>t.id)).execute();
  await trx.insertInto('attribute').values(terms.map(t=>({id:randomUUID(),link_id:id,link_entity:'service',link_type:'category',taxonomy_term_id:t.id}))).onConflict(o=>o.columns(['link_id','taxonomy_term_id']).doNothing()).execute();
  await trx.insertInto('listing_state').values({service_id:id,created_by:actor.user_id,revision_id:revisionId}).onConflict(o=>o.column('service_id').doUpdateSet({revision_id:revisionId,state:'unreviewed',checked_at:null,next_review_due:null})).execute();
  // Ownership is never independent verification: skip candidates who are approved staff of this organization.
  const verifier = await trx.selectFrom('membership as m').select('m.user_id').where('m.role','=','community').where('m.approved','=',true).where('m.postal_code','=',input.postal_code).where(sql<boolean>`m.category_scope && ${codes}::text[]`).where('m.user_id','!=',actor.user_id).where('m.user_id','!=',previousState?.created_by ?? actor.user_id)
   .where(eb=>eb.not(eb.exists(eb.selectFrom('membership as staff').select('staff.id').whereRef('staff.user_id','=','m.user_id').where('staff.role','=','organization').where('staff.approved','=',true).where('staff.organization_id','=',organizationId)))).orderBy('m.user_id').executeTakeFirst();
  await trx.insertInto('work_item').values({service_id:id,assigned_to:verifier?.user_id ?? null}).onConflict(o=>o.column('service_id').doUpdateSet({assigned_to:verifier?.user_id ?? null,due_at:new Date()})).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:actor.user_id,action:existing?'resource.updated':'resource.created',subject:id,detail:JSON.stringify({asserted_by:capacity})}).execute();
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
 const actor = await actorFor(userId), admin = isAdmin(actor), orgs = organizationIds(actor);
 if (!admin && !orgs.length) throw new Error('Access denied');
 if(resourceId&&!z.uuid().safeParse(resourceId).success)return [];
 let query = database().selectFrom('service as s').innerJoin('listing_state as l','l.service_id','s.id').innerJoin('service_area as a','a.service_id','s.id').innerJoin('organization as o','o.id','s.organization_id').select(eb=>[categoryCodes(eb)]).select(['s.id','s.name','s.description','s.url','s.eligibility_description','s.application_process','l.state','l.checked_at','l.next_review_due','a.extent as postal_code','o.name as organization_name']);
 if (!admin) query = query.where('s.organization_id','in',orgs);
 if(resourceId)query=query.where('s.id','=',resourceId);
 return query.orderBy('s.name').limit(100).execute();
}
export async function ownedResource(userId:string,resourceId:string){return (await ownedResources(userId,resourceId))[0];}
export async function verificationQueue(userId:string) {
 const actor = await actorFor(userId);
 let query = database().selectFrom('work_item as w').innerJoin('service as s','s.id','w.service_id').innerJoin('service_area as a','a.service_id','s.id').innerJoin('listing_state as l','l.service_id','s.id').select(['s.id','s.name','s.description','s.eligibility_description','s.application_process','s.url','w.due_at','a.extent as postal_code','l.revision_id']).where('w.due_at','<=',new Date());
 if (!isAdmin(actor)) {
  const scope = verifierScope(actor), orgs = organizationIds(actor);
  if (!scope) throw new Error('Access denied');
  query = query.where('w.assigned_to','=',actor.user_id).where('a.extent','=',scope.postal_code).where(eb=>hasCategory(eb,'s.id',scope.category_scope));
  // Ownership is never independent verification.
  if (orgs.length) query = query.where('s.organization_id','not in',orgs);
 }
 return query.orderBy('w.due_at').limit(100).execute();
}
export async function verifyResource(userId:string, serviceId:string, raw:unknown) {
 const input = z.object({revision_id:z.uuid(),method:z.enum(['phone','website','in_person']),evidence:z.string().trim().min(10).max(2000),fields_checked:z.string().trim().min(5).max(500)}).parse(raw);
 await database().transaction().execute(async trx=>{
  await lockCatalog(trx);
  const actor = await actorFor(userId,trx);
  const service = await trx.selectFrom('service').select('organization_id').where('id','=',serviceId).forUpdate().executeTakeFirstOrThrow();
  const item = await trx.selectFrom('work_item as w').innerJoin('service_area as a','a.service_id','w.service_id').innerJoin('listing_state as l','l.service_id','w.service_id').select(['w.assigned_to','a.extent','l.created_by','l.revision_id']).where('w.service_id','=',serviceId).forUpdate().executeTakeFirstOrThrow();
  const scope = verifierScope(actor);
  // A verifier checks only assigned, in-scope work they did not create, for an organization they do not staff.
  const permitted = isAdmin(actor) || (!!scope && item.assigned_to === actor.user_id && item.extent === scope.postal_code && item.created_by !== actor.user_id && !organizationIds(actor).includes(service.organization_id) && await serviceHasCategory(trx,serviceId,scope.category_scope));
  if (!permitted) throw new Error('Access denied');
  if (item.revision_id !== input.revision_id) throw new Error('The resource changed; review the current version');
  const now = new Date(), due = new Date(now.getTime()+30*86400000);
  await trx.insertInto('verification_event').values({id:randomUUID(),service_id:serviceId,actor_id:userId,method:input.method,evidence:input.evidence,fields_checked:input.fields_checked,expires_at:due}).execute();
  await trx.updateTable('listing_state').set({state:'checked',checked_at:now,next_review_due:due}).where('service_id','=',serviceId).execute();
  await trx.updateTable('work_item').set({due_at:due}).where('service_id','=',serviceId).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:userId,action:'resource.verified',subject:serviceId,detail:JSON.stringify({method:input.method,fields:input.fields_checked,revision_id:input.revision_id})}).execute();
 });
}

export async function organizationsFor(userId:string):Promise<{id:string;name:string}[]> {
 const ids = organizationIds(await actorFor(userId));
 return ids.length ? database().selectFrom('organization').select(['id','name']).where('id','in',ids).orderBy('name').execute() : [];
}
