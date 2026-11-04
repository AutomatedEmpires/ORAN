import { z } from 'zod';
// The values of a listing's parts (phones, hours, service area, locations). Pure: no database. Where a rule also exists as a named CHECK, this schema agrees with it. The limits, patterns and messages are exported so the form can enforce the same rules in the browser.
export const usStates: readonly string[] = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC','AS','GU','MP','PR','VI'];
export const usTimeZones = ['America/New_York','America/Chicago','America/Denver','America/Phoenix','America/Los_Angeles','America/Anchorage','Pacific/Honolulu','America/Puerto_Rico','Pacific/Guam','Pacific/Pago_Pago'] as const;
export const weekDays = ['MO','TU','WE','TH','FR','SA','SU'] as const;
export type UsTimeZone = typeof usTimeZones[number];
export type WeekDay = typeof weekDays[number];
const locationAccesses = ['physical','remote','phone'] as const;
export type LocationAccess = typeof locationAccesses[number];
export const listingOptions = { states: usStates, timeZones: usTimeZones, days: weekDays };
export type ListingOptions = typeof listingOptions;
// Pattern sources are anchored, so each works as an HTML `pattern` attribute (which matches the whole value) and with `new RegExp`. `letter` needs the `s` flag in `new RegExp` so a line break does not hide a letter.
export const partPatterns = { time: '^([01][0-9]|2[0-3]):[0-5][0-9]$', zip: '^[0-9]{5}$', postalCode: '^[0-9]{5}(-[0-9]{4})?$', letter: '^.*\\p{L}.*$' } as const;
export const partLimits = {
 extension: { min: 1, max: 99999 }, weeklyRows: { min: 1, max: 21 }, exceptions: { max: 20 }, note: { max: 120 }, zipCodes: { min: 1, max: 100 }, areaName: { min: 2, max: 100 },
 address1: { min: 3, max: 150 }, address2: { max: 150 }, city: { min: 2, max: 100 }, locationName: { max: 150 },
 latitude: { min: -90, max: 90 }, longitude: { min: -180, max: 180 }, date: { min: '0001-01-01' },
} as const;
export const partMessages = {
 phone: 'Use a US phone number', time: 'Use a 24-hour time such as 09:00', date: 'Use a date such as 2026-12-25', sameTimes: 'Opening and closing times must be different',
 endBeforeStart: 'The last date cannot be before the first date', oneTime: 'Give both times, or leave both empty for a closed day', zip: 'Use five-digit ZIP codes', placeName: 'Use the name of a place',
 postalCode: 'Use a five-digit ZIP code or ZIP+4', location: 'A physical location needs an address; remote and phone locations have no address, coordinates or privacy flag',
} as const;
const shortCodes = new Set(['211', '311', '511', '711', '811', '988']);
// A US phone number as people type it, as '+1NXXNXXXXXX' or a hotline short code; null when it is neither. Only digits, spaces and ( ) - . are read, after at most one leading '+', which must be followed by country code 1, so letters and other countries never become a US number. Accepts its own output.
export function normalizePhone(raw: string): string | null {
 const typed = raw.trim();
 if (!/^\+?[0-9 ().-]*$/.test(typed)) return null;
 const digits = typed.replace(/\D/g, '');
 if (typed.startsWith('+') && !digits.startsWith('1')) return null;
 if (shortCodes.has(digits)) return digits;
 const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
 return /^[2-9][0-9]{2}[2-9][0-9]{6}$/.test(national) ? `+1${national}` : null;
}
export function formatPhone(number: string): string {
 const m = /^\+1([0-9]{3})([0-9]{3})([0-9]{4})$/.exec(number);
 return m ? `(${m[1]}) ${m[2]}-${m[3]}` : number;
}
export const phoneValue = z.object({
 number: z.string().transform((raw, ctx) => {
  const number = normalizePhone(raw);
  if (number === null) { ctx.addIssue({ code: 'custom', message: partMessages.phone }); return z.NEVER; }
  return number;
 }),
 extension: z.number().int().min(partLimits.extension.min).max(partLimits.extension.max).nullable(),
});
export type PhoneValue = z.output<typeof phoneValue>;
const time = z.string().regex(new RegExp(partPatterns.time), partMessages.time);
// Postgres has no year 0, and 'YYYY-MM-DD' text sorts as dates do, so the lower limit is a string comparison.
const date = z.iso.date(partMessages.date).refine(d => d >= partLimits.date.min, partMessages.date);
const weeklyRow = z.object({ day: z.enum(weekDays), opens_at: time, closes_at: time })
 .refine(r => r.opens_at !== r.closes_at, { message: partMessages.sameTimes, path: ['closes_at'] });
// A dated exception: closed on these dates (both times null) or open different hours (both set). `from` and `to` stay 'YYYY-MM-DD' text, which sorts as dates do.
const hoursException = z.object({ from: date, to: date, opens_at: time.nullable(), closes_at: time.nullable(), note: z.string().trim().max(partLimits.note.max) }).superRefine((e, ctx) => {
 if (e.to < e.from) ctx.addIssue({ code: 'custom', path: ['to'], message: partMessages.endBeforeStart });
 if ((e.opens_at === null) !== (e.closes_at === null)) ctx.addIssue({ code: 'custom', path: [e.opens_at === null ? 'opens_at' : 'closes_at'], message: partMessages.oneTime });
 else if (e.opens_at !== null && e.opens_at === e.closes_at) ctx.addIssue({ code: 'custom', path: ['closes_at'], message: partMessages.sameTimes });
});
// Closing earlier than opening means the next day (an overnight shelter). The time zone is the only guard on `time_zone`: the database does not check it.
export const hoursValue = z.discriminatedUnion('kind', [
 z.object({ kind: z.literal('always_open') }),
 z.object({ kind: z.literal('by_appointment') }),
 z.object({ kind: z.literal('weekly'), time_zone: z.enum(usTimeZones), weekly: z.array(weeklyRow).min(partLimits.weeklyRows.min).max(partLimits.weeklyRows.max), exceptions: z.array(hoursException).max(partLimits.exceptions.max) }),
]).nullable();
export type HoursValue = NonNullable<z.output<typeof hoursValue>>;
const stateCode = z.enum(usStates);
const placeName = z.string().trim().min(partLimits.areaName.min).max(partLimits.areaName.max).regex(new RegExp(partPatterns.letter, 'us'), partMessages.placeName);
const zipCode = z.string().trim().regex(new RegExp(partPatterns.zip), partMessages.zip);
export const serviceAreaValue = z.discriminatedUnion('kind', [
 z.object({ kind: z.literal('zip'), postal_codes: z.array(zipCode).min(partLimits.zipCodes.min).max(partLimits.zipCodes.max).transform(codes => [...new Set(codes)].sort()) }),
 z.object({ kind: z.literal('city'), name: placeName, state: stateCode }),
 z.object({ kind: z.literal('county'), name: placeName, state: stateCode }),
 z.object({ kind: z.literal('state'), state: stateCode }),
 z.object({ kind: z.literal('nationwide') }),
]);
export type ServiceAreaValue = z.output<typeof serviceAreaValue>;
// The HSDS service_area rows a value is written as: ZIP gets one row per code, every other kind one row.
export function areaRows(area: ServiceAreaValue): { name: string; extent: string; kind: ServiceAreaValue['kind'] }[] {
 switch (area.kind) {
  case 'zip': return area.postal_codes.map(code => ({ name: `ZIP ${code}`, extent: code, kind: area.kind }));
  case 'city':
  case 'county': { const place = `${area.name}, ${area.state}`; return [{ name: place, extent: place, kind: area.kind }]; }
  case 'state': return [{ name: area.state, extent: area.state, kind: area.kind }];
  case 'nationwide': return [{ name: 'United States', extent: 'US', kind: area.kind }];
 }
}
export const addressValue = z.object({
 address_1: z.string().trim().min(partLimits.address1.min).max(partLimits.address1.max),
 address_2: z.string().trim().max(partLimits.address2.max).transform(v => v === '' ? null : v).nullable(),
 city: z.string().trim().min(partLimits.city.min).max(partLimits.city.max),
 state_province: stateCode,
 postal_code: z.string().trim().regex(new RegExp(partPatterns.postalCode), partMessages.postalCode),
});
export type AddressValue = z.output<typeof addressValue>;
// Only a physical location has an address, coordinates (optional, never geocoded) and the confidential flag.
export const locationInput = z.object({
 id: z.uuid().optional(),
 access: z.enum(locationAccesses),
 confidential: z.boolean().optional(),
 name: z.string().trim().max(partLimits.locationName.max).transform(v => v === '' ? null : v).nullable().default(null),
 address: addressValue.nullable().default(null),
 coordinates: z.object({ latitude: z.number().min(partLimits.latitude.min).max(partLimits.latitude.max), longitude: z.number().min(partLimits.longitude.min).max(partLimits.longitude.max) }).nullable().default(null),
}).refine(l => l.access === 'physical' ? l.address !== null : l.address === null && l.coordinates === null && l.confidential !== true, { message: partMessages.location });
export type LocationValue = z.output<typeof locationInput>;
