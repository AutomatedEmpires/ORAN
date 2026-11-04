import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { database,lockCatalog } from '@/modules/platform';
import { assertCategoryCodes,serviceHasCategory,serviceInVerifierArea } from '@/modules/catalog';
import { actorFor,affiliatedOrganizationIds,isAdmin } from '@/modules/identity';
export async function members(adminId:string) {
 if(!isAdmin(await actorFor(adminId)))throw new Error('Access denied');
 return database().selectFrom('membership as m').innerJoin('account as a','a.user_id','m.user_id').select(['m.user_id','a.display_name','m.role','m.approved','m.postal_code','m.category_scope']).where('m.role','=','community').execute();
}
export async function approveContributor(adminId:string,userId:string,postalCode:string,categoryScope:readonly string[]){
 const requested=z.array(z.string()).min(1).parse(categoryScope);
 if(!/^[0-9]{5}$/.test(postalCode))throw new Error('A five-digit ZIP scope is required');
 await database().transaction().execute(async trx=>{
  await lockCatalog(trx);
  const granted=await assertCategoryCodes(requested,trx);
  if(!isAdmin(await actorFor(adminId,trx)))throw new Error('Access denied');
  await trx.updateTable('membership').set({approved:true,postal_code:postalCode,category_scope:granted}).where('user_id','=',userId).where('role','=','community').returning('user_id').executeTakeFirstOrThrow();
  // Ownership is never independent verification: no work from organizations this verifier is affiliated with, approved or pending.
  const affiliated=affiliatedOrganizationIds(await actorFor(userId,trx));
  const candidates=await trx.selectFrom('work_item').select('service_id').where(eb=>eb.or([eb('assigned_to','=',userId),eb('assigned_to','is',null)])).orderBy('service_id').execute();
  for(const candidate of candidates){
   // All acceptance/verification/assignment mutations lock the service first.
   const service=await trx.selectFrom('service').select('organization_id').where('id','=',candidate.service_id).forUpdate().executeTakeFirstOrThrow();
   const item=await trx.selectFrom('work_item as w').innerJoin('listing_state as l','l.service_id','w.service_id').select(['w.assigned_to','l.created_by']).where('w.service_id','=',candidate.service_id).executeTakeFirstOrThrow();
   const eligible=item.created_by!==userId&&!affiliated.includes(service.organization_id)&&await serviceInVerifierArea(trx,candidate.service_id,postalCode)&&await serviceHasCategory(trx,candidate.service_id,granted);
   if(item.assigned_to===userId&&!eligible)await trx.updateTable('work_item').set({assigned_to:null}).where('service_id','=',candidate.service_id).execute();
   if(item.assigned_to===null&&eligible)await trx.updateTable('work_item').set({assigned_to:userId}).where('service_id','=',candidate.service_id).execute();
  }
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:adminId,action:'community.approved',subject:userId,detail:JSON.stringify({postal_code:postalCode,category_scope:granted})}).execute();
 });
}
