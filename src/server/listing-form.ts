import { z } from 'zod';
import { weekDays } from '@/modules/catalog';
// Reads the long listing form into the input that resourceInput validates. Text is passed through as posted ('' stays ''): resourceInput trims it and turns empty optional text into null, and it decides what is valid. The parser only shapes the input, so a value it cannot read becomes one the schema rejects (an unknown kind, a lone coordinate as NaN) instead of being repaired here.
// Every part is always sent, and an empty one says "none", so a form must render each section on every edit: a form that left one out would clear that part.
const scalars = ['name', 'description', 'organization_name', 'url', 'eligibility_description', 'application_process', 'source_type', 'source_url', 'source_note'] as const;
const locationSlots = Array.from({ length: 10 }, (_, i) => i);
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
  // A day may have several rules (a lunch break), one per row, paired by position. A row is skipped only when both times are blank. A half-filled row is sent as typed, so the schema rejects it instead of it being saved as closed.
  const [opens, closes] = ['opens', 'closes'].map(edge => column(form, `hours_${day}_${edge}`));
  return Array.from({ length: Math.max(opens.length, closes.length) }, (_, i) => ({ day, opens_at: opens[i] ?? '', closes_at: closes[i] ?? '' })).filter(rule => !(blank(rule.opens_at) && blank(rule.closes_at)));
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
// The slots that hold a location. A slot that is unused ('none' or missing) or marked for removal is left out, which drops that location from the listing.
function usedSlots(form: FormData): number[] {
 return locationSlots.filter(i => { const access = text(form, `location_${i}_access`); return access !== '' && access !== 'none' && text(form, `location_${i}_remove`) !== 'on'; });
}
function locations(form: FormData): Record<string, unknown>[] {
 return usedSlots(form).map(i => {
  const field = (name: string) => text(form, `location_${i}_${name}`), access = field('access'), id = field('id');
  const physical = access === 'physical', [latitude, longitude] = [field('latitude'), field('longitude')];
  return {
   ...(id !== '' ? { id } : {}), access, name: field('name'),
   // Only a physical location has an address, coordinates and the confidential flag; whatever was typed for another kind is ignored.
   // The flag has three states: 'private', 'public', or not chosen. Not chosen leaves `confidential` out, so the server decides: a Safety listing's physical location is private, and an existing private one stays private.
   ...(physical ? privacy(field('confidential')) : { confidential: false }),
   address: physical ? { address_1: field('address_1'), address_2: field('address_2'), city: field('city'), state_province: field('state'), postal_code: field('postal_code') } : null,
   coordinates: physical && !(blank(latitude) && blank(longitude)) ? { latitude: numberOrNaN(latitude), longitude: numberOrNaN(longitude) } : null,
  };
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
// The field a rejection names: the top-level field of the first validation issue, as the form labels it. Any other error names no field.
// A location is numbered as the form shows it (its slot, counting removed ones) when the form is given, and by its place in the list otherwise. An issue about the list as a whole names no location.
export type FieldLabel = { key: 'name' | 'organizationName' | 'description' | 'categories' | 'website' | 'eligibility' | 'intake' | 'sourceType' | 'sourceUrl' | 'source' | 'serviceArea' | 'phoneNumber' | 'hours' | 'locationN'; n?: number };
const labels = new Map<PropertyKey, FieldLabel['key']>([
 ['name', 'name'], ['organization_name', 'organizationName'], ['organization_id', 'organizationName'], ['description', 'description'], ['categories', 'categories'], ['url', 'website'],
 ['eligibility_description', 'eligibility'], ['application_process', 'intake'], ['source_type', 'sourceType'], ['source_url', 'sourceUrl'], ['source_note', 'source'],
 ['service_area', 'serviceArea'], ['phones', 'phoneNumber'], ['hours', 'hours'], ['locations', 'locationN'],
]);
export function fieldLabel(error: unknown, form?: FormData): FieldLabel | null {
 if (!(error instanceof z.ZodError)) return null;
 const [segment, index] = error.issues[0]?.path ?? [], key = labels.get(segment as PropertyKey);
 if (key !== 'locationN') return key ? { key } : null;
 if (typeof index !== 'number') return null;
 return { key, n: (form ? usedSlots(form)[index] ?? index : index) + 1 };
}
