import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { database } from '@/modules/platform';
import { actorFor, canCreate } from '@/modules/identity';
export const categories = ['food','housing','health','work','legal','other'] as const;
const optionalUrl = z.union([z.literal(''),z.url().refine(v=>['https:','http:'].includes(new URL(v).protocol),'Use an HTTP or HTTPS address')]);
export const resourceInput = z.object({
 name:z.string().trim().min(3).max(150), description:z.string().trim().min(10).max(3000),
 organization_name:z.string().trim().min(2).max(150), category:z.enum(categories),
 postal_code:z.string().regex(/^[0-9]{5}$/, 'Use a five-digit ZIP code'),
 eligibility_description:z.string().trim().min(3).max(2000), application_process:z.string().trim().min(3).max(2000),
 url:optionalUrl, source_note:z.string().trim().min(10).max(2000),
}).strict();
export async function acceptResource(userId:string, raw:unknown, existingId?:string) {
 const input = resourceInput.parse(raw);
 return database().transaction().execute(async trx=>{
  const actor = await actorFor(userId,trx);
  if (!canCreate(actor)) throw new Error('Access denied');
  const existing = existingId ? await trx.selectFrom('service').selectAll().where('id','=',existingId).forUpdate().executeTakeFirstOrThrow() : null;
  if (existing && actor.role !== 'admin' && (actor.role !== 'organization' || existing.organization_id !== actor.organization_id)) throw new Error('Access denied');
  let organizationId = existing?.organization_id ?? actor.organization_id;
  if (!organizationId) {
   organizationId = randomUUID();
   await trx.insertInto('organization').values({id:organizationId,name:input.organization_name}).execute();
  }
  const id = existing?.id ?? randomUUID();
  const values = {organization_id:organizationId,name:input.name,description:input.description,url:input.url || null,eligibility_description:input.eligibility_description,application_process:input.application_process};
  if (existing) await trx.updateTable('service').set(values).where('id','=',id).execute();
  else await trx.insertInto('service').values({id,...values}).execute();
  await trx.insertInto('service_area').values({id:randomUUID(),service_id:id,name:'ZIP '+input.postal_code,extent:input.postal_code,extent_type:'text'}).onConflict(o=>o.column('service_id').doUpdateSet({name:'ZIP '+input.postal_code,extent:input.postal_code})).execute();
  await trx.insertInto('field_assertion').values({id:randomUUID(),service_id:id,actor_id:actor.user_id,origin:actor.role,value:JSON.stringify({input,previous:existing}),status:'accepted'}).execute();
  await trx.insertInto('listing_state').values({service_id:id,category:input.category,created_by:actor.user_id}).onConflict(o=>o.column('service_id').doUpdateSet({category:input.category,state:'unreviewed',checked_at:null,next_review_due:null})).execute();
  const verifier = await trx.selectFrom('membership').select('user_id').where('role','=','community').where('approved','=',true).where('postal_code','=',input.postal_code).where('user_id','!=',actor.user_id).orderBy('user_id').executeTakeFirst();
  await trx.insertInto('work_item').values({service_id:id,assigned_to:verifier?.user_id ?? null}).onConflict(o=>o.column('service_id').doUpdateSet({assigned_to:verifier?.user_id ?? null,due_at:new Date()})).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:actor.user_id,action:existing?'resource.updated':'resource.created',subject:id,detail:JSON.stringify({asserted_by:actor.role})}).execute();
  return id;
 });
}
export async function publicResources() {
 return database().selectFrom('service as s').innerJoin('listing_state as l','l.service_id','s.id').innerJoin('service_area as a','a.service_id','s.id')
 .select(['s.id','s.name','s.description','s.url','s.eligibility_description','s.application_process','l.category','l.checked_at','l.next_review_due','a.extent as postal_code'])
 .where('s.status','=','active').where('l.state','=','checked').where('l.next_review_due','>',new Date()).orderBy('s.name').limit(100).execute();
}
export async function ownedResources(userId:string) {
 const actor = await actorFor(userId);
 if (!['admin','organization'].includes(actor.role)) throw new Error('Access denied');
 let query = database().selectFrom('service as s').innerJoin('listing_state as l','l.service_id','s.id').innerJoin('service_area as a','a.service_id','s.id').innerJoin('organization as o','o.id','s.organization_id').select(['s.id','s.name','s.description','s.url','s.eligibility_description','s.application_process','l.category','l.state','a.extent as postal_code','o.name as organization_name']);
 if (actor.role === 'organization') query = query.where('s.organization_id','=',actor.organization_id!);
 return query.orderBy('s.name').limit(100).execute();
}
export async function verificationQueue(userId:string) {
 const actor = await actorFor(userId);
 if (actor.role !== 'admin' && !(actor.role === 'community' && actor.approved)) throw new Error('Access denied');
 let query = database().selectFrom('work_item as w').innerJoin('service as s','s.id','w.service_id').innerJoin('service_area as a','a.service_id','s.id').select(['s.id','s.name','s.description','w.due_at','a.extent as postal_code']).where('w.due_at','<=',new Date());
 if (actor.role !== 'admin') query = query.where('w.assigned_to','=',actor.user_id).where('a.extent','=',actor.postal_code!);
 return query.orderBy('w.due_at').limit(100).execute();
}
export async function verifyResource(userId:string, serviceId:string, raw:unknown) {
 const input = z.object({method:z.enum(['phone','website','in_person']),evidence:z.string().trim().min(10).max(2000),fields_checked:z.string().trim().min(5).max(500)}).parse(raw);
 await database().transaction().execute(async trx=>{
  const actor = await actorFor(userId,trx);
  const item = await trx.selectFrom('work_item as w').innerJoin('service_area as a','a.service_id','w.service_id').innerJoin('listing_state as l','l.service_id','w.service_id').select(['w.assigned_to','a.extent','l.created_by']).where('w.service_id','=',serviceId).forUpdate().executeTakeFirstOrThrow();
  if (actor.role !== 'admin' && !(actor.role === 'community' && actor.approved && item.assigned_to === actor.user_id && item.extent === actor.postal_code && item.created_by !== actor.user_id)) throw new Error('Access denied');
  const now = new Date(), due = new Date(now.getTime()+30*86400000);
  await trx.insertInto('verification_event').values({id:randomUUID(),service_id:serviceId,actor_id:userId,...input,expires_at:due}).execute();
  await trx.updateTable('listing_state').set({state:'checked',checked_at:now,next_review_due:due}).where('service_id','=',serviceId).execute();
  await trx.updateTable('work_item').set({due_at:due}).where('service_id','=',serviceId).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:userId,action:'resource.verified',subject:serviceId,detail:JSON.stringify({method:input.method,fields:input.fields_checked})}).execute();
 });
}
