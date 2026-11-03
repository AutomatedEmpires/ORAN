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
});
