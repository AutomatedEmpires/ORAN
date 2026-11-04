import type { ExpressionBuilder, Kysely } from 'kysely';
import { z } from 'zod';
import type { DB } from '@/modules/platform';
import type { JsonValue } from './assertions';
import { idList } from './apply';
import { addressValue, hoursValue, locationInput, phoneValue, serviceAreaValue, type AddressValue, type HoursValue, type LocationAccess, type PhoneValue, type ServiceAreaValue } from './parts';
// The listing parts a read returns, from accepted assertions. A confidential location's address and coordinates never leave the server (ADR-0006 §1): only the 'editor' audience, which the caller has authorized, reads them.
export type ListingLocation = { id: string; access: LocationAccess; confidential: boolean; name: string | null; address: AddressValue | null; coordinates: { latitude: number; longitude: number } | null };
export type ListingParts = { service_area: ServiceAreaValue | null; phones: PhoneValue[]; hours: HoursValue | null; locations: ListingLocation[] };
const { access, name, coordinates } = locationInput.shape;
// Fail closed (S2-13, S2-17): a location is public only when its access row exists and says it is not confidential, so a missing row reads as confidential.
const accessRowIsPublic = (eb: ExpressionBuilder<DB & { f: DB['field_assertion'] }, 'f'>) => eb.exists(eb.selectFrom('location_access as la').select('la.location_id').whereRef('la.location_id','=','f.entity_id').where('la.confidential','=',false));
export async function listingParts(db: Kysely<DB>, serviceIds: readonly string[], audience: 'public' | 'editor'): Promise<Map<string, ListingParts>> {
 const parts = new Map<string, ListingParts>(serviceIds.map(id => [id, { service_area: null, phones: [], hours: null, locations: [] }]));
 if (!serviceIds.length) return parts;
 const services = await db.selectFrom('field_assertion').select(['entity_id','field_path','value']).where('entity_type','=','service').where('entity_id','in',serviceIds).where('field_path','in',['service_area','phones','hours','locations']).where('status','=','accepted').execute();
 const listed = new Map<string, string[]>();
 for (const f of services) {
  const p = parts.get(f.entity_id)!;
  if (f.field_path === 'service_area') p.service_area = serviceAreaValue.nullable().parse(f.value);
  else if (f.field_path === 'phones') p.phones = z.array(phoneValue).nullable().parse(f.value) ?? [];
  else if (f.field_path === 'hours') p.hours = hoursValue.parse(f.value);
  else listed.set(f.entity_id, idList(f.value));
 }
 const locationIds = [...new Set([...listed.values()].flat())];
 if (!locationIds.length) return parts;
 // A public read never selects a confidential location's address or coordinates.
 const rows = await db.selectFrom('field_assertion as f').select(['f.entity_id','f.field_path','f.value']).select(eb => accessRowIsPublic(eb).as('shown'))
  .where('f.entity_type','=','location').where('f.entity_id','in',locationIds).where('f.status','=','accepted').where('f.field_path','in',['access','confidential','name','address','coordinates'])
  .$if(audience === 'public', q => q.where(eb => eb.or([eb('f.field_path','not in',['address','coordinates']), accessRowIsPublic(eb)])))
  .execute();
 const values = new Map<string, Map<string, JsonValue>>(), shown = new Map<string, boolean>();
 for (const r of rows) {
  if (!values.has(r.entity_id)) values.set(r.entity_id, new Map());
  values.get(r.entity_id)!.set(r.field_path, r.value);
  shown.set(r.entity_id, Boolean(r.shown));
 }
 const location = (id: string): ListingLocation => {
  const value = (path: string) => values.get(id)?.get(path) ?? null;
  // A missing flag reads as confidential, and a public read also needs the access row to agree, so neither source alone can publish an address.
  const confidential = z.boolean().nullable().parse(value('confidential')) !== false || (audience === 'public' && shown.get(id) !== true), hidden = confidential && audience === 'public';
  return { id, access: access.parse(value('access')), confidential, name: name.parse(value('name')), address: hidden ? null : addressValue.nullable().parse(value('address')), coordinates: hidden ? null : coordinates.parse(value('coordinates')) };
 };
 for (const [serviceId, ids] of listed) parts.get(serviceId)!.locations = ids.map(location);
 return parts;
}
