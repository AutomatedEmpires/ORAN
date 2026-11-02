import { database } from '../src/modules/platform/index';
export async function seed() {
 if (process.env.ORAN_LOCAL_DEV !== '1' && process.env.ORAN_ENV !== 'test') throw new Error('Synthetic identities are local/test only');
 const db = database();
 const org = '00000000-0000-4000-8000-000000000001';
 await db.insertInto('organization').values({id: org, name: 'Development organization'}).onConflict(o=>o.column('id').doNothing()).execute();
 for (const [user_id, role, display_name] of [['dev-admin','admin','Development admin'],['dev-org','organization','Development organization staff'],['dev-community','community','Development community contributor'],['dev-user','user','Development user']] as const) {
  await db.insertInto('membership').values({user_id, role, display_name, organization_id: role === 'organization' ? org : null, approved: role !== 'community', postal_code: role === 'community' ? '98101' : null}).onConflict(o=>o.column('user_id').doNothing()).execute();
 }
}
