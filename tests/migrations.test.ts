import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { migrate } from '../scripts/database';
import { closeDatabase } from '../src/modules/platform/index';
import { acceptResource } from '../src/modules/catalog/index';
import { disposableDatabase } from './support/disposable-database';
async function withDatabase(fn:(client:Client,url:string)=>Promise<void>) {
 const db=await disposableDatabase(),client=new Client({connectionString:db.url});
 try {await client.connect();await fn(client,db.url);} finally {await client.end().catch(()=>{});await db.close();}
}
const seed=[['food','Food','Alimentos'],['housing_shelter','Housing & shelter','Vivienda y refugio'],['bills_money','Bills & money','Facturas y dinero'],['health','Health','Salud'],['mental_health','Mental health','Salud mental'],['work','Work','Trabajo'],['legal','Legal','Apoyo legal'],['transportation','Transportation','Transporte'],['childcare_family','Childcare & family','Cuidado infantil y familia'],['safety','Safety','Seguridad']];
describe('taxonomy migration',()=>{
 it('seeds the ten ORAN categories in display order',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url);
   const r=await client.query('SELECT t.code, d.label_en, d.label_es FROM oran.taxonomy_term t JOIN oran.category_display d ON d.term_id=t.id ORDER BY d.sort_order');
   expect(r.rows.map(x=>[x.code,x.label_en,x.label_es])).toEqual(seed);
  });
 },120000);
 it('maps legacy categories, scopes and needs',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url,{until:'20261102204600_community_scope_and_resource_revision.sql'});
   const org=randomUUID(),s1=randomUUID(),s2=randomUUID(),admin='legacy-admin',comm='legacy-community',seeker='legacy-seeker';
   await client.query("INSERT INTO oran.organization(id,name) VALUES ($1,'Legacy org')",[org]);
   for(const [id,role] of [[admin,'admin'],[comm,'community'],[seeker,'user']]) await client.query("INSERT INTO oran.membership(user_id,display_name,role,approved) VALUES ($1,$1,$2,true)",[id,role]);
   await client.query("UPDATE oran.membership SET category_scope='{housing,other}' WHERE user_id=$1",[comm]);
   await client.query("INSERT INTO oran.personal_profile(user_id,postal_code,needs) VALUES ($1,'98101','{other,food}')",[seeker]);
   for(const [id,cat] of [[s1,'housing'],[s2,'other']]) {
    const a=randomUUID();
    await client.query("INSERT INTO oran.service(id,organization_id,name,description) VALUES ($1,$2,'Legacy service','Synthetic')",[id,org]);
    await client.query("INSERT INTO oran.service_area(id,service_id,name,extent) VALUES ($1,$2,'Area','98101')",[randomUUID(),id]);
    await client.query("INSERT INTO oran.field_assertion(id,service_id,actor_id,origin,value,status) VALUES ($1,$2,$3,'admin','{}','accepted')",[a,id,admin]);
    await client.query("INSERT INTO oran.listing_state(service_id,category,created_by,revision_id) VALUES ($1,$2,$3,$4)",[id,cat,admin,a]);
   }
   await migrate(url);
   const codes=async(id:string)=>(await client.query('SELECT t.code FROM oran.attribute a JOIN oran.taxonomy_term t ON t.id=a.taxonomy_term_id WHERE a.link_id=$1 ORDER BY t.code',[id])).rows.map(x=>x.code);
   expect(await codes(s1)).toEqual(['housing_shelter']);
   expect(await codes(s2)).toEqual([]);
   expect((await client.query('SELECT category_scope FROM oran.membership WHERE user_id=$1',[comm])).rows[0].category_scope).toEqual(['housing_shelter']);
   expect((await client.query('SELECT needs FROM oran.personal_profile WHERE user_id=$1',[seeker])).rows[0].needs).toEqual(['food']);
  });
 },120000);
 it('copies categories written after the first migration before dropping the column',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url,{until:'20261103090000_taxonomy_categories.sql'});
   const org=randomUUID(),s=randomUUID(),a=randomUUID(),admin='late-admin';
   await client.query("INSERT INTO oran.membership(user_id,display_name,role,approved) VALUES ($1,$1,'admin',true)",[admin]);
   await client.query("INSERT INTO oran.organization(id,name) VALUES ($1,'Late org')",[org]);
   await client.query("INSERT INTO oran.service(id,organization_id,name,description) VALUES ($1,$2,'Late service','Synthetic')",[s,org]);
   await client.query("INSERT INTO oran.service_area(id,service_id,name,extent) VALUES ($1,$2,'Area','98101')",[randomUUID(),s]);
   await client.query("INSERT INTO oran.field_assertion(id,service_id,actor_id,origin,value,status) VALUES ($1,$2,$3,'admin','{}','accepted')",[a,s,admin]);
   await client.query("INSERT INTO oran.listing_state(service_id,category,created_by,revision_id) VALUES ($1,'health',$2,$3)",[s,admin,a]);
   await migrate(url);
   const r=await client.query('SELECT t.code FROM oran.attribute a JOIN oran.taxonomy_term t ON t.id=a.taxonomy_term_id WHERE a.link_id=$1',[s]);
   expect(r.rows.map(x=>x.code)).toEqual(['health']);
  });
 },120000);
 it('maps legacy memberships to accounts',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url,{until:'20261103090100_drop_listing_state_category.sql'});
   for(const [id,role] of [['u1','user'],['a1','admin']]) await client.query("INSERT INTO oran.membership(user_id,display_name,role,approved) VALUES ($1,$1,$2,true)",[id,role]);
   await client.query("INSERT INTO oran.audit_event(id,actor_id,action,subject) VALUES ($1,'u1','test.legacy','x')",[randomUUID()]);
   await migrate(url);
   expect((await client.query('SELECT user_id FROM oran.account ORDER BY user_id')).rows.map(x=>x.user_id)).toEqual(['a1','u1']);
   const m=await client.query('SELECT id,user_id,role FROM oran.membership');
   expect(m.rows).toHaveLength(1);expect(m.rows[0].user_id).toBe('a1');expect(m.rows[0].role).toBe('admin');expect(m.rows[0].id).toBeTruthy();
   expect((await client.query("SELECT 1 FROM oran.audit_event WHERE actor_id='u1'")).rows).toHaveLength(1);
   await expect(client.query("INSERT INTO oran.membership(user_id,role) VALUES ('a1','admin')")).rejects.toThrow();
  });
 },120000);
 it('rejects an unknown migration target',async()=>{
  await withDatabase(async(_,url)=>{
   await expect(migrate(url,{until:'no_such_migration.sql'})).rejects.toThrow('Unknown migration: no_such_migration.sql');
  });
 },120000);
 it('enables row-level security on every oran table',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url);
   const r=await client.query("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='oran' AND c.relkind='r' AND NOT c.relrowsecurity");
   expect(r.rows).toEqual([]);
  });
 },120000);
 it('rejects malformed category codes',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url);
   const tax=(await client.query('SELECT id FROM oran.taxonomy LIMIT 1')).rows[0].id;
   await expect(client.query("INSERT INTO oran.taxonomy_term(id,taxonomy_id,code,name) VALUES ($1,$2,'Bad Code','Bad')",[randomUUID(),tax])).rejects.toThrow();
  });
 },120000);
 it('turns legacy snapshots into revisions with per-field accepted assertions',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url,{until:'20261103100100_membership_organization_scope.sql'});
   const o=randomUUID(),s=randomUUID(),r1=randomUUID(),r2=randomUUID();
   await client.query("INSERT INTO oran.account(user_id,display_name) VALUES ('legacy-verifier','Legacy verifier')");
   await client.query("INSERT INTO oran.organization(id,name) VALUES ($1,'Legacy provider')",[o]);
   await client.query("INSERT INTO oran.service(id,organization_id,name,description,url,eligibility_description,application_process) VALUES ($1,$2,'Legacy pantry','Synthetic legacy listing',NULL,'Anyone nearby','Walk in during open hours')",[s,o]);
   await client.query("INSERT INTO oran.service_area(id,service_id,name,extent) VALUES ($1,$2,'ZIP 98101','98101')",[randomUUID(),s]);
   await client.query("INSERT INTO oran.attribute(id,link_id,link_entity,link_type,taxonomy_term_id) SELECT $1,$2,'service','category',id FROM oran.taxonomy_term WHERE code='food'",[randomUUID(),s]);
   await client.query("INSERT INTO oran.field_assertion(id,service_id,actor_id,origin,value,status,created_at) VALUES ($1,$2,'legacy-verifier','community',$3,'accepted',now()-interval '2 days')",[r1,s,'{"input":{"source_note":"First legacy note"}}']);
   await client.query("INSERT INTO oran.field_assertion(id,service_id,actor_id,origin,value,status) VALUES ($1,$2,'legacy-verifier','community',$3,'accepted')",[r2,s,'{"input":{"source_note":"Legacy phone call note"},"previous":null}']);
   await client.query("INSERT INTO oran.listing_state(service_id,created_by,revision_id,state,checked_at,next_review_due) VALUES ($1,'legacy-verifier',$2,'checked',now(),now()+interval '30 days')",[s,r2]);
   await migrate(url);
   expect((await client.query('SELECT id,origin FROM oran.revision ORDER BY created_at')).rows).toEqual([{id:r1,origin:'verifier'},{id:r2,origin:'verifier'}]);
   expect((await client.query("SELECT legacy_snapshot #>> '{input,source_note}' AS note FROM oran.revision WHERE id=$1",[r2])).rows[0].note).toBe('Legacy phone call note');
   expect((await client.query('SELECT revision_id,state FROM oran.listing_state WHERE service_id=$1',[s])).rows[0]).toEqual({revision_id:r2,state:'checked'});
   const rows=(await client.query("SELECT field_path,value,status,origin,source_type,source_url,source_note,decided_by,revision_id FROM oran.field_assertion WHERE entity_type='service' AND entity_id=$1 ORDER BY field_path",[s])).rows;
   expect(rows.map(r=>r.field_path)).toEqual(['application_process','categories','description','eligibility_description','name','service_area']);
   expect(rows.find(r=>r.field_path==='categories').value).toEqual(['food']);
   expect(rows.find(r=>r.field_path==='service_area').value).toEqual({kind:'zip',postal_codes:['98101']});
   for(const r of rows) expect(r).toMatchObject({status:'accepted',origin:'verifier',source_type:'legacy',source_url:null,source_note:'Legacy phone call note',decided_by:'legacy-verifier',revision_id:r2});
   expect((await client.query("SELECT field_path,value,revision_id FROM oran.field_assertion WHERE entity_type='organization' AND entity_id=$1",[o])).rows).toEqual([{field_path:'name',value:'Legacy provider',revision_id:r1}]);
  });
 },120000);
 it('skips empty legacy values and links each organization name to its earliest revision',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url,{until:'20261103100100_membership_organization_scope.sql'});
   const [oa,oidle,bare,sparse,mixed,early,mid,late]=Array.from({length:8},()=>randomUUID());
   for(const u of ['legacy-admin','legacy-verifier','legacy-staff']) await client.query('INSERT INTO oran.account(user_id,display_name) VALUES ($1,$1)',[u]);
   await client.query("INSERT INTO oran.organization(id,name) VALUES ($1,'Skip provider'),($2,'Idle provider')",[oa,oidle]);
   // bare: empty text, a non-ZIP area and no listing_state. sparse: empty text, a non-ZIP area and no categories. mixed: one empty and one filled text, a url and a ZIP.
   await client.query("INSERT INTO oran.service(id,organization_id,name,description) VALUES ($1,$3,'Bare service','Bare description'),($2,$3,'Sparse service','Sparse description')",[bare,sparse,oa]);
   await client.query("INSERT INTO oran.service(id,organization_id,name,description,url,application_process) VALUES ($1,$2,'Mixed service','Mixed description','https://example.org/mixed','Call first')",[mixed,oa]);
   await client.query("INSERT INTO oran.service_area(id,service_id,name,extent) VALUES ($1,$2,'United States','US'),($3,$4,'United States','US'),($5,$6,'ZIP 98102','98102')",[randomUUID(),bare,randomUUID(),sparse,randomUUID(),mixed]);
   const revise=(id:string,service:string,actor:string,origin:string,note:string,ago:string)=>client.query(`INSERT INTO oran.field_assertion(id,service_id,actor_id,origin,value,status,created_at) VALUES ($1,$2,$3,$4,$5,'accepted',now()-interval '${ago}')`,[id,service,actor,origin,JSON.stringify({input:{source_note:note}})]);
   await revise(early,bare,'legacy-admin','admin','Earliest note','3 days');
   await revise(mid,mixed,'legacy-staff','organization','Middle note','1 day');
   await revise(late,sparse,'legacy-verifier','community','Latest note','0 days');
   for(const [s,r] of [[sparse,late],[mixed,mid]]) await client.query("INSERT INTO oran.listing_state(service_id,created_by,revision_id) VALUES ($1,'legacy-admin',$2)",[s,r]);
   await migrate(url);
   const paths=async(type:string,id:string)=>(await client.query('SELECT field_path FROM oran.field_assertion WHERE entity_type=$1 AND entity_id=$2 ORDER BY field_path',[type,id])).rows.map(x=>x.field_path);
   expect(await paths('service',bare)).toEqual([]);
   expect(await paths('service',sparse)).toEqual(['description','name']);
   expect(await paths('service',mixed)).toEqual(['application_process','description','name','service_area','url']);
   expect(await paths('organization',oidle)).toEqual([]);
   const mixedRows=(await client.query("SELECT field_path,value,origin,source_note,decided_by,revision_id FROM oran.field_assertion WHERE entity_type='service' AND entity_id=$1 AND field_path IN ('url','service_area','application_process') ORDER BY field_path",[mixed])).rows;
   expect(mixedRows.map(r=>r.value)).toEqual(['Call first',{kind:'zip',postal_codes:['98102']},'https://example.org/mixed']);
   for(const r of mixedRows) expect(r).toMatchObject({origin:'organization',source_note:'Middle note',decided_by:'legacy-staff',revision_id:mid});
   const org=(await client.query("SELECT f.value,f.revision_id,f.origin,f.source_type,f.source_note,f.decided_by,f.status,f.observed_at=r.created_at AS observed_at_revision,f.decided_at=r.created_at AS decided_at_revision FROM oran.field_assertion f JOIN oran.revision r ON r.id=f.revision_id WHERE f.entity_type='organization' AND f.entity_id=$1",[oa])).rows;
   expect(org).toEqual([{value:'Skip provider',revision_id:early,origin:'admin',source_type:'legacy',source_note:'Earliest note',decided_by:'legacy-admin',status:'accepted',observed_at_revision:true,decided_at_revision:true}]);
  });
 },120000);
 it('a backfilled legacy listing resubmitted unchanged records no assertions',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url,{until:'20261103100100_membership_organization_scope.sql'});
   const o=randomUUID(),s=randomUUID(),r=randomUUID();
   await client.query("INSERT INTO oran.account(user_id,display_name) VALUES ('legacy-admin','Legacy admin')");
   await client.query("INSERT INTO oran.organization(id,name) VALUES ($1,'Legacy provider')",[o]);
   // The values are exactly what the resource form submits when it prefills and re-saves this listing: a bare-host website stays as stored, and one ZIP code.
   await client.query("INSERT INTO oran.service(id,organization_id,name,description,url,eligibility_description,application_process) VALUES ($1,$2,'Legacy pantry','Synthetic legacy listing','https://example.org','Anyone nearby','Walk in during open hours')",[s,o]);
   await client.query("INSERT INTO oran.service_area(id,service_id,name,extent) VALUES ($1,$2,'ZIP 98101','98101')",[randomUUID(),s]);
   await client.query("INSERT INTO oran.attribute(id,link_id,link_entity,link_type,taxonomy_term_id) SELECT $1,$2,'service','category',id FROM oran.taxonomy_term WHERE code='food'",[randomUUID(),s]);
   await client.query("INSERT INTO oran.field_assertion(id,service_id,actor_id,origin,value,status) VALUES ($1,$2,'legacy-admin','admin',$3,'accepted')",[r,s,'{"input":{"source_note":"Legacy note"}}']);
   await client.query("INSERT INTO oran.listing_state(service_id,created_by,revision_id,state,checked_at,next_review_due) VALUES ($1,'legacy-admin',$2,'checked',now(),now()+interval '30 days')",[s,r]);
   await migrate(url);
   await client.query("INSERT INTO oran.membership(user_id,role,approved) VALUES ('legacy-admin','admin',true)");
   const saved={DATABASE_URL:process.env.DATABASE_URL,ORAN_ENV:process.env.ORAN_ENV,ORAN_DATABASE_HOST:process.env.ORAN_DATABASE_HOST};
   process.env.DATABASE_URL=url;process.env.ORAN_ENV='test';process.env.ORAN_DATABASE_HOST=new URL(url).hostname;
   try {
    await closeDatabase();
    await acceptResource('legacy-admin',{name:'Legacy pantry',description:'Synthetic legacy listing',organization_name:'Legacy provider',categories:['food'],service_area:{kind:'zip',postal_codes:['98101']},eligibility_description:'Anyone nearby',application_process:'Walk in during open hours',url:'https://example.org',source_type:'phone_call',source_url:'',source_note:'Resubmitted without changes'},s);
   } finally {
    await closeDatabase();
    for(const [key,value] of Object.entries(saved)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
   }
   const state=(await client.query('SELECT revision_id,state FROM oran.listing_state WHERE service_id=$1',[s])).rows[0];
   expect(state.revision_id).not.toBe(r);
   expect(state.state).toBe('unreviewed');
   expect((await client.query('SELECT id FROM oran.field_assertion WHERE revision_id=$1',[state.revision_id])).rows).toEqual([]);
   const rows=(await client.query("SELECT DISTINCT status,revision_id FROM oran.field_assertion WHERE entity_id=$1",[s])).rows;
   expect(rows).toEqual([{status:'accepted',revision_id:r}]);
  });
 },120000);
 it('allows one accepted value per field and enforces decision and source shapes',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url);
   const o=randomUUID(),s=randomUUID(),rev=randomUUID();
   await client.query("INSERT INTO oran.account(user_id,display_name) VALUES ('shape-actor','Shape actor')");
   await client.query("INSERT INTO oran.organization(id,name) VALUES ($1,'Shape org')",[o]);
   await client.query("INSERT INTO oran.service(id,organization_id,name,description) VALUES ($1,$2,'Shape service','Synthetic')",[s,o]);
   await client.query("INSERT INTO oran.revision(id,service_id,actor_id,origin) VALUES ($1,$2,'shape-actor','admin')",[rev,s]);
   const insert=(status:string,over:Record<string,unknown>={})=>{
    const v={status,source_type:'phone_call',source_url:null,decided_by:status==='proposed'?null:'shape-actor',decided_at:status==='proposed'?null:new Date(),...over};
    return client.query("INSERT INTO oran.field_assertion(id,revision_id,entity_type,entity_id,field_path,value,origin,source_type,source_url,observed_at,status,decided_by,decided_at) VALUES ($1,$2,'service',$3,'name','\"Shape service\"','admin',$4,$5,now(),$6,$7,$8)",[randomUUID(),rev,s,v.source_type,v.source_url,v.status,v.decided_by,v.decided_at]);
   };
   await insert('accepted');
   await expect(insert('accepted')).rejects.toThrow('field_assertion_one_accepted');
   await insert('superseded');
   await insert('proposed');
   await expect(insert('proposed',{decided_by:'shape-actor',decided_at:new Date()})).rejects.toThrow('field_assertion_decision_shape');
   await expect(insert('superseded',{decided_by:null})).rejects.toThrow('field_assertion_decider_shape');
   await expect(insert('superseded',{source_type:'url',source_url:null})).rejects.toThrow('field_assertion_source_shape');
   await expect(insert('superseded',{source_type:'phone_call',source_url:'https://example.org/a'})).rejects.toThrow('field_assertion_source_shape');
   await expect(insert('superseded',{source_type:'url',source_url:'ftp://example.org/a'})).rejects.toThrow('field_assertion_source_url_check');
   await insert('superseded',{source_type:'url',source_url:'https://example.org/a'});
  });
 },120000);
 it('marks legacy ZIP service areas and allows several areas per service',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url,{until:'20261104090000_per_field_assertions.sql'});
   expect((await client.query("SELECT conname FROM pg_constraint WHERE conrelid='oran.service_area'::regclass AND contype='u'")).rows).toEqual([{conname:'service_area_service_id_key'}]);
   const o=randomUUID(),s=randomUUID(),other=randomUUID(),zip=randomUUID();
   await client.query("INSERT INTO oran.organization(id,name) VALUES ($1,'Area org')",[o]);
   await client.query("INSERT INTO oran.service(id,organization_id,name,description) VALUES ($1,$3,'Area service','Synthetic'),($2,$3,'Other service','Synthetic')",[s,other,o]);
   await client.query("INSERT INTO oran.service_area(id,service_id,name,extent) VALUES ($1,$2,'ZIP 98101','98101'),($3,$4,'United States','US')",[zip,s,randomUUID(),other]);
   await migrate(url);
   expect((await client.query('SELECT kind FROM oran.service_area_kind')).rows).toEqual([{kind:'zip'}]);
   const add=(id:string,service:string,extent:string)=>client.query("INSERT INTO oran.service_area(id,service_id,name,extent) VALUES ($1,$2,$3,$3)",[id,service,extent]);
   const second=randomUUID();
   await add(second,s,'98102');
   await expect(add(randomUUID(),s,'98101')).rejects.toThrow('service_area_service_extent');
   await expect(client.query("INSERT INTO oran.service_area_kind(service_area_id,kind) VALUES ($1,'region')",[second])).rejects.toThrow(/constraint "service_area_kind_kind"/);
   await client.query("INSERT INTO oran.service_area_kind(service_area_id,kind) VALUES ($1,'zip')",[second]);
   await client.query('DELETE FROM oran.service_area WHERE id=$1',[second]);
   expect((await client.query('SELECT service_area_id FROM oran.service_area_kind')).rows).toEqual([{service_area_id:zip}]);
  });
 },120000);
 it('enforces the shapes of locations, schedules and phones',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url);
   const o=randomUUID(),s=randomUUID(),s2=randomUUID();
   await client.query("INSERT INTO oran.organization(id,name) VALUES ($1,'Shape org')",[o]);
   await client.query("INSERT INTO oran.service(id,organization_id,name,description) VALUES ($1,$3,'Shape service','Synthetic'),($2,$3,'Second service','Synthetic')",[s,s2,o]);
   // Every rejection names the one constraint it breaks, so each case violates exactly that constraint.
   type Q=[string,unknown[]];
   const rejects=(name:string,sql:string,params:unknown[])=>expect(client.query(sql,params)).rejects.toThrow(new RegExp('constraint "'+name+'"'));
   const location=(type:string,lat:number|null,lon:number|null,id=randomUUID())=>client.query('INSERT INTO oran.location(id,organization_id,location_type,latitude,longitude) VALUES ($1,$2,$3,$4,$5)',[id,o,type,lat,lon]);
   const place=randomUUID(),remote=randomUUID();
   await rejects('location_type_kind','INSERT INTO oran.location(id,organization_id,location_type) VALUES ($1,$2,$3)',[randomUUID(),o,'remote']);
   await rejects('location_latitude_range','INSERT INTO oran.location(id,organization_id,location_type,latitude,longitude) VALUES ($1,$2,\'physical\',$3,$4)',[randomUUID(),o,91,0]);
   await rejects('location_longitude_range','INSERT INTO oran.location(id,organization_id,location_type,latitude,longitude) VALUES ($1,$2,\'physical\',$3,$4)',[randomUUID(),o,0,181]);
   await rejects('location_coordinates_pair','INSERT INTO oran.location(id,organization_id,location_type,latitude,longitude) VALUES ($1,$2,\'physical\',$3,$4)',[randomUUID(),o,47.6,null]);
   await rejects('location_coordinates_physical','INSERT INTO oran.location(id,organization_id,location_type,latitude,longitude) VALUES ($1,$2,\'virtual\',$3,$4)',[randomUUID(),o,47.6,-122.3]);
   await location('physical',47.6,-122.3,place);await location('physical',null,null);await location('virtual',null,null,remote);
   const access=(id:string,mode:string,confidential:boolean)=>client.query('INSERT INTO oran.location_access(location_id,mode,confidential) VALUES ($1,$2,$3)',[id,mode,confidential]);
   await rejects('location_access_mode','INSERT INTO oran.location_access(location_id,mode,confidential) VALUES ($1,$2,$3)',[remote,'fax',false]);
   await rejects('location_access_confidential_physical','INSERT INTO oran.location_access(location_id,mode,confidential) VALUES ($1,$2,$3)',[remote,'remote',true]);
   await rejects('location_access_confidential_physical','INSERT INTO oran.location_access(location_id,mode,confidential) VALUES ($1,$2,$3)',[remote,'phone',true]);
   await access(remote,'remote',false);await access(place,'physical',true);
   const link=(service:string,loc:string)=>client.query('INSERT INTO oran.service_at_location(id,service_id,location_id) VALUES ($1,$2,$3)',[randomUUID(),service,loc]);
   await link(s,place);await link(s2,place);await link(s,remote);
   await expect(link(s,place)).rejects.toThrow('service_at_location_service_id_location_id_key');
   const address=(state:string,postal:string,country:string,type:string):Q=>['INSERT INTO oran.address(id,location_id,address_1,city,state_province,postal_code,country,address_type) VALUES ($1,$2,\'1 Main St\',\'Seattle\',$3,$4,$5,$6)',[randomUUID(),place,state,postal,country,type]];
   await rejects('address_state_code',...address('wa','98101','US','physical'));
   await rejects('address_postal_code',...address('WA','9810','US','physical'));
   await rejects('address_country_us',...address('WA','98101','CA','physical'));
   await rejects('address_type_physical',...address('WA','98101','US','postal'));
   const [okSql,okParams]=address('WA','98101-1234','US','physical');
   await client.query(okSql,okParams);
   await expect(client.query(okSql,[randomUUID(),...okParams.slice(1)])).rejects.toThrow('address_location_id_key');
   const phone=(number:string,extension:number|null=null):Q=>['INSERT INTO oran.phone(id,service_id,number,extension) VALUES ($1,$2,$3,$4)',[randomUUID(),s,number,extension]];
   await rejects('phone_number_shape',...phone('206-555-0100'));
   await rejects('phone_number_shape',...phone('911'));
   await rejects('phone_extension_range',...phone('+12065550100',0));
   await rejects('phone_extension_range',...phone('+12065550100',100000));
   for(const [number,extension] of [['+12065550100',null],['988',null],['+12065550100',99999]] as [string,number|null][]) await client.query(...phone(number,extension));
   type Part={freq:string|null,byday:string|null,opens_at:string|null,closes_at:string|null,valid_from:string|null,valid_to:string|null};
   const row=(over:Partial<Part>):Q=>{const v:Part={freq:'WEEKLY',byday:'FR',opens_at:'09:00',closes_at:'17:00',valid_from:null,valid_to:null,...over};return ['INSERT INTO oran.schedule(id,service_id,freq,byday,opens_at,closes_at,valid_from,valid_to) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',[randomUUID(),s,v.freq,v.byday,v.opens_at,v.closes_at,v.valid_from,v.valid_to]];};
   const exception={freq:null,byday:null,opens_at:null,closes_at:null};
   await rejects('schedule_freq_weekly',...row({freq:'DAILY'}));
   await rejects('schedule_byday_day',...row({byday:'XX'}));
   await rejects('schedule_rule_pair',...row({byday:null}));
   await rejects('schedule_times_pair',...row({opens_at:'19:00',closes_at:null}));
   await rejects('schedule_times_differ',...row({opens_at:'09:00',closes_at:'09:00'}));
   await rejects('schedule_rule_or_exception',...row({opens_at:null,closes_at:null}));
   await rejects('schedule_rule_or_exception',...row({valid_from:'2026-12-25'}));
   await rejects('schedule_rule_or_exception',...row({...exception,valid_from:'2026-12-25',valid_to:'2026-12-24'}));
   await rejects('schedule_rule_or_exception',...row({...exception,valid_from:'2026-12-25'}));
   await rejects('schedule_rule_or_exception',...row(exception));
   for(const over of [{byday:'FR',opens_at:'19:00',closes_at:'07:00'},{...exception,valid_from:'2026-12-25',valid_to:'2026-12-25'},{...exception,opens_at:'10:00',closes_at:'14:00',valid_from:'2026-12-24',valid_to:'2026-12-24'}]) await client.query(...row(over));
   const hours=(service:string,kind:string,zone:string|null):Q=>['INSERT INTO oran.service_hours(service_id,kind,time_zone) VALUES ($1,$2,$3)',[service,kind,zone]];
   await rejects('service_hours_kind',...hours(s,'sometimes',null));
   await rejects('service_hours_time_zone',...hours(s,'weekly',null));
   await rejects('service_hours_time_zone',...hours(s,'always_open','America/Los_Angeles'));
   await client.query(...hours(s,'weekly','America/Los_Angeles'));await client.query(...hours(s2,'by_appointment',null));
   expect((await client.query("SELECT to_char(opens_at,'HH24:MI') AS opens_at,to_char(closes_at,'HH24:MI') AS closes_at FROM oran.schedule WHERE byday='FR'")).rows).toEqual([{opens_at:'19:00',closes_at:'07:00'}]);
  });
 },120000);
 it('rejects a community membership scoped to an organization',async()=>{
  await withDatabase(async(client,url)=>{
   await migrate(url);
   const org=randomUUID();
   await client.query("INSERT INTO oran.organization(id,name) VALUES ($1,'Scoped org')",[org]);
   await client.query("INSERT INTO oran.account(user_id,display_name) VALUES ('c1','c1')");
   await expect(client.query("INSERT INTO oran.membership(user_id,role,organization_id) VALUES ('c1','community',$1)",[org])).rejects.toThrow('membership_organization_scope');
  });
 },120000);
});
