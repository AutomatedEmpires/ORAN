import { z } from 'zod';
import { database } from '@/modules/platform';
import { actorFor } from '@/modules/identity';
import { assertCategoryCodes } from '@/modules/catalog';
const input = z.object({postal_code:z.string().regex(/^[0-9]{5}$/),needs:z.array(z.string()).min(1).max(10),consent:z.literal(true)});
export async function saveProfile(userId:string, raw:unknown) {
 await actorFor(userId);
 const data = input.parse(raw);
 await database().transaction().execute(async trx=>{
  const needs=await assertCategoryCodes(data.needs,trx);
  await trx.insertInto('personal_profile').values({user_id:userId,postal_code:data.postal_code,needs}).onConflict(o=>o.column('user_id').doUpdateSet({postal_code:data.postal_code,needs,updated_at:new Date(),consented_at:new Date()})).execute();
 });
}
export async function profileFor(userId:string) { await actorFor(userId); return database().selectFrom('personal_profile').selectAll().where('user_id','=',userId).executeTakeFirst(); }
export async function deleteProfile(userId:string) { await actorFor(userId); await database().deleteFrom('personal_profile').where('user_id','=',userId).execute(); }
