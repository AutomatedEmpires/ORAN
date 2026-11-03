import { randomUUID } from 'node:crypto';
import { database, config, closeDatabase } from '../src/modules/platform/index';
import { ensureAccount } from '../src/modules/identity/index';
const userId=process.argv[2];
if (!userId?.startsWith('user_') || config().stage==='production') throw new Error('Provide a real Clerk user ID for a non-production environment');
const db=database();
await db.transaction().execute(async trx=>{
 await ensureAccount(userId,'Administrator',trx);
 await trx.insertInto('membership').values({user_id:userId,role:'admin',approved:true}).onConflict(o=>o.constraint('membership_unique_scope').doUpdateSet({approved:true})).execute();
 await trx.insertInto('audit_event').values({id:randomUUID(),actor_id:userId,action:'admin.bootstrapped',subject:userId}).execute();
});
await closeDatabase();
console.log('Non-production administrator registered.');
