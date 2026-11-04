import { weekDays } from '@/modules/catalog';
// Reads the long listing form into the input that resourceInput validates. Text is passed through as posted ('' stays ''): resourceInput trims it and turns empty optional text into null, and it decides what is valid. The parser only shapes the input, so a value it cannot read becomes one the schema rejects (an unknown kind, a lone coordinate as NaN) instead of being repaired here.
// Every part is always sent, and an empty one says "none", so a form must render each section on every edit: a form that left one out would clear that part.
const scalars = ['name', 'description', 'organization_name', 'url', 'eligibility_description', 'application_process', 'source_type', 'source_url', 'source_note'] as const;
const locationSlots = 10;
const text = (form: FormData, name: string): string => String(form.get(name) ?? '');
const column = (form: FormData, name: string): string[] => form.getAll(name).map(String);
const blank = (value: string): boolean => value.trim() === '';
const nullIfBlank = (value: string): string | null => (blank(value) ? null : value);
const numberOrNaN = (value: string): number => (blank(value) ? NaN : Number(value));
// An extension is digits only: Number() would also read '1e3' as 1000 and '0x10' as 16, saving a number that was not typed. NaN fails validation.
const extensionNumber = (value: string): number | null => (blank(value) ? null : /^\d+$/.test(value.trim()) ? Number(value) : NaN);
function serviceArea(form: FormData): Record<string, unknown> {
 const kind = text(form, 'area_kind');
 switch (kind) {
  case 'zip': return { kind, postal_codes: text(form, 'area_postal_codes').split(/[\s,]+/).filter(Boolean) };
  case 'city':
  case 'county': return { kind, name: text(form, 'area_name'), state: text(form, 'area_state') };
  case 'state': return { kind, state: text(form, 'area_state') };
  default: return { kind };
 }
}
function phones(form: FormData): { number: string; extension: number | null }[] {
 const extensions = column(form, 'phone_extension');
 return column(form, 'phone_number').flatMap((number, i) => {
  const extension = extensions[i] ?? '';
  return blank(number) ? [] : [{ number, extension: extensionNumber(extension) }];
 });
}
function hours(form: FormData): Record<string, unknown> | null {
 const kind = text(form, 'hours_kind');
 if (kind === 'unknown') return null;
 if (kind !== 'weekly') return { kind };
 const weekly = weekDays.flatMap(day => {
  const opens_at = text(form, `hours_${day}_opens`), closes_at = text(form, `hours_${day}_closes`);
  // A day is skipped only when both times are blank. A half-filled day is sent as typed, so the schema rejects it instead of it being saved as closed.
  return blank(opens_at) && blank(closes_at) ? [] : [{ day, opens_at, closes_at }];
 });
 const [from, to, opens, closes, notes] = ['from', 'to', 'opens', 'closes', 'note'].map(field => column(form, `exception_${field}`));
 // A row without a first date is an unused row. A blank last date means a one-day exception, and a blank time means closed.
 const exceptions = from.flatMap((first, i) => {
  const last = to[i] ?? '';
  return blank(first) ? [] : [{ from: first, to: blank(last) ? first : last, opens_at: nullIfBlank(opens[i] ?? ''), closes_at: nullIfBlank(closes[i] ?? ''), note: notes[i] ?? '' }];
 });
 return { kind, time_zone: text(form, 'hours_time_zone'), weekly, exceptions };
}
const privacy = (choice: string): { confidential?: boolean } => (choice === 'private' ? { confidential: true } : choice === 'public' ? { confidential: false } : {});
function locations(form: FormData): Record<string, unknown>[] {
 return Array.from({ length: locationSlots }, (_, i) => i).flatMap(i => {
  const field = (name: string) => text(form, `location_${i}_${name}`), access = field('access'), id = field('id');
  // A slot that is unused ('none' or missing) or marked for removal is left out, which drops that location from the listing.
  if (access === '' || access === 'none' || field('remove') === 'on') return [];
  const physical = access === 'physical', [latitude, longitude] = [field('latitude'), field('longitude')];
  return [{
   ...(id !== '' ? { id } : {}), access, name: field('name'),
   // Only a physical location has an address, coordinates and the confidential flag; whatever was typed for another kind is ignored.
   // The flag has three states: 'private', 'public', or not chosen. Not chosen leaves `confidential` out, so the server decides: a Safety listing's physical location is private, and an existing private one stays private.
   ...(physical ? privacy(field('confidential')) : { confidential: false }),
   address: physical ? { address_1: field('address_1'), address_2: field('address_2'), city: field('city'), state_province: field('state'), postal_code: field('postal_code') } : null,
   coordinates: physical && !(blank(latitude) && blank(longitude)) ? { latitude: numberOrNaN(latitude), longitude: numberOrNaN(longitude) } : null,
  }];
 });
}
export function listingFromForm(form: FormData): Record<string, unknown> {
 const organization_id = text(form, 'organization_id');
 return {
  ...Object.fromEntries(scalars.map(name => [name, text(form, name)])),
  ...(organization_id !== '' ? { organization_id } : {}),
  categories: column(form, 'categories'), service_area: serviceArea(form), phones: phones(form), hours: hours(form), locations: locations(form),
 };
}
