import { randomUUID } from 'node:crypto';
import type { Insertable, Kysely } from 'kysely';
import type { DB } from '@/modules/platform';
import type { FieldValue, JsonValue } from './assertions';
// The only HSDS writer (C4). It runs inside the acceptance transaction, after lockCatalog, and rewrites only the parts that changed, so unchanged rows keep their ids.
type ServiceScalars = Pick<Insertable<DB['service']>,'name'|'description'|'url'|'eligibility_description'|'application_process'>;
const scalarPaths: readonly string[] = ['name','description','url','eligibility_description','application_process'];
function serviceField(fields: readonly FieldValue[], serviceId: string, path: string) {
 return fields.find(f => f.entity_type === 'service' && f.entity_id === serviceId && f.field_path === path);
}
function scalarColumns(fields: readonly FieldValue[], serviceId: string): Partial<ServiceScalars> {
 const columns: Record<string, JsonValue> = {};
 for (const f of fields) if (f.entity_type === 'service' && f.entity_id === serviceId && scalarPaths.includes(f.field_path)) columns[f.field_path] = f.field_path === 'url' ? f.value || null : f.value;
 return columns as Partial<ServiceScalars>;
}
export async function applyFields(trx: Kysely<DB>, listing: { service_id: string; organization_id: string; new_service: boolean; new_organization: boolean }, desired: readonly FieldValue[], changed: readonly FieldValue[]): Promise<void> {
 const id = listing.service_id;
 if (listing.new_organization) {
  const name = desired.find(f => f.entity_type === 'organization' && f.entity_id === listing.organization_id && f.field_path === 'name')?.value;
  await trx.insertInto('organization').values({ id: listing.organization_id, name: name as string }).execute();
 }
 if (listing.new_service) await trx.insertInto('service').values({ id, organization_id: listing.organization_id, ...(scalarColumns(desired, id) as ServiceScalars) }).execute();
 else {
  const columns = scalarColumns(changed, id);
  if (Object.keys(columns).length) await trx.updateTable('service').set(columns).where('id','=',id).execute();
 }
 const categories = serviceField(changed, id, 'categories');
 if (categories) {
  const terms = await trx.selectFrom('taxonomy_term as t').innerJoin('category_display as d','d.term_id','t.id').select('t.id').where('t.code','in',categories.value as string[]).execute();
  await trx.deleteFrom('attribute').where('link_id','=',id).where('link_entity','=','service').where('link_type','=','category').where('taxonomy_term_id','not in',terms.map(t=>t.id)).execute();
  await trx.insertInto('attribute').values(terms.map(t=>({id:randomUUID(),link_id:id,link_entity:'service',link_type:'category',taxonomy_term_id:t.id}))).onConflict(o=>o.columns(['link_id','taxonomy_term_id']).doNothing()).execute();
 }
 const area = serviceField(changed, id, 'service_area');
 if (area) {
  await trx.deleteFrom('service_area').where('service_id','=',id).execute();
  const zips = (area.value as { postal_codes?: string[] } | null)?.postal_codes ?? [];
  if (zips.length) await trx.insertInto('service_area').values(zips.map(zip => ({ id: randomUUID(), service_id: id, name: 'ZIP ' + zip, extent: zip, extent_type: 'text' }))).execute();
 }
}
