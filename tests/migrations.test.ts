import { describe,it,expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { migrate } from '../scripts/database';
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
   await expect(insert('proposed',{decided_by:'shape-actor',decided_at:new Date()})).rejects.toThrow();
   await expect(insert('superseded',{decided_by:null})).rejects.toThrow();
   await expect(insert('superseded',{source_type:'url',source_url:null})).rejects.toThrow();
   await expect(insert('superseded',{source_type:'phone_call',source_url:'https://example.org/a'})).rejects.toThrow();
   await expect(insert('superseded',{source_type:'url',source_url:'ftp://example.org/a'})).rejects.toThrow();
   await insert('superseded',{source_type:'url',source_url:'https://example.org/a'});
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
