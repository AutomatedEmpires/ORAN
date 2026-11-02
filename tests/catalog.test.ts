import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { localDatabase } from '../scripts/local-database';
import { migrate } from '../scripts/database';
import { database,closeDatabase } from '../src/modules/platform/index';
import { acceptResource,publicResources,ownedResources,verificationQueue,verifyResource } from '../src/modules/catalog/index';
import { approveContributor } from '../src/modules/community/index';
import { saveProfile,profileFor,deleteProfile } from '../src/modules/profiles/index';
let local:Awaited<ReturnType<typeof localDatabase>>|null=null;
const input={name:'Synthetic food program',description:'Synthetic test record, not a real assistance resource.',organization_name:'Synthetic test organization',category:'food',postal_code:'98101',eligibility_description:'Contact the provider about requirements',application_process:'Contact the provider',url:'https://example.org',source_note:'Synthetic test fixture, permitted for tests only'};
const check={method:'website',evidence:'Synthetic evidence for a synthetic test record',fields_checked:'name, description, eligibility and intake instructions'};
async function verify(user:string,id:string,data:unknown=check) {const state=await database().selectFrom('listing_state').select('revision_id').where('service_id','=',id).executeTakeFirstOrThrow();return verifyResource(user,id,{...(data as typeof check),revision_id:state.revision_id});}
const run=randomUUID().replaceAll('-','');
const user={admin:'test-'+run+'-admin',org:'test-'+run+'-org',community:'test-'+run+'-community',seeker:'test-'+run+'-user',other:'test-'+run+'-other',second:'test-'+run+'-second'};
const fixtureOrg=randomUUID(),deniedRole='test_denied_'+run;
let ready=false,baseUrl:string|undefined,createdDatabase=false,roleCreated=false;
const databaseName='oran_test_'+run;
beforeAll(async()=>{
 if(process.env.DATABASE_URL){if(process.env.ORAN_ENV!=='test'||process.env.ORAN_DATABASE_HOST!==new URL(process.env.DATABASE_URL).hostname)throw new Error('Integration database must explicitly identify as test');}
 else {local=await localDatabase();process.env.DATABASE_URL=local.url;}
 process.env.ORAN_ENV='test';process.env.ORAN_DATABASE_HOST=new URL(process.env.DATABASE_URL!).hostname;
 if(!local){baseUrl=process.env.DATABASE_URL!;await sql`CREATE DATABASE ${sql.id(databaseName)}`.execute(database());createdDatabase=true;await closeDatabase();const isolated=new URL(baseUrl);isolated.pathname='/'+databaseName;process.env.DATABASE_URL=isolated.toString();}
 await migrate(process.env.DATABASE_URL!);await migrate(process.env.DATABASE_URL!);ready=true;
 await database().insertInto('organization').values({id:fixtureOrg,name:input.organization_name}).execute();
 for(const role of ['admin','organization','community','user'] as const){const id=role==='admin'?user.admin:role==='organization'?user.org:role==='community'?user.community:user.seeker;await database().insertInto('membership').values({user_id:id,role,display_name:'Synthetic '+role,organization_id:role==='organization'?fixtureOrg:null,approved:role!=='community',postal_code:role==='community'?'98101':null}).execute();}
});
afterAll(async()=>{
 try {if(ready&&roleCreated)await sql`DROP ROLE IF EXISTS ${sql.id(deniedRole)}`.execute(database());}
 finally {await closeDatabase();if(createdDatabase&&baseUrl){process.env.DATABASE_URL=baseUrl;try{await sql`DROP DATABASE ${sql.id(databaseName)}`.execute(database());}finally{await closeDatabase();}}await local?.close();}
});
describe('real PostgreSQL/PostGIS resource and authorization flow',()=>{
 it('has PostGIS and denies a role without schema grants',async()=>{
  const ext=await sql<{version:string}>`SELECT postgis_version() AS version`.execute(database());
  expect(ext.rows[0].version).toBeTruthy();
  await sql`CREATE ROLE ${sql.id(deniedRole)} NOLOGIN`.execute(database());roleCreated=true;
  await expect(database().transaction().execute(async trx=>{
   await sql`SET LOCAL ROLE ${sql.id(deniedRole)}`.execute(trx);
   await trx.selectFrom('personal_profile').selectAll().execute();
  })).rejects.toThrow();
 });
 it('admin directly creates an unpublished resource with atomic provenance and audit',async()=>{
  const id=await acceptResource(user.admin,input);
  expect((await publicResources()).some(r=>r.id===id)).toBe(false);
  expect(await database().selectFrom('field_assertion').select('actor_id').where('service_id','=',id).executeTakeFirst()).toEqual({actor_id:user.admin});
  expect(await database().selectFrom('audit_event').select('action').where('subject','=',id).execute()).toEqual([{action:'resource.created'}]);
  expect((await ownedResources(user.admin)).some(r=>r.id===id)).toBe(true);
 });
 it('rejects unapplied organization-name changes without recording accepted assertions',async()=>{
  const id=await acceptResource(user.admin,input);
  await expect(acceptResource(user.admin,{...input,organization_name:'An unapplied rename'},id)).rejects.toThrow('Organization name changes');
  expect(await database().selectFrom('field_assertion').select('id').where('service_id','=',id).execute()).toHaveLength(1);
 });
 it('rejects ordinary users, unapproved contributors and cross-organization edits',async()=>{
  await expect(acceptResource(user.seeker,input)).rejects.toThrow('Access denied');
  await expect(acceptResource(user.community,input)).rejects.toThrow('Access denied');
  const id=await acceptResource(user.org,input);
  const org=randomUUID();
  await database().insertInto('organization').values({id:org,name:'Other organization'}).execute();
  await database().insertInto('membership').values({user_id:user.other,role:'organization',display_name:'Other staff',organization_id:org,approved:true}).execute();
  await expect(acceptResource(user.other,input,id)).rejects.toThrow('Access denied');
  await expect(verify(user.org,id,check)).rejects.toThrow('Access denied');
 });
 it('approval assigns scoped work, verification publishes, edits invalidate and reverification is due',async()=>{
  const id=await acceptResource(user.admin,input);
  await expect(verify(user.community,id,check)).rejects.toThrow('Access denied');
  await approveContributor(user.admin,user.community,'98101',['food']);
  expect((await verificationQueue(user.community)).some(r=>r.id===id)).toBe(true);
  await verify(user.community,id,check);
  expect((await publicResources()).some(r=>r.id===id)).toBe(true);
  expect((await verificationQueue(user.community)).some(r=>r.id===id)).toBe(false);
  await acceptResource(user.admin,{...input,description:'Changed synthetic description requires another verification.'},id);
  expect((await publicResources()).some(r=>r.id===id)).toBe(false);
  await verify(user.community,id,check);
  const past=new Date(Date.now()-1000);
  await database().updateTable('listing_state').set({next_review_due:past}).where('service_id','=',id).execute();
  await database().updateTable('work_item').set({due_at:past}).where('service_id','=',id).execute();
  expect((await publicResources()).some(r=>r.id===id)).toBe(false);
  expect((await verificationQueue(user.community)).some(r=>r.id===id)).toBe(true);
 });
 it('enforces category scope, releases old work and rejects stale verification versions',async()=>{
  await approveContributor(user.admin,user.community,'98101',['food']);
  const id=await acceptResource(user.admin,{...input,category:'health'});
  await expect(verify(user.community,id)).rejects.toThrow('Access denied');
  const food=await acceptResource(user.admin,input);
  const old=await database().selectFrom('listing_state').select('revision_id').where('service_id','=',food).executeTakeFirstOrThrow();
  await acceptResource(user.admin,input,food);
  await expect(verifyResource(user.community,food,{...check,revision_id:old.revision_id})).rejects.toThrow('resource changed');
  await approveContributor(user.admin,user.community,'98102',['food']);
  expect((await database().selectFrom('work_item').select('assigned_to').where('service_id','=',food).executeTakeFirstOrThrow()).assigned_to).toBeNull();
  await approveContributor(user.admin,user.community,'98101',['food']);
 });
 it('does not reassign a community-created listing to its original creator after admin edits',async()=>{
  await database().insertInto('membership').values({user_id:user.second,role:'community',display_name:'Second contributor',approved:true,postal_code:'98101',category_scope:['food']}).execute();
  const id=await acceptResource(user.community,input);
  await acceptResource(user.admin,input,id);
  expect((await database().selectFrom('work_item').select('assigned_to').where('service_id','=',id).executeTakeFirstOrThrow()).assigned_to).toBe(user.second);
  await verify(user.second,id);
 });
 it('keeps assignments within current scope when approval and edits race',async()=>{
  const id=await acceptResource(user.admin,input);
  await Promise.all([approveContributor(user.admin,user.community,'98102',['food']),acceptResource(user.admin,{...input,postal_code:'98102'},id)]);
  const item=await database().selectFrom('work_item as w').innerJoin('service_area as a','a.service_id','w.service_id').innerJoin('membership as m','m.user_id','w.assigned_to').select(['m.postal_code','a.extent','m.category_scope']).where('w.service_id','=',id).executeTakeFirstOrThrow();
  expect(item.postal_code).toBe(item.extent);expect(item.category_scope).toContain('food');
  await approveContributor(user.admin,user.community,'98101',['food']);
 });
 it('rechecks approval and geography at mutation time',async()=>{
  const id=await acceptResource(user.admin,{...input,postal_code:'98102'});
  await expect(verify(user.community,id,check)).rejects.toThrow('Access denied');
  await database().updateTable('membership').set({approved:false}).where('user_id','=',user.community).execute();
  await expect(verificationQueue(user.community)).rejects.toThrow('Access denied');
 });
 it('requires profile consent, saves only the authenticated profile and deletes it',async()=>{
  await expect(saveProfile(user.seeker,{postal_code:'98101',needs:['food'],consent:false})).rejects.toThrow();
  await saveProfile(user.seeker,{postal_code:'98101',needs:['food'],consent:true});
  expect((await profileFor(user.seeker))?.needs).toEqual(['food']);
  expect(await profileFor(user.admin)).toBeUndefined();
  await deleteProfile(user.seeker);
  expect(await profileFor(user.seeker)).toBeUndefined();
 });
});
