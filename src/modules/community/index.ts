import { randomUUID } from 'node:crypto';
import { database } from '@/modules/platform';
import { z } from 'zod';
import { categories } from '@/modules/catalog';
import { actorFor } from '@/modules/identity';
export async function members(userId:string) {
 if ((await actorFor(userId)).role !== 'admin') throw new Error('Access denied');
 return database().selectFrom('membership').select(['user_id','display_name','role','approved','postal_code','category_scope']).where('role','=','community').execute();
}
export async function approveContributor(adminId:string, userId:string, postalCode:string, categoryScope:readonly string[]) {
 const granted=z.array(z.enum(categories)).min(1).parse(categoryScope);
 if (!/^[0-9]{5}$/.test(postalCode)) throw new Error('A five-digit ZIP scope is required');
 await database().transaction().execute(async trx=>{
  if ((await actorFor(adminId,trx)).role !== 'admin') throw new Error('Access denied');
  await trx.updateTable('membership').set({approved:true,postal_code:postalCode,category_scope:granted}).where('user_id','=',userId).where('role','=','community').returning('user_id').executeTakeFirstOrThrow();
  const prior=await trx.selectFrom('work_item as w').innerJoin('service_area as a','a.service_id','w.service_id').innerJoin('listing_state as l','l.service_id','w.service_id').select(['w.service_id','a.extent','l.category','l.created_by']).where('w.assigned_to','=',userId).execute();
  for(const item of prior) if(item.extent!==postalCode || !granted.includes(item.category as typeof categories[number]) || item.created_by===userId) await trx.updateTable('work_item').set({assigned_to:null}).where('service_id','=',item.service_id).execute();
  const items = await trx.selectFrom('work_item as w').innerJoin('service_area as a','a.service_id','w.service_id').innerJoin('listing_state as l','l.service_id','w.service_id').select('w.service_id').where('w.assigned_to','is',null).where('a.extent','=',postalCode).where('l.created_by','!=',userId).where('l.category','in',granted).execute();
  for (const item of items) await trx.updateTable('work_item').set({assigned_to:userId}).where('service_id','=',item.service_id).execute();
  await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:adminId,action:'community.approved',subject:userId,detail:JSON.stringify({postal_code:postalCode,category_scope:granted})}).execute();
 });
}
