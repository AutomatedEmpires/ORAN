import { database } from '../src/modules/platform/index';
import { ensureAccount } from '../src/modules/identity/index';
export async function seed() {
 if (process.env.ORAN_LOCAL_DEV !== '1' && process.env.ORAN_ENV !== 'test') throw new Error('Synthetic identities are local/test only');
 const db = database();
 const org = '00000000-0000-4000-8000-000000000001';
 await db.insertInto('organization').values({id: org, name: 'Development organization'}).onConflict(o=>o.column('id').doNothing()).execute();
 // Every identity is an account (a seeker); dev-user holds no membership.
 for (const [userId, displayName] of [['dev-admin','Development admin'],['dev-org','Development organization staff'],['dev-community','Development community contributor'],['dev-user','Development user']] as const) await ensureAccount(userId, displayName, db);
 await db.insertInto('membership').values([
  {user_id: 'dev-admin', role: 'admin', approved: true},
  {user_id: 'dev-org', role: 'organization', organization_id: org, approved: true},
  {user_id: 'dev-community', role: 'community', approved: false, postal_code: '98101'},
 ]).onConflict(o=>o.constraint('membership_unique_scope').doNothing()).execute();
}
