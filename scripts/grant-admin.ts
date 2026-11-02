import { randomUUID } from 'node:crypto';
import { database, config, closeDatabase } from '../src/modules/platform/index';
const userId=process.argv[2];
if (!userId?.startsWith('user_') || config().stage==='production') throw new Error('Provide a real Clerk user ID for a non-production environment');
const db=database();
await db.transaction().execute(async trx=>{
 await trx.insertInto('membership').values({user_id:userId,role:'admin',display_name:'Administrator',approved:true}).onConflict(o=>o.column('user_id').doNothing()).execute();
 await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:userId,action:'admin.bootstrapped',subject:userId}).execute();
});
await closeDatabase();
console.log('Non-production administrator registered.');
