import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { localDatabase } from '../scripts/local-database';
import { migrate } from '../scripts/database';
import { seed } from '../scripts/seed';
import { database,closeDatabase } from '../src/modules/platform/index';
import { acceptResource,publicResources,ownedResources,verificationQueue,verifyResource } from '../src/modules/catalog/index';
import { approveContributor } from '../src/modules/community/index';
import { saveProfile,profileFor,deleteProfile } from '../src/modules/profiles/index';
let local:Awaited<ReturnType<typeof localDatabase>>|null=null;
const input={name:'Synthetic food program',description:'Synthetic test record, not a real assistance resource.',organization_name:'Synthetic test organization',category:'food',postal_code:'98101',eligibility_description:'Contact the provider about requirements',application_process:'Contact the provider',url:'https://example.org',source_note:'Synthetic test fixture, permitted for tests only'};
const check={method:'website',evidence:'Synthetic evidence for a synthetic test record',fields_checked:'name, description, eligibility and intake instructions'};
beforeAll(async()=>{
 if (process.env.DATABASE_URL) {
  if(process.env.ORAN_ENV!=='test'||process.env.ORAN_DATABASE_HOST!==new URL(process.env.DATABASE_URL).hostname) throw new Error('Integration database must explicitly identify as test');
 } else {local=await localDatabase();process.env.DATABASE_URL=local.url;}
 process.env.ORAN_ENV='test';process.env.ORAN_DATABASE_HOST=new URL(process.env.DATABASE_URL!).hostname;
 await migrate(process.env.DATABASE_URL!);await migrate(process.env.DATABASE_URL!);
 await seed();
 await database().updateTable('membership').set({approved:false,postal_code:'98101'}).where('user_id','=','dev-community').execute();
});
afterAll(async()=>{await closeDatabase();await local?.close();});
describe('real PostgreSQL/PostGIS resource and authorization flow',()=>{
 it('has PostGIS and denies a role without schema grants',async()=>{
  const ext=await sql<{version:string}>`SELECT postgis_version() AS version`.execute(database());
  expect(ext.rows[0].version).toBeTruthy();
  await sql`CREATE ROLE oran_denied NOLOGIN`.execute(database());
  await expect(database().transaction().execute(async trx=>{
   await sql`SET LOCAL ROLE oran_denied`.execute(trx);
   await trx.selectFrom('personal_profile').selectAll().execute();
  })).rejects.toThrow();
 });
 it('admin directly creates an unpublished resource with atomic provenance and audit',async()=>{
  const id=await acceptResource('dev-admin',input);
  expect((await publicResources()).some(r=>r.id===id)).toBe(false);
  expect(await database().selectFrom('field_assertion').select('actor_id').where('service_id','=',id).executeTakeFirst()).toEqual({actor_id:'dev-admin'});
  expect(await database().selectFrom('audit_event').select('action').where('subject','=',id).execute()).toEqual([{action:'resource.created'}]);
  expect((await ownedResources('dev-admin')).some(r=>r.id===id)).toBe(true);
 });
 it('rejects ordinary users, unapproved contributors and cross-organization edits',async()=>{
  await expect(acceptResource('dev-user',input)).rejects.toThrow('Access denied');
  await expect(acceptResource('dev-community',input)).rejects.toThrow('Access denied');
  const id=await acceptResource('dev-org',input);
  const org=randomUUID();
  await database().insertInto('organization').values({id:org,name:'Other organization'}).execute();
  await database().insertInto('membership').values({user_id:'other-org',role:'organization',display_name:'Other staff',organization_id:org,approved:true}).execute();
  await expect(acceptResource('other-org',input,id)).rejects.toThrow('Access denied');
  await expect(verifyResource('dev-org',id,check)).rejects.toThrow('Access denied');
 });
 it('approval assigns scoped work, verification publishes, edits invalidate and reverification is due',async()=>{
  const id=await acceptResource('dev-admin',input);
  await expect(verifyResource('dev-community',id,check)).rejects.toThrow('Access denied');
  await approveContributor('dev-admin','dev-community','98101');
  expect((await verificationQueue('dev-community')).some(r=>r.id===id)).toBe(true);
  await verifyResource('dev-community',id,check);
  expect((await publicResources()).some(r=>r.id===id)).toBe(true);
  expect((await verificationQueue('dev-community')).some(r=>r.id===id)).toBe(false);
  await acceptResource('dev-admin',{...input,description:'Changed synthetic description requires another verification.'},id);
  expect((await publicResources()).some(r=>r.id===id)).toBe(false);
  await verifyResource('dev-community',id,check);
  const past=new Date(Date.now()-1000);
  await database().updateTable('listing_state').set({next_review_due:past}).where('service_id','=',id).execute();
  await database().updateTable('work_item').set({due_at:past}).where('service_id','=',id).execute();
  expect((await publicResources()).some(r=>r.id===id)).toBe(false);
  expect((await verificationQueue('dev-community')).some(r=>r.id===id)).toBe(true);
 });
 it('rechecks approval and geography at mutation time',async()=>{
  const id=await acceptResource('dev-admin',{...input,postal_code:'98102'});
  await expect(verifyResource('dev-community',id,check)).rejects.toThrow('Access denied');
  await database().updateTable('membership').set({approved:false}).where('user_id','=','dev-community').execute();
  await expect(verificationQueue('dev-community')).rejects.toThrow('Access denied');
 });
 it('requires profile consent, saves only the authenticated profile and deletes it',async()=>{
  await expect(saveProfile('dev-user',{postal_code:'98101',needs:['food'],consent:false})).rejects.toThrow();
  await saveProfile('dev-user',{postal_code:'98101',needs:['food'],consent:true});
  expect((await profileFor('dev-user'))?.needs).toEqual(['food']);
  expect(await profileFor('dev-admin')).toBeUndefined();
  await deleteProfile('dev-user');
  expect(await profileFor('dev-user')).toBeUndefined();
 });
});
