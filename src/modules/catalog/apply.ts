import { randomUUID } from 'node:crypto';
import type { Insertable, Kysely } from 'kysely';
import type { DB } from '@/modules/platform';
import type { FieldValue, JsonValue } from './assertions';
// The listing-fields writer (C4): it writes the organization, service, attribute and service_area rows (addCategory writes taxonomy_term). It runs inside the acceptance transaction, after lockCatalog, and rewrites only the parts that changed, so unchanged rows keep their ids.
type ServiceScalars = Pick<Insertable<DB['service']>,'name'|'description'|'url'|'eligibility_description'|'application_process'>;
const scalarPaths = ['name','description','url','eligibility_description','application_process'] as const;
const isScalarPath = (path: string): path is (typeof scalarPaths)[number] => (scalarPaths as readonly string[]).includes(path);
function serviceField(fields: readonly FieldValue[], serviceId: string, path: string) {
 return fields.find(f => f.entity_type === 'service' && f.entity_id === serviceId && f.field_path === path);
}
function scalarColumns(fields: readonly FieldValue[], serviceId: string): Partial<ServiceScalars> {
 const columns: Partial<ServiceScalars> = {};
 for (const f of fields) {
  if (f.entity_type !== 'service' || f.entity_id !== serviceId || !isScalarPath(f.field_path)) continue;
  if (f.field_path === 'url') columns.url = typeof f.value === 'string' && f.value ? f.value : null;
  else if (typeof f.value === 'string') columns[f.field_path] = f.value;
  else throw new Error('Expected text for ' + f.field_path);
 }
 return columns;
}
// The ZIP codes of a {kind:'zip',postal_codes:[...]} service-area value; any other shape has none.
function postalCodes(value: JsonValue): string[] {
 const list = value !== null && typeof value === 'object' && !Array.isArray(value) ? value.postal_codes : undefined;
 return Array.isArray(list) ? list.filter((z): z is string => typeof z === 'string') : [];
}
export async function applyFields(trx: Kysely<DB>, listing: { service_id: string; organization_id: string; new_service: boolean; new_organization: boolean }, desired: readonly FieldValue[], changed: readonly FieldValue[]): Promise<void> {
 const id = listing.service_id;
 if (listing.new_organization) {
  const name = desired.find(f => f.entity_type === 'organization' && f.entity_id === listing.organization_id && f.field_path === 'name')?.value;
  if (typeof name !== 'string') throw new Error('Missing organization name');
  await trx.insertInto('organization').values({ id: listing.organization_id, name }).execute();
 }
 if (listing.new_service) {
  const columns = scalarColumns(desired, id);
  if (columns.name === undefined || columns.description === undefined) throw new Error('Missing service name or description');
  await trx.insertInto('service').values({ id, organization_id: listing.organization_id, ...columns, name: columns.name, description: columns.description }).execute();
 } else {
  const columns = scalarColumns(changed, id);
  if (Object.keys(columns).length) await trx.updateTable('service').set(columns).where('id','=',id).execute();
 }
 const categories = serviceField(changed, id, 'categories');
 if (categories) {
  const codes = categories.value;
  if (!Array.isArray(codes) || !codes.every((c): c is string => typeof c === 'string')) throw new Error('Expected category codes');
  const terms = await trx.selectFrom('taxonomy_term as t').innerJoin('category_display as d','d.term_id','t.id').select('t.id').where('t.code','in',codes).execute();
  await trx.deleteFrom('attribute').where('link_id','=',id).where('link_entity','=','service').where('link_type','=','category').where('taxonomy_term_id','not in',terms.map(t=>t.id)).execute();
  await trx.insertInto('attribute').values(terms.map(t=>({id:randomUUID(),link_id:id,link_entity:'service',link_type:'category',taxonomy_term_id:t.id}))).onConflict(o=>o.columns(['link_id','taxonomy_term_id']).doNothing()).execute();
 }
 const area = serviceField(changed, id, 'service_area');
 if (area) {
  await trx.deleteFrom('service_area').where('service_id','=',id).execute();
  const zips = postalCodes(area.value);
  if (zips.length) await trx.insertInto('service_area').values(zips.map(zip => ({ id: randomUUID(), service_id: id, name: 'ZIP ' + zip, extent: zip, extent_type: 'text' }))).execute();
 }
}
