import { beforeAll,afterAll,describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { sql } from 'kysely';
import { localDatabase } from '../scripts/local-database';
import { migrate } from '../scripts/database';
import { database,closeDatabase } from '../src/modules/platform/index';
import { listCategories,addCategory,acceptResource,publicResources,ownedResources,ownedResource,editableResource,verificationQueue,verifyResource } from '../src/modules/catalog/index';
import { approveContributor } from '../src/modules/community/index';
import { saveProfile,profileFor,deleteProfile } from '../src/modules/profiles/index';
let local:Awaited<ReturnType<typeof localDatabase>>|null=null;
const zip=(...codes:string[])=>({kind:'zip' as const,postal_codes:codes});
const input={name:'Synthetic food program',description:'Synthetic test record, not a real assistance resource.',organization_name:'Synthetic test organization',categories:['food'],service_area:zip('98101'),eligibility_description:'Contact the provider about requirements',application_process:'Contact the provider',url:'https://example.org',source_type:'url',source_url:'https://example.org/listing',source_note:'Synthetic test fixture, permitted for tests only'};
const check={method:'website',evidence:'Synthetic evidence for a synthetic test record',fields_checked:'name, description, eligibility and intake instructions'};
async function verify(user:string,id:string,data:unknown=check) {const state=await database().selectFrom('listing_state').select('revision_id').where('service_id','=',id).executeTakeFirstOrThrow();return verifyResource(user,id,{...(data as typeof check),revision_id:state.revision_id});}
const assertions=(entityId:string)=>database().selectFrom('field_assertion').selectAll().where('entity_id','=',entityId).orderBy('created_at').orderBy('field_path').execute();
const accepted=async(entityId:string,path:string)=>(await assertions(entityId)).find(r=>r.field_path===path&&r.status==='accepted')?.value;
const run=randomUUID().replaceAll('-','');
const user={admin:'test-'+run+'-admin',org:'test-'+run+'-org',community:'test-'+run+'-community',seeker:'test-'+run+'-user',other:'test-'+run+'-other',second:'test-'+run+'-second',dual:'test-'+run+'-dual',admin2:'test-'+run+'-admin2'};
const fixtureOrg=randomUUID(),deniedRole='test_denied_'+run;
const original={DATABASE_URL:process.env.DATABASE_URL,ORAN_ENV:process.env.ORAN_ENV,ORAN_DATABASE_HOST:process.env.ORAN_DATABASE_HOST};
function restoreEnvironment(){for(const [key,value] of Object.entries(original)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}
let ready=false,baseUrl:string|undefined,createdDatabase=false,roleCreated=false;
const databaseName='oran_test_'+run;
beforeAll(async()=>{
 if(process.env.DATABASE_URL){if(process.env.ORAN_ENV!=='test'||process.env.ORAN_DATABASE_HOST!==new URL(process.env.DATABASE_URL).hostname)throw new Error('Integration database must explicitly identify as test');}
 else {local=await localDatabase();process.env.DATABASE_URL=local.url;}
 process.env.ORAN_ENV='test';process.env.ORAN_DATABASE_HOST=new URL(process.env.DATABASE_URL!).hostname;
 if(!local){baseUrl=process.env.DATABASE_URL!;await sql`CREATE DATABASE ${sql.id(databaseName)}`.execute(database());createdDatabase=true;await closeDatabase();const isolated=new URL(baseUrl);isolated.pathname='/'+databaseName;process.env.DATABASE_URL=isolated.toString();}
 await migrate(process.env.DATABASE_URL!);await migrate(process.env.DATABASE_URL!);ready=true;
 await database().insertInto('organization').values({id:fixtureOrg,name:input.organization_name}).execute();
 for(const role of ['admin','organization','community','user'] as const){const id=role==='admin'?user.admin:role==='organization'?user.org:role==='community'?user.community:user.seeker;await database().insertInto('account').values({user_id:id,display_name:'Synthetic '+role}).execute();if(role==='user')continue;await database().insertInto('membership').values({user_id:id,role,organization_id:role==='organization'?fixtureOrg:null,approved:role!=='community',postal_code:role==='community'?'98101':null}).execute();}
});
afterAll(async()=>{
 try {if(ready&&roleCreated)await sql`DROP ROLE IF EXISTS ${sql.id(deniedRole)}`.execute(database());}
 finally {await closeDatabase();if(createdDatabase&&baseUrl){process.env.DATABASE_URL=baseUrl;try{await sql`DROP DATABASE ${sql.id(databaseName)}`.execute(database());}finally{await closeDatabase();}}await local?.close();restoreEnvironment();}
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
  expect(await database().selectFrom('revision').select('actor_id').where('service_id','=',id).executeTakeFirst()).toEqual({actor_id:user.admin});
  expect(await database().selectFrom('audit_event').select('action').where('subject','=',id).execute()).toEqual([{action:'resource.created'}]);
  expect((await ownedResources(user.admin)).some(r=>r.id===id)).toBe(true);
 });
 it('rejects unapplied organization-name changes without recording accepted assertions',async()=>{
  const id=await acceptResource(user.admin,input),before=(await assertions(id)).length;
  await expect(acceptResource(user.admin,{...input,organization_name:'An unapplied rename'},id)).rejects.toThrow('Organization name changes');
  expect(await database().selectFrom('revision').select('id').where('service_id','=',id).execute()).toHaveLength(1);
  expect((await assertions(id)).length).toBe(before);
 });
 it('rejects ordinary users, unapproved contributors and cross-organization edits',async()=>{
  await expect(acceptResource(user.seeker,input)).rejects.toThrow('Access denied');
  await expect(acceptResource(user.community,input)).rejects.toThrow('Access denied');
  const id=await acceptResource(user.org,input);
  const org=randomUUID();
  await database().insertInto('organization').values({id:org,name:'Other organization'}).execute();
  await database().insertInto('account').values({user_id:user.other,display_name:'Other staff'}).execute();
  await database().insertInto('membership').values({user_id:user.other,role:'organization',organization_id:org,approved:true}).execute();
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
  const id=await acceptResource(user.admin,{...input,categories:['health']});
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
  await database().insertInto('account').values({user_id:user.second,display_name:'Second contributor'}).execute();
  await database().insertInto('membership').values({user_id:user.second,role:'community',approved:true,postal_code:'98101',category_scope:['food']}).execute();
  const id=await acceptResource(user.community,input);
  await acceptResource(user.admin,input,id);
  expect((await database().selectFrom('work_item').select('assigned_to').where('service_id','=',id).executeTakeFirstOrThrow()).assigned_to).toBe(user.second);
  await verify(user.second,id);
 });
 it('keeps assignments within current scope when approval and edits race',async()=>{
  const id=await acceptResource(user.admin,input);
  await Promise.all([approveContributor(user.admin,user.community,'98102',['food']),acceptResource(user.admin,{...input,service_area:zip('98102')},id)]);
  const item=await database().selectFrom('work_item as w').innerJoin('service_area as a','a.service_id','w.service_id').innerJoin('membership as m','m.user_id','w.assigned_to').select(['m.postal_code','a.extent','m.category_scope']).where('m.role','=','community').where('w.service_id','=',id).executeTakeFirstOrThrow();
  expect(item.postal_code).toBe(item.extent);expect(item.category_scope).toContain('food');
  await approveContributor(user.admin,user.community,'98101',['food']);
 });
 it('rechecks approval and geography at mutation time',async()=>{
  const id=await acceptResource(user.admin,{...input,service_area:zip('98102')});
  await expect(verify(user.community,id,check)).rejects.toThrow('Access denied');
  await database().updateTable('membership').set({approved:false}).where('user_id','=',user.community).execute();
  await expect(verificationQueue(user.community)).rejects.toThrow('Access denied');
 });
 it('filters matching and authorized editing before the 100-row result cap',async()=>{
  for(let i=0;i<100;i++){const id=await acceptResource(user.org,{...input,name:'A synthetic filler '+i,service_area:zip('98102'),categories:['work']});await verify(user.admin,id);}
  const id=await acceptResource(user.org,{...input,name:'ZZZ matching target'});await verify(user.admin,id);
  expect((await publicResources()).some(r=>r.id===id)).toBe(false);
  expect((await publicResources({postal_code:'98101',needs:['food']})).some(r=>r.id===id)).toBe(true);
  expect((await ownedResources(user.org)).some(r=>r.id===id)).toBe(false);
  expect((await ownedResource(user.org,id))?.id).toBe(id);
  expect(await ownedResource(user.org,'invalid')).toBeUndefined();
  await expect(ownedResource(user.seeker,id)).rejects.toThrow('Access denied');
 },60000);
 it('requires profile consent, saves only the authenticated profile and deletes it',async()=>{
  await expect(saveProfile(user.seeker,{postal_code:'98101',needs:['food'],consent:false})).rejects.toThrow();
  await saveProfile(user.seeker,{postal_code:'98101',needs:['food'],consent:true});
  expect((await profileFor(user.seeker))?.needs).toEqual(['food']);
  expect(await profileFor(user.admin)).toBeUndefined();
  await deleteProfile(user.seeker);
  expect(await profileFor(user.seeker)).toBeUndefined();
 });

 it('publishes a multi-category resource under each of its needs',async()=>{
  const id=await acceptResource(user.admin,{...input,categories:['food','childcare_family']});await verify(user.admin,id);
  expect((await publicResources({postal_code:'98101',needs:['childcare_family']})).find(r=>r.id===id)?.categories).toEqual(['food','childcare_family']);
  expect((await publicResources({postal_code:'98101',needs:['legal']})).some(r=>r.id===id)).toBe(false);
 });
 it('rejects unknown category codes',async()=>{
  await expect(acceptResource(user.admin,{...input,categories:['not_a_category']})).rejects.toThrow('Unknown category');
 });
 it('rejects profile needs that are not categories',async()=>{
  await expect(saveProfile(user.seeker,{postal_code:'98101',needs:['other'],consent:true})).rejects.toThrow('Unknown category');
 });
 it('community contributors file resources only inside their category grants',async()=>{
  await approveContributor(user.admin,user.community,'98101',['food']);
  await expect(acceptResource(user.community,{...input,categories:['food','health']})).rejects.toThrow('Access denied');
 });
 it('lists categories in display order for each language',async()=>{
  const es=await listCategories('es');
  expect(es).toHaveLength(10);expect(es[0]).toEqual({code:'food',label:'Alimentos'});expect(es[1]).toEqual({code:'housing_shelter',label:'Vivienda y refugio'});
 });

 it('replaces a resource\'s categories on edit and drops the removed ones',async()=>{
  const id=await acceptResource(user.admin,{...input,categories:['food','health']});
  await acceptResource(user.admin,{...input,categories:['food']},id);
  expect((await ownedResource(user.admin,id))?.categories).toEqual(['food']);
  await acceptResource(user.admin,{...input,categories:['health','legal']},id);
  expect((await ownedResource(user.admin,id))?.categories).toEqual(['health','legal']);
 });
 it('rejects unknown codes in a contributor grant',async()=>{
  await expect(approveContributor(user.admin,user.community,'98101',['food','not_a_category'])).rejects.toThrow('Unknown category');
 });
 it('routes a multi-category listing to a verifier whose scope overlaps one code',async()=>{
  await approveContributor(user.admin,user.community,'98101',['health']);
  const id=await acceptResource(user.admin,{...input,categories:['food','health']});
  expect((await database().selectFrom('work_item').select('assigned_to').where('service_id','=',id).executeTakeFirstOrThrow()).assigned_to).toBe(user.community);
  expect((await verificationQueue(user.community)).some(r=>r.id===id)).toBe(true);
  await verify(user.community,id);
  await approveContributor(user.admin,user.community,'98101',['food']);
 });
 it('stores phones and weekly hours with their time zone',async()=>{
  const id=await acceptResource(user.admin,{...input,phones:[{number:'(206) 555-0100',extension:12},{number:'988',extension:null}],hours:{kind:'weekly',time_zone:'America/Los_Angeles',weekly:[{day:'MO',opens_at:'09:00',closes_at:'17:00'},{day:'FR',opens_at:'19:00',closes_at:'07:00'}],exceptions:[{from:'2026-12-25',to:'2026-12-25',opens_at:null,closes_at:null,note:'Holiday'}]}});
  expect((await database().selectFrom('phone').select(['number','extension']).where('service_id','=',id).orderBy('number').execute()).map(r=>[r.number,r.extension])).toEqual([['+12065550100',12],['988',null]]);
  expect(await accepted(id,'phones')).toEqual([{number:'+12065550100',extension:12},{number:'988',extension:null}]);
  // Times and dates are read as text, so no time zone (the server's or this machine's) can shift them.
  const schedule=await sql<{byday:string|null;opens_at:string|null;closes_at:string|null;valid_from:string|null;valid_to:string|null}>`SELECT byday, opens_at::text, closes_at::text, valid_from::text, valid_to::text FROM oran.schedule WHERE service_id=${id} ORDER BY valid_from NULLS FIRST, byday`.execute(database());
  expect(schedule.rows.map(r=>[r.byday,r.opens_at,r.closes_at,r.valid_from,r.valid_to])).toEqual([['FR','19:00:00','07:00:00',null,null],['MO','09:00:00','17:00:00',null,null],[null,null,null,'2026-12-25','2026-12-25']]);
  expect((await sql<{description:string}>`SELECT description FROM oran.schedule WHERE service_id=${id} AND valid_from IS NOT NULL`.execute(database())).rows).toEqual([{description:'Holiday'}]);
  expect(await database().selectFrom('service_hours').select(['kind','time_zone']).where('service_id','=',id).executeTakeFirst()).toEqual({kind:'weekly',time_zone:'America/Los_Angeles'});
 });
 it('stores 24/7 and by-appointment hours without schedule rows, and unknown hours as no row',async()=>{
  const hours=(id:string)=>database().selectFrom('service_hours').select(['kind','time_zone']).where('service_id','=',id).executeTakeFirst();
  const schedules=async(id:string)=>(await database().selectFrom('schedule').select('id').where('service_id','=',id).execute()).length;
  const id=await acceptResource(user.admin,{...input,hours:{kind:'always_open'}});
  expect(await hours(id)).toEqual({kind:'always_open',time_zone:null});
  expect(await schedules(id)).toBe(0);
  await acceptResource(user.admin,{...input,hours:{kind:'weekly',time_zone:'America/Chicago',weekly:[{day:'TU',opens_at:'08:00',closes_at:'12:00'}],exceptions:[]}},id);
  expect(await schedules(id)).toBe(1);
  await acceptResource(user.admin,{...input,hours:{kind:'by_appointment'}},id);
  expect(await hours(id)).toEqual({kind:'by_appointment',time_zone:null});
  expect(await schedules(id)).toBe(0);
  await acceptResource(user.admin,{...input,hours:null},id);
  expect(await hours(id)).toBeUndefined();
  expect(await schedules(id)).toBe(0);
  const rows=(await assertions(id)).filter(r=>r.field_path==='hours');
  expect(rows.map(r=>r.status)).toEqual(['superseded','superseded','superseded','accepted']);
  expect(await accepted(id,'hours')).toBeNull();
 });
 it('keeps omitted parts and the row ids of unchanged parts on edit',async()=>{
  const hours={kind:'weekly' as const,time_zone:'America/New_York',weekly:[{day:'WE',opens_at:'22:00',closes_at:'06:00'}],exceptions:[{from:'2026-12-24',to:'2026-12-26',opens_at:'10:00',closes_at:'14:00',note:''}]};
  const place={access:'physical' as const,address:{address_1:'5 Kept Street',address_2:null,city:'Seattle',state_province:'WA',postal_code:'98101'}};
  const id=await acceptResource(user.admin,{...input,service_area:zip('98101','98102'),phones:[{number:'206.555.0100',extension:7}],hours,locations:[place]});
  const rowIds=async()=>({
   phones:(await database().selectFrom('phone').select('id').where('service_id','=',id).execute()).map(r=>r.id),
   schedules:(await database().selectFrom('schedule').select('id').where('service_id','=',id).orderBy('id').execute()).map(r=>r.id),
   areas:(await database().selectFrom('service_area').select('id').where('service_id','=',id).orderBy('id').execute()).map(r=>r.id),
   locations:await database().selectFrom('service_at_location as sl').innerJoin('address as ad','ad.location_id','sl.location_id').select(['sl.id','sl.location_id','ad.id as address_id']).where('sl.service_id','=',id).execute(),
  });
  const asserted=async()=>{
   const state=await database().selectFrom('listing_state').select('revision_id').where('service_id','=',id).executeTakeFirstOrThrow();
   return (await database().selectFrom('field_assertion').select('field_path').where('revision_id','=',state.revision_id).execute()).map(r=>r.field_path).sort();
  };
  const first=await rowIds();
  expect(first.phones).toHaveLength(1);expect(first.schedules).toHaveLength(2);expect(first.areas).toHaveLength(2);expect(first.locations).toHaveLength(1);
  // An edit that leaves the parts out asserts nothing about them and keeps every row.
  const edited={...input,service_area:zip('98102','98101'),description:'An edited synthetic description that leaves the parts out.'};
  await acceptResource(user.admin,edited,id);
  expect(await rowIds()).toEqual(first);
  expect(await asserted()).toEqual(['description']);
  // The same parts again, with the phone typed another way, change no row and assert nothing.
  const location=((await accepted(id,'locations')) as string[])[0];
  await acceptResource(user.admin,{...edited,phones:[{number:'+1 206 555 0100',extension:7}],hours,locations:[{...place,id:location}]},id);
  expect(await rowIds()).toEqual(first);
  expect(await asserted()).toEqual([]);
  // An empty list removes the phones and asserts "none".
  await acceptResource(user.admin,{...edited,phones:[]},id);
  expect((await rowIds()).phones).toEqual([]);
  expect(await accepted(id,'phones')).toBeNull();
 });
 it('makes a Safety listing\'s physical location confidential unless the input says otherwise',async()=>{
  const hidden={access:'physical' as const,address:{address_1:'1 Hidden Way',address_2:null,city:'Seattle',state_province:'WA',postal_code:'98109'}};
  const confidential=async(id:string)=>(await database().selectFrom('service_at_location as sl').innerJoin('location_access as la','la.location_id','sl.location_id').select('la.confidential').where('sl.service_id','=',id).execute()).map(r=>r.confidential);
  const safety=await acceptResource(user.admin,{...input,categories:['safety'],locations:[hidden]});
  expect(await confidential(safety)).toEqual([true]);
  expect(await accepted(((await accepted(safety,'locations')) as string[])[0],'confidential')).toBe(true);
  expect(await confidential(await acceptResource(user.admin,{...input,categories:['safety'],locations:[{...hidden,confidential:false}]}))).toEqual([false]);
  // Without Safety, a physical location is confidential only when the input says so.
  expect(await confidential(await acceptResource(user.admin,{...input,locations:[hidden]}))).toEqual([false]);
 });
 it('links a service to several locations of its organization',async()=>{
  const id=await acceptResource(user.admin,{...input,locations:[{access:'physical',address:{address_1:'200 Main Street',address_2:'Suite 3',city:'Seattle',state_province:'WA',postal_code:'98101'},coordinates:{latitude:47.61,longitude:-122.33}},{access:'phone'}]});
  const organization=(await database().selectFrom('service').select('organization_id').where('id','=',id).executeTakeFirstOrThrow()).organization_id;
  const linked=await database().selectFrom('service_at_location as sl').innerJoin('location as l','l.id','sl.location_id').select(['l.organization_id','l.location_type']).where('sl.service_id','=',id).execute();
  expect(linked).toHaveLength(2);
  for(const l of linked) expect(l.organization_id).toBe(organization);
  expect(linked.map(l=>l.location_type).sort()).toEqual(['physical','virtual']);
  const order=(await accepted(id,'locations')) as string[];
  const modes=await database().selectFrom('location_access').select(['location_id','mode']).where('location_id','in',order).execute();
  expect(order.map(l=>modes.find(m=>m.location_id===l)?.mode)).toEqual(['physical','phone']);
  expect(await database().selectFrom('address').select(['location_id','address_2']).where('location_id','in',order).execute()).toEqual([{location_id:order[0],address_2:'Suite 3'}]);
  // S2-13: every linked location has exactly one access row, and no location anywhere is without one.
  const access=await sql<{n:number}>`SELECT count(la.location_id)::int AS n FROM oran.service_at_location sl LEFT JOIN oran.location_access la ON la.location_id=sl.location_id WHERE sl.service_id=${id} GROUP BY sl.location_id`.execute(database());
  expect(access.rows.map(r=>r.n)).toEqual([1,1]);
  expect((await sql<{n:number}>`SELECT count(*)::int AS n FROM oran.location l WHERE NOT EXISTS (SELECT 1 FROM oran.location_access la WHERE la.location_id=l.id)`.execute(database())).rows).toEqual([{n:0}]);
  // Dropping a location unlinks it; an empty list unlinks every one and asserts "none".
  await acceptResource(user.admin,{...input,locations:[{id:order[1],access:'phone'}]},id);
  expect(await database().selectFrom('service_at_location').select('location_id').where('service_id','=',id).execute()).toEqual([{location_id:order[1]}]);
  await acceptResource(user.admin,{...input,locations:[]},id);
  expect(await database().selectFrom('service_at_location').select('location_id').where('service_id','=',id).execute()).toEqual([]);
  expect(await accepted(id,'locations')).toBeNull();
 });
 it('rejects a location id that is not already part of the listing',async()=>{
  const a=await acceptResource(user.admin,{...input,locations:[{access:'phone'}]});
  const aLocation=((await accepted(a,'locations')) as string[])[0];
  const b=await acceptResource(user.admin,input);
  await expect(acceptResource(user.admin,{...input,locations:[{id:aLocation,access:'phone'}]},b)).rejects.toThrow('Access denied');
  await expect(acceptResource(user.admin,{...input,locations:[{id:randomUUID(),access:'phone'}]})).rejects.toThrow('Access denied');
  await expect(acceptResource(user.admin,{...input,locations:[{id:aLocation,access:'phone'},{id:aLocation,access:'remote'}]},a)).rejects.toThrow('List each location once');
  // Nothing was written: B keeps its one revision, and A's location is linked only to A.
  expect(await database().selectFrom('revision').select('id').where('service_id','=',b).execute()).toHaveLength(1);
  expect(await database().selectFrom('service_at_location').select('service_id').where('location_id','=',aLocation).execute()).toEqual([{service_id:a}]);
  expect(await accepted(aLocation,'access')).toBe('phone');
  // A listed location that no longer belongs to the listing's organization is not edited through it either.
  const owner=(await database().selectFrom('location').select('organization_id').where('id','=',aLocation).executeTakeFirstOrThrow()).organization_id;
  await database().updateTable('location').set({organization_id:fixtureOrg}).where('id','=',aLocation).execute();
  try {await expect(acceptResource(user.admin,{...input,locations:[{id:aLocation,access:'remote'}]},a)).rejects.toThrow('Access denied');}
  finally {await database().updateTable('location').set({organization_id:owner}).where('id','=',aLocation).execute();}
  expect(await accepted(aLocation,'access')).toBe('phone');
 });
 it('assigns ZIP-area work to verifiers in any listed ZIP and leaves nationwide work to admins',async()=>{
  const assignee=async(id:string)=>(await database().selectFrom('work_item').select('assigned_to').where('service_id','=',id).executeTakeFirstOrThrow()).assigned_to;
  await approveContributor(user.admin,user.community,'98101',['food']);
  const id=await acceptResource(user.admin,{...input,service_area:zip('98102','98101')});
  expect(await assignee(id)).toBe(user.community);
  expect((await verificationQueue(user.community)).filter(r=>r.id===id)).toHaveLength(1);
  await verify(user.community,id);
  const nationwide=await acceptResource(user.admin,{...input,service_area:{kind:'nationwide'}});
  expect(await assignee(nationwide)).toBeNull();
  await expect(verify(user.community,nationwide)).rejects.toThrow('Access denied');
  await expect(verify(user.admin,nationwide)).resolves.toBeUndefined();
 });
 it('verifiers file new listings only for their own ZIP',async()=>{
  await expect(acceptResource(user.community,{...input,service_area:zip('98101','98102')})).rejects.toThrow('Access denied');
  await expect(acceptResource(user.community,{...input,service_area:{kind:'state',state:'WA'}})).rejects.toThrow('Access denied');
  await expect(acceptResource(user.community,{...input,service_area:zip('98101')})).resolves.toBeTruthy();
 });
 // S2-16: leaving the privacy flag out of an edit never makes a private address public.
 const privateLocation=async(id:string)=>{
  const location=((await accepted(id,'locations')) as string[])[0];
  const access=await database().selectFrom('location_access').select(['mode','confidential']).where('location_id','=',location).executeTakeFirstOrThrow();
  const flags=(await assertions(location)).filter(r=>r.field_path==='confidential').map(r=>[r.status,r.value]);
  const address=await database().selectFrom('address').select('id').where('location_id','=',location).execute();
  return {location,...access,flags,addresses:address.length};
 };
 it('an edit that omits the privacy flag keeps a confidential address private',async()=>{
  const place={access:'physical' as const,address:{address_1:'12 Private Row',address_2:null,city:'Seattle',state_province:'WA',postal_code:'98104'}};
  const id=await acceptResource(user.admin,{...input,locations:[{...place,confidential:true}]});
  const {location}=await privateLocation(id);
  // The edit renames the location, so the location is written again, with the flag left out.
  await acceptResource(user.admin,{...input,locations:[{...place,id:location,name:'Front office'}]},id);
  expect(await privateLocation(id)).toMatchObject({mode:'physical',confidential:true,flags:[['accepted',true]],addresses:1});
  expect(await accepted(location,'name')).toBe('Front office');
 });
 it('an edit that drops Safety keeps a confidential address private',async()=>{
  const place={access:'physical' as const,address:{address_1:'34 Private Row',address_2:null,city:'Seattle',state_province:'WA',postal_code:'98104'}};
  const id=await acceptResource(user.admin,{...input,categories:['safety'],locations:[place]});
  const {location,confidential}=await privateLocation(id);
  expect(confidential).toBe(true);
  await acceptResource(user.admin,{...input,categories:['food'],locations:[{...place,id:location}]},id);
  expect(await privateLocation(id)).toMatchObject({mode:'physical',confidential:true,flags:[['accepted',true]],addresses:1});
  expect(await accepted(id,'categories')).toEqual(['food']);
 });
 it('turning a private physical location into a phone line clears the flag',async()=>{
  const place={access:'physical' as const,address:{address_1:'56 Private Row',address_2:null,city:'Seattle',state_province:'WA',postal_code:'98104'}};
  const id=await acceptResource(user.admin,{...input,categories:['safety'],locations:[place]});
  const {location}=await privateLocation(id);
  await acceptResource(user.admin,{...input,categories:['safety'],locations:[{id:location,access:'phone'}]},id);
  expect(await privateLocation(id)).toMatchObject({mode:'phone',confidential:false,flags:[['superseded',true],['accepted',false]],addresses:0});
  expect((await database().selectFrom('location').select('location_type').where('id','=',location).executeTakeFirstOrThrow()).location_type).toBe('virtual');
  expect(await accepted(location,'address')).toBeNull();
 });
 // The listings below are named to sort ahead of the 100 earlier "A synthetic filler" listings, so the unfiltered public read (capped at 100 rows) includes them.
 it('never returns a confidential address or coordinates from public, card or queue reads',async()=>{
  const secret={address_1:'77 Sealed Lane',address_2:'Unit 4B',city:'Seattle',state_province:'WA' as const,postal_code:'98199'};
  const id=await acceptResource(user.admin,{...input,name:'A confidential safety listing',categories:['safety'],locations:[{access:'physical',address:secret,coordinates:{latitude:47.6512,longitude:-122.4011}}]});
  const queue=await verificationQueue(user.admin);
  expect(queue.some(r=>r.id===id)).toBe(true);
  const queued=JSON.stringify(queue);
  await verify(user.admin,id);
  const text=queued+JSON.stringify(await publicResources())+JSON.stringify(await publicResources({postal_code:'98101',needs:['safety']}))+JSON.stringify(await ownedResources(user.admin,id));
  for(const leak of ['77 Sealed Lane','Unit 4B','98199','47.6512','-122.4011']) expect(text).not.toContain(leak);
  const hidden=[{id:expect.any(String),access:'physical',confidential:true,name:null,address:null,coordinates:null}];
  expect((await publicResources()).find(r=>r.id===id)?.locations).toEqual(hidden);
  expect((await publicResources({postal_code:'98101',needs:['safety']})).find(r=>r.id===id)?.locations).toEqual(hidden);
  expect((await ownedResources(user.admin,id))[0]?.locations).toEqual(hidden);
  expect((await editableResource(user.admin,id))?.locations[0]).toMatchObject({address:secret,coordinates:{latitude:47.6512,longitude:-122.4011}});
 });
 it('returns a confidential address only to the listing\'s editors',async()=>{
  const place={access:'physical' as const,confidential:true,address:{address_1:'88 Staff Only Road',address_2:null,city:'Seattle',state_province:'WA',postal_code:'98107'}};
  const id=await acceptResource(user.org,{...input,locations:[place]});
  expect(await editableResource(user.org,id)).toMatchObject({id,organization_id:fixtureOrg,organization_name:input.organization_name,name:input.name,categories:['food'],service_area:zip('98101'),phones:[],hours:null});
  expect((await editableResource(user.org,id))?.locations).toEqual([{id:expect.any(String),access:'physical',confidential:true,name:null,address:place.address,coordinates:null}]);
  // The same staff member's card read is a public read.
  expect(JSON.stringify(await ownedResources(user.org,id))).not.toContain('88 Staff Only Road');
  expect(await editableResource(user.other,id)).toBeUndefined();
  expect(await editableResource(user.org,'invalid')).toBeUndefined();
  await expect(editableResource(user.seeker,id)).rejects.toThrow('Access denied');
 });
 it('covers every ZIP for a nationwide listing and only the listed ZIPs otherwise',async()=>{
  const nationwide=await acceptResource(user.admin,{...input,name:'A nationwide listing',service_area:{kind:'nationwide'}});
  const multi=await acceptResource(user.admin,{...input,name:'A multi zip listing',service_area:zip('98101','98102')});
  // Every read lists a multi-ZIP listing once.
  expect((await verificationQueue(user.admin)).filter(r=>r.id===multi)).toHaveLength(1);
  await verify(user.admin,nationwide);await verify(user.admin,multi);
  expect((await publicResources({postal_code:'10001',needs:['food']})).some(r=>r.id===nationwide)).toBe(true);
  expect((await publicResources({postal_code:'98102',needs:['food']})).some(r=>r.id===multi)).toBe(true);
  expect((await publicResources({postal_code:'10001',needs:['food']})).some(r=>r.id===multi)).toBe(false);
  expect((await publicResources()).filter(r=>r.id===multi)).toHaveLength(1);
  expect((await ownedResources(user.admin,multi)).filter(r=>r.id===multi)).toHaveLength(1);
  expect((await publicResources()).find(r=>r.id===multi)?.service_area).toEqual(zip('98101','98102'));
 });
 it('returns listing parts in the order they were entered',async()=>{
  const id=await acceptResource(user.admin,{...input,phones:[{number:'988',extension:null},{number:'(206) 555-0100',extension:null}],locations:[{access:'phone'},{access:'remote'}]});
  const [owned]=await ownedResources(user.admin,id);
  expect(owned.phones.map(p=>p.number)).toEqual(['988','+12065550100']);
  expect(owned.locations.map(l=>l.access)).toEqual(['phone','remote']);
  expect((await editableResource(user.admin,id))?.locations.map(l=>l.access)).toEqual(['phone','remote']);
 });
 // S2-17 and S2-13: public reads fail closed, so a location with no access row reads as confidential.
 it('treats a location without an access row as confidential',async()=>{
  const place={access:'physical' as const,confidential:false,address:{address_1:'91 Unguarded Court',address_2:'Rear Gate 7',city:'Tacoma',state_province:'WA',postal_code:'98422'},coordinates:{latitude:47.2529,longitude:-122.4443}};
  const id=await acceptResource(user.admin,{...input,name:'A missing access row listing',locations:[place]});
  const location=((await accepted(id,'locations')) as string[])[0];
  // With its access row the address is public, so the checks below are not vacuous.
  expect((await ownedResources(user.admin,id))[0]?.locations[0]).toMatchObject({confidential:false,address:place.address,coordinates:place.coordinates});
  const row=await database().selectFrom('location_access').selectAll().where('location_id','=',location).executeTakeFirstOrThrow();
  // Test-only damage: no application code deletes an access row.
  await sql`DELETE FROM oran.location_access WHERE location_id=${location}`.execute(database());
  try {
   const hidden=[{id:location,access:'physical',confidential:true,name:null,address:null,coordinates:null}];
   const queued=(await verificationQueue(user.admin)).filter(r=>r.id===id);
   expect(queued.map(r=>r.locations)).toEqual([hidden]);
   await verify(user.admin,id);
   const published=(await publicResources()).filter(r=>r.id===id),matched=(await publicResources({postal_code:'98101',needs:['food']})).filter(r=>r.id===id),owned=await ownedResources(user.admin,id);
   expect(published.map(r=>r.locations)).toEqual([hidden]);
   expect(matched.map(r=>r.locations)).toEqual([hidden]);
   expect(owned.map(r=>r.locations)).toEqual([hidden]);
   const text=JSON.stringify([queued,published,matched,owned]);
   for(const leak of ['91 Unguarded Court','Rear Gate 7','Tacoma','98422','47.2529','-122.4443']) expect(text).not.toContain(leak);
  } finally {await database().insertInto('location_access').values(row).execute();}
 });
});

describe('adding categories',()=>{
 const immigration={code:'immigration',label_en:'Immigration',label_es:'Inmigración'};
 it('admins add a category that becomes selectable in both languages',async()=>{
  await addCategory(user.admin,immigration);
  const es=await listCategories('es');
  expect(es[es.length-1]).toEqual({code:'immigration',label:'Inmigración'});
  await expect(acceptResource(user.admin,{...input,categories:['immigration']})).resolves.toBeTruthy();
  expect((await database().selectFrom('audit_event').select('id').where('action','=','category.added').where('subject','=','immigration').execute()).length).toBe(1);
 });
 it('rejects duplicate and malformed category codes',async()=>{
  const before=(await listCategories('en')).length;
  await expect(addCategory(user.admin,immigration)).rejects.toThrow('Category already exists');
  await expect(addCategory(user.admin,{...immigration,code:'Bad Code'})).rejects.toThrow();
  await expect(addCategory(user.admin,{code:'tiny_label',label_en:'X',label_es:'Y'})).rejects.toThrow();
  expect((await listCategories('en')).length).toBe(before);
 });
 it('only admins add categories',async()=>{
  await expect(addCategory(user.org,{...immigration,code:'org_attempt'})).rejects.toThrow('Access denied');
 });
});

describe('accounts with several memberships',()=>{
 const assignee=async(id:string)=>(await database().selectFrom('work_item').select('assigned_to').where('service_id','=',id).executeTakeFirstOrThrow()).assigned_to;
 it('one account can hold organization and community memberships at once',async()=>{
  await database().insertInto('account').values({user_id:user.dual,display_name:'Synthetic dual member'}).execute();
  await database().insertInto('membership').values([{user_id:user.dual,role:'organization',organization_id:fixtureOrg,approved:true},{user_id:user.dual,role:'community',approved:true,postal_code:'98101',category_scope:['food']}]).execute();
  const own=await acceptResource(user.dual,{...input,organization_id:fixtureOrg});
  // The id filter keeps this check clear of the 100 earlier fixture-organization fillers.
  expect((await ownedResources(user.dual,own)).some(r=>r.id===own)).toBe(true);
  expect((await database().selectFrom('revision').select('origin').where('service_id','=',own).executeTakeFirstOrThrow()).origin).toBe('organization');
  expect((await database().selectFrom('audit_event').select('detail').where('subject','=',own).executeTakeFirstOrThrow()).detail).toEqual({asserted_by:'organization'});
  // Move the earlier-sorting verifier out of 98101 so the dual member is the first candidate.
  await approveContributor(user.admin,user.community,'98102',['food']);
  const id=await acceptResource(user.admin,input);
  expect(await assignee(id)).toBe(user.dual);
  expect((await verificationQueue(user.dual)).some(r=>r.id===id)).toBe(true);
  await verify(user.dual,id);
  expect((await database().selectFrom('audit_event').select('detail').where('subject','=',id).where('action','=','resource.verified').executeTakeFirstOrThrow()).detail).toMatchObject({capacity:'community'});
  await approveContributor(user.admin,user.community,'98101',['food']);
 });
 it('staff never verify their own organization\'s listings',async()=>{
  await approveContributor(user.admin,user.community,'98102',['food']);
  const id=await acceptResource(user.org,input);
  expect(await assignee(id)).not.toBe(user.dual);
  expect((await verificationQueue(user.dual)).some(r=>r.id===id)).toBe(false);
  await expect(verify(user.dual,id)).rejects.toThrow('Access denied');
  // An assignment made before the verifier joined the organization's staff stays blocked.
  await database().updateTable('work_item').set({assigned_to:user.dual}).where('service_id','=',id).execute();
  expect((await verificationQueue(user.dual)).some(r=>r.id===id)).toBe(false);
  await expect(verify(user.dual,id)).rejects.toThrow('Access denied');
  await approveContributor(user.admin,user.dual,'98101',['food']);
  expect(await assignee(id)).not.toBe(user.dual);
  await approveContributor(user.admin,user.community,'98101',['food']);
 });
 it('staff with several organizations must choose one',async()=>{
  const second=randomUUID(),outside=randomUUID();
  await database().insertInto('organization').values([{id:second,name:'Second synthetic organization'},{id:outside,name:'Outside synthetic organization'}]).execute();
  await database().insertInto('membership').values({user_id:user.dual,role:'organization',organization_id:second,approved:true}).execute();
  await expect(acceptResource(user.dual,input)).rejects.toThrow('Choose an organization');
  await expect(acceptResource(user.dual,{...input,organization_name:'Outside synthetic organization',organization_id:outside})).rejects.toThrow('Access denied');
  const id=await acceptResource(user.dual,{...input,organization_name:'Second synthetic organization',organization_id:second});
  expect((await database().selectFrom('service').select('organization_id').where('id','=',id).executeTakeFirstOrThrow()).organization_id).toBe(second);
 });
 it('verifiers who are also staff still file a new provider inside their scope',async()=>{
  const id=await acceptResource(user.dual,{...input,organization_name:'Verifier-found provider'});
  expect((await database().selectFrom('revision').select('origin').where('service_id','=',id).executeTakeFirstOrThrow()).origin).toBe('verifier');
  await expect(acceptResource(user.dual,{...input,organization_name:'Verifier-found provider',service_area:zip('98102')})).rejects.toThrow('Choose an organization');
  await expect(acceptResource(user.org,{...input,organization_name:'Another new provider'})).rejects.toThrow('Organization name changes');
 });
 it('admins who are also staff can still create a listing for a new organization',async()=>{
  const membership=(await database().insertInto('membership').values({user_id:user.admin,role:'organization',organization_id:fixtureOrg,approved:true}).returning('id').executeTakeFirstOrThrow()).id;
  try {
   const fresh=await acceptResource(user.admin,{...input,organization_name:'Brand new provider'});
   const org=await database().selectFrom('service as s').innerJoin('organization as o','o.id','s.organization_id').select(['o.id','o.name']).where('s.id','=',fresh).executeTakeFirstOrThrow();
   expect(org.name).toBe('Brand new provider');expect(org.id).not.toBe(fixtureOrg);
   const matched=await acceptResource(user.admin,input);
   expect((await database().selectFrom('service').select('organization_id').where('id','=',matched).executeTakeFirstOrThrow()).organization_id).toBe(fixtureOrg);
  } finally {await database().deleteFrom('membership').where('id','=',membership).execute();}
 });
 it('admins who are also staff never verify their own organization\'s listings',async()=>{
  const added:string[]=[];
  try {
   added.push((await database().insertInto('membership').values({user_id:user.admin,role:'organization',organization_id:fixtureOrg,approved:true}).returning('id').executeTakeFirstOrThrow()).id);
   await database().insertInto('account').values({user_id:user.admin2,display_name:'Synthetic unaffiliated admin'}).execute();
   added.push((await database().insertInto('membership').values({user_id:user.admin2,role:'admin',approved:true}).returning('id').executeTakeFirstOrThrow()).id);
   const id=await acceptResource(user.admin,{...input,organization_id:fixtureOrg});
   expect((await verificationQueue(user.admin)).some(r=>r.id===id)).toBe(false);
   await expect(verify(user.admin,id)).rejects.toThrow('Access denied');
   expect((await verificationQueue(user.admin2)).some(r=>r.id===id)).toBe(true);
   await verify(user.admin2,id);
   // Filing for their own organization is an organization assertion, even for an admin.
   expect((await database().selectFrom('revision').select('origin').where('service_id','=',id).executeTakeFirstOrThrow()).origin).toBe('organization');
   expect((await database().selectFrom('audit_event').select('detail').where('subject','=',id).where('action','=','resource.created').executeTakeFirstOrThrow()).detail).toEqual({asserted_by:'organization'});
   expect((await database().selectFrom('audit_event').select('detail').where('subject','=',id).where('action','=','resource.verified').executeTakeFirstOrThrow()).detail).toMatchObject({capacity:'admin'});
  } finally {if(added.length)await database().deleteFrom('membership').where('id','in',added).execute();}
 });
 it('pending staff memberships also block assignment and verification',async()=>{
  let pending:string|undefined,id:string|undefined;
  try {
   pending=(await database().insertInto('membership').values({user_id:user.community,role:'organization',organization_id:fixtureOrg,approved:false}).returning('id').executeTakeFirstOrThrow()).id;
   id=await acceptResource(user.org,input);
   expect(await assignee(id)).not.toBe(user.community);
   // An assignment made before the membership request stays blocked, and re-approval releases it.
   await database().updateTable('work_item').set({assigned_to:user.community}).where('service_id','=',id).execute();
   expect((await verificationQueue(user.community)).some(r=>r.id===id)).toBe(false);
   await expect(verify(user.community,id)).rejects.toThrow('Access denied');
   await approveContributor(user.admin,user.community,'98101',['food']);
   expect(await assignee(id)).not.toBe(user.community);
  } finally {
   if(id)await database().updateTable('work_item').set({assigned_to:null}).where('service_id','=',id).where('assigned_to','=',user.community).execute();
   if(pending)await database().deleteFrom('membership').where('id','=',pending).execute();
  }
 });
});

describe('per-field assertions and history',()=>{
 const currentRevision=async(id:string)=>(await database().selectFrom('listing_state').select(['state','revision_id']).where('service_id','=',id).executeTakeFirstOrThrow());
 it('records one accepted assertion per provided field with origin, source and decider',async()=>{
  const id=await acceptResource(user.admin,input),rows=await assertions(id);
  expect(rows.map(r=>r.field_path)).toEqual(['application_process','categories','description','eligibility_description','name','service_area','url']);
  for(const r of rows) expect(r).toMatchObject({status:'accepted',origin:'admin',source_type:'url',source_url:'https://example.org/listing',decided_by:user.admin});
  expect(rows.find(r=>r.field_path==='service_area')?.value).toEqual({kind:'zip',postal_codes:['98101']});
  const state=await database().selectFrom('listing_state').select('revision_id').where('service_id','=',id).executeTakeFirstOrThrow();
  expect(new Set(rows.map(r=>r.revision_id))).toEqual(new Set([state.revision_id]));
  const org=(await database().selectFrom('service').select('organization_id').where('id','=',id).executeTakeFirstOrThrow()).organization_id;
  expect((await assertions(org)).map(r=>[r.field_path,r.value])).toEqual([['name','Synthetic test organization']]);
 });
 it('an edit supersedes only the changed fields and keeps their history',async()=>{
  const id=await acceptResource(user.admin,input),changed='A changed synthetic description for history.';
  await acceptResource(user.admin,{...input,description:changed},id);
  const rows=await assertions(id),state=await currentRevision(id);
  expect(rows.filter(r=>r.field_path==='description').map(r=>[r.status,r.value])).toEqual([['superseded',input.description],['accepted',changed]]);
  expect(rows.filter(r=>r.field_path==='name').map(r=>r.status)).toEqual(['accepted']);
  expect(rows.filter(r=>r.revision_id===state.revision_id).map(r=>r.field_path)).toEqual(['description']);
  expect((await database().selectFrom('service').select('description').where('id','=',id).executeTakeFirstOrThrow()).description).toBe(changed);
 });
 it('an unchanged resubmission records a revision without assertions and still clears the check',async()=>{
  const id=await acceptResource(user.admin,input);
  await verify(user.admin,id);
  const checked=await currentRevision(id);
  expect(checked.state).toBe('checked');
  await acceptResource(user.admin,input,id);
  const after=await currentRevision(id);
  expect(after.state).toBe('unreviewed');
  expect(after.revision_id).not.toBe(checked.revision_id);
  expect(await database().selectFrom('field_assertion').select('id').where('revision_id','=',after.revision_id).execute()).toEqual([]);
 });
 it('clearing the website records an empty value',async()=>{
  const id=await acceptResource(user.admin,input);
  await acceptResource(user.admin,{...input,url:''},id);
  expect((await assertions(id)).filter(r=>r.field_path==='url').map(r=>[r.status,r.value])).toEqual([['superseded','https://example.org'],['accepted',null]]);
  expect((await database().selectFrom('service').select('url').where('id','=',id).executeTakeFirstOrThrow()).url).toBeNull();
 });
 it('only organization staff name the organization as the source',async()=>{
  await expect(acceptResource(user.admin,{...input,source_type:'organization',source_url:''})).rejects.toThrow('Only organization staff can name the organization as the source');
  await expect(acceptResource(user.admin,{...input,source_url:''})).rejects.toThrow('Give a source web address only for a website source');
  await expect(acceptResource(user.admin,{...input,source_type:'phone_call'})).rejects.toThrow('Give a source web address only for a website source');
  const id=await acceptResource(user.org,{...input,source_type:'organization',source_url:''}),rows=await assertions(id);
  expect(rows.length).toBeGreaterThan(0);
  for(const r of rows) expect(r).toMatchObject({source_type:'organization',source_url:null,origin:'organization'});
 });
 it('adding a website to a listing without one records one accepted assertion',async()=>{
  const id=await acceptResource(user.admin,{...input,url:''});
  expect((await assertions(id)).filter(r=>r.field_path==='url')).toEqual([]);
  await acceptResource(user.admin,input,id);
  expect((await assertions(id)).filter(r=>r.field_path==='url').map(r=>[r.status,r.value])).toEqual([['accepted','https://example.org']]);
  expect((await database().selectFrom('service').select('url').where('id','=',id).executeTakeFirstOrThrow()).url).toBe('https://example.org');
 });
 it('normalizes web addresses before storing them',async()=>{
  const id=await acceptResource(user.admin,{...input,url:'Https://Example.org/a',source_url:'Https://Example.org/b'}),rows=await assertions(id);
  expect(rows.find(r=>r.field_path==='url')?.value).toBe('https://example.org/a');
  expect((await database().selectFrom('service').select('url').where('id','=',id).executeTakeFirstOrThrow()).url).toBe('https://example.org/a');
  for(const r of rows) expect(r.source_url).toBe('https://example.org/b');
  // A single slash or no slashes still names a web address; a well-formed one is kept exactly as typed.
  const other=await acceptResource(user.admin,{...input,url:'https:/example.org',source_url:'http:example.org'});
  expect((await assertions(other)).filter(r=>r.field_path==='url').map(r=>[r.value,r.source_url])).toEqual([['https://example.org/','http://example.org/']]);
  const same=await acceptResource(user.admin,{...input,url:'https://example.org',source_url:'https://example.org'});
  expect((await assertions(same)).filter(r=>r.field_path==='url').map(r=>[r.value,r.source_url])).toEqual([['https://example.org','https://example.org']]);
  const long='https://example.org/'+'a'.repeat(481);
  await expect(acceptResource(user.admin,{...input,url:long})).rejects.toThrow();
  await expect(acceptResource(user.admin,{...input,source_url:long})).rejects.toThrow();
 });
 it('resubmitting the same categories in another order records no category assertion',async()=>{
  const id=await acceptResource(user.admin,{...input,categories:['health','food']});
  // Categories are stored in display order (food before health), as the legacy backfill stored them.
  expect((await assertions(id)).find(r=>r.field_path==='categories')?.value).toEqual(['food','health']);
  await acceptResource(user.admin,{...input,categories:['food','health']},id);
  const state=await currentRevision(id);
  expect((await assertions(id)).filter(r=>r.field_path==='categories'&&r.revision_id===state.revision_id)).toEqual([]);
  expect((await assertions(id)).filter(r=>r.field_path==='categories').map(r=>r.status)).toEqual(['accepted']);
 });
});
