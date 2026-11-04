import type { ExpressionBuilder, Kysely } from 'kysely';
import { z } from 'zod';
import type { DB } from '@/modules/platform';
import type { JsonValue } from './assertions';
import { idListValue } from './apply';
import { addressValue, hoursValue, locationInput, phoneValue, serviceAreaValue, type AddressValue, type HoursValue, type LocationAccess, type PhoneValue, type ServiceAreaValue } from './parts';
// The listing parts a read returns, from accepted assertions. A confidential location's address, coordinates and name never leave the server (ADR-0006 §1, S2-20): only an editor audience, which the caller has authorized, reads them.
export type ListingLocation = { id: string; access: LocationAccess; confidential: boolean; name: string | null; address: AddressValue | null; coordinates: { latitude: number; longitude: number } | null };
export type ListingParts = { service_area: ServiceAreaValue | null; phones: PhoneValue[]; hours: HoursValue | null; locations: ListingLocation[] };
// Who reads: the public, or the editors of one organization's listings.
export type Audience = { kind: 'public' } | { kind: 'editor'; organization_id: string };
const { access, name, coordinates } = locationInput.shape;
const privateFields = ['address', 'coordinates', 'name'];
const locationFields = z.object({ confidential: z.boolean().nullable(), name, address: addressValue.nullable(), coordinates });
// Whether the audience may see a location's private fields.
// - Public, fail closed (S2-13, S2-17): only when the location's access row exists and says it is not confidential, so a missing row hides them.
// - Editor, defense in depth: only for a location of the listing's own organization.
function mayShow(eb: ExpressionBuilder<DB & { f: DB['field_assertion'] }, 'f'>, audience: Audience) {
 return audience.kind === 'public'
  ? eb.exists(eb.selectFrom('location_access as la').select('la.location_id').whereRef('la.location_id','=','f.entity_id').where('la.confidential','=',false))
  : eb.exists(eb.selectFrom('location as loc').select('loc.id').whereRef('loc.id','=','f.entity_id').where('loc.organization_id','=',audience.organization_id));
}
// The accepted assertions of these locations that the audience may read: the SQL never selects a private field the audience may not see. Module-internal (S2-19); exported from this file only so tests can pin the SQL layer.
export function locationAssertions(db: Kysely<DB>, locationIds: readonly string[], audience: Audience) {
 return db.selectFrom('field_assertion as f').select(['f.entity_id','f.field_path','f.value']).select(eb => mayShow(eb, audience).as('shown'))
  .where('f.entity_type','=','location').where('f.entity_id','in',locationIds).where('f.status','=','accepted').where('f.field_path','in',['access','confidential',...privateFields])
  .where(eb => eb.or([eb('f.field_path','not in',privateFields), mayShow(eb, audience)]))
  .execute();
}
export async function listingParts(db: Kysely<DB>, serviceIds: readonly string[], audience: Audience): Promise<Map<string, ListingParts>> {
 // A public read survives a malformed stored value: it logs the entity id and field (never the value) and reads that part fail closed. An editor read throws, so an edit never saves "none" over a part it could not read.
 const read = <S extends z.ZodType>(schema: S, value: unknown, entity: string, path: string): z.output<S> | undefined => {
  if (audience.kind === 'editor') return schema.parse(value);
  const parsed = schema.safeParse(value);
  if (parsed.success) return parsed.data;
  console.warn(`listing parts: unreadable ${path} on ${entity}`);
  return undefined;
 };
 const parts = new Map<string, ListingParts>(serviceIds.map(id => [id, { service_area: null, phones: [], hours: null, locations: [] }]));
 if (!serviceIds.length) return parts;
 const services = await db.selectFrom('field_assertion').select(['entity_id','field_path','value']).where('entity_type','=','service').where('entity_id','in',serviceIds).where('field_path','in',['service_area','phones','hours','locations']).where('status','=','accepted').execute();
 const listed = new Map<string, string[]>();
 for (const f of services) {
  const p = parts.get(f.entity_id)!;
  if (f.field_path === 'service_area') p.service_area = read(serviceAreaValue.nullable(), f.value, f.entity_id, f.field_path) ?? null;
  else if (f.field_path === 'phones') p.phones = read(z.array(phoneValue).nullable(), f.value, f.entity_id, f.field_path) ?? [];
  else if (f.field_path === 'hours') p.hours = read(hoursValue, f.value, f.entity_id, f.field_path) ?? null;
  else listed.set(f.entity_id, read(idListValue, f.value, f.entity_id, f.field_path) ?? []);
 }
 const locationIds = [...new Set([...listed.values()].flat())];
 if (!locationIds.length) return parts;
 const values = new Map<string, Map<string, JsonValue>>(), shown = new Map<string, boolean>();
 for (const r of await locationAssertions(db, locationIds, audience)) {
  if (!values.has(r.entity_id)) values.set(r.entity_id, new Map());
  values.get(r.entity_id)!.set(r.field_path, r.value);
  shown.set(r.entity_id, Boolean(r.shown));
 }
 // A location without a readable access mode is left out. A missing flag reads as confidential, and so does a location with an unreadable field or one whose private fields this audience may not see. The public sees no private field of a confidential location; an editor sees them for the organization's own locations.
 const location = (id: string): ListingLocation[] => {
  const value = (path: string) => values.get(id)?.get(path) ?? null;
  const mode = read(access, value('access'), id, 'access');
  if (mode === undefined) return [];
  const fields = read(locationFields, { confidential: value('confidential'), name: value('name'), address: value('address'), coordinates: value('coordinates') }, id, 'location');
  const visible = shown.get(id) === true, confidential = fields?.confidential !== false || !visible;
  if (!fields || !visible || (audience.kind === 'public' && confidential)) return [{ id, access: mode, confidential: true, name: null, address: null, coordinates: null }];
  return [{ id, access: mode, confidential, name: fields.name, address: fields.address, coordinates: fields.coordinates }];
 };
 for (const [serviceId, ids] of listed) parts.get(serviceId)!.locations = ids.flatMap(location);
 return parts;
}
