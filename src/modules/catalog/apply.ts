import { randomUUID } from 'node:crypto';
import type { Insertable, Kysely } from 'kysely';
import { z } from 'zod';
import type { DB } from '@/modules/platform';
import type { EntityType, FieldValue, JsonValue } from './assertions';
import { areaRows, hoursValue, locationInput, phoneValue, serviceAreaValue } from './parts';
// The listing-fields writer (C4): it writes the organization, service, attribute, location (with location_access, address and service_at_location), phone, schedule (with service_hours) and service_area (with service_area_kind) rows; addCategory writes taxonomy_term. It runs inside the acceptance transaction, after lockCatalog, and rewrites only the parts that changed, so unchanged rows keep their ids. Stored values are parsed again with the part schemas, so a malformed value throws instead of being written.
type ServiceScalars = Pick<Insertable<DB['service']>,'name'|'description'|'url'|'eligibility_description'|'application_process'>;
const scalarPaths = ['name','description','url','eligibility_description','application_process'] as const;
const isScalarPath = (path: string): path is (typeof scalarPaths)[number] => (scalarPaths as readonly string[]).includes(path);
function entityField(fields: readonly FieldValue[], type: EntityType, id: string, path: string) {
 return fields.find(f => f.entity_type === type && f.entity_id === id && f.field_path === path);
}
const serviceField = (fields: readonly FieldValue[], serviceId: string, path: string) => entityField(fields, 'service', serviceId, path);
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
// The ids of a `locations` value: a list of ids, or null for none.
export const idListValue = z.array(z.uuid()).nullable();
export function idList(value: JsonValue): string[] {
 return idListValue.parse(value) ?? [];
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
 // 1. Each location with a changed field is written whole, with its access row, so no location is ever without one (fail closed: a missing row reads as confidential). A location stays with the organization that created it.
 for (const locationId of new Set(changed.filter(f => f.entity_type === 'location').map(f => f.entity_id))) {
  const value = (path: string) => entityField(desired, 'location', locationId, path)?.value ?? null;
  const loc = locationInput.parse({ access: value('access'), confidential: value('confidential'), name: value('name'), address: value('address'), coordinates: value('coordinates') });
  const columns = { location_type: loc.access === 'physical' ? 'physical' : 'virtual', name: loc.name, latitude: loc.coordinates?.latitude ?? null, longitude: loc.coordinates?.longitude ?? null };
  await trx.insertInto('location').values({ id: locationId, organization_id: listing.organization_id, ...columns }).onConflict(o => o.column('id').doUpdateSet(columns)).execute();
  const access = { mode: loc.access, confidential: loc.confidential ?? false };
  await trx.insertInto('location_access').values({ location_id: locationId, ...access }).onConflict(o => o.column('location_id').doUpdateSet(access)).execute();
  const address = loc.address;
  if (address) await trx.insertInto('address').values({ id: randomUUID(), location_id: locationId, ...address }).onConflict(o => o.column('location_id').doUpdateSet(address)).execute();
  else await trx.deleteFrom('address').where('location_id','=',locationId).execute();
 }
 // 2. The links follow the listed locations; kept links keep their ids.
 const locations = serviceField(changed, id, 'locations');
 if (locations) {
  const ids = idList(locations.value);
  await (ids.length ? trx.deleteFrom('service_at_location').where('service_id','=',id).where('location_id','not in',ids) : trx.deleteFrom('service_at_location').where('service_id','=',id)).execute();
  if (ids.length) await trx.insertInto('service_at_location').values(ids.map(locationId => ({ id: randomUUID(), service_id: id, location_id: locationId }))).onConflict(o => o.columns(['service_id','location_id']).doNothing()).execute();
 }
 // 3. Phones are one fact: a change replaces the rows.
 const phones = serviceField(changed, id, 'phones');
 if (phones) {
  await trx.deleteFrom('phone').where('service_id','=',id).execute();
  const list = z.array(phoneValue).nullable().parse(phones.value) ?? [];
  if (list.length) await trx.insertInto('phone').values(list.map(p => ({ id: randomUUID(), service_id: id, number: p.number, extension: p.extension }))).execute();
 }
 // 4. Hours (D3): no service_hours row means unknown. Times and dates are written as the 'HH:MM' and 'YYYY-MM-DD' text they arrived as, never through a JS Date, so no time zone shifts them.
 const hours = serviceField(changed, id, 'hours');
 if (hours) {
  await trx.deleteFrom('schedule').where('service_id','=',id).execute();
  await trx.deleteFrom('service_hours').where('service_id','=',id).execute();
  const value = hoursValue.parse(hours.value);
  if (value) await trx.insertInto('service_hours').values({ service_id: id, kind: value.kind, time_zone: value.kind === 'weekly' ? value.time_zone : null }).execute();
  if (value?.kind === 'weekly') await trx.insertInto('schedule').values([
   ...value.weekly.map(w => ({ id: randomUUID(), service_id: id, freq: 'WEEKLY', byday: w.day, opens_at: w.opens_at, closes_at: w.closes_at })),
   ...value.exceptions.map(e => ({ id: randomUUID(), service_id: id, valid_from: e.from, valid_to: e.to, opens_at: e.opens_at, closes_at: e.closes_at, description: e.note })),
  ]).execute();
 }
 // 5. The service area (D4): every row gets its kind, ZIP included; deleting the rows cascades to their kinds.
 const area = serviceField(changed, id, 'service_area');
 if (area) {
  await trx.deleteFrom('service_area').where('service_id','=',id).execute();
  const rows = areaRows(serviceAreaValue.parse(area.value)).map(r => ({ ...r, id: randomUUID() }));
  await trx.insertInto('service_area').values(rows.map(r => ({ id: r.id, service_id: id, name: r.name, extent: r.extent, extent_type: 'text' }))).execute();
  await trx.insertInto('service_area_kind').values(rows.map(r => ({ service_area_id: r.id, kind: r.kind }))).execute();
 }
}
