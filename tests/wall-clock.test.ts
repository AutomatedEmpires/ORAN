import { afterEach,describe,it,expect } from 'vitest';
import { wallClock } from '@/ui/listing-format';
// Pure value tests: no database. A stored "19:00" or "2026-12-25" must read the same whatever time zone the server runs in. Node applies a changed process.env.TZ at once, and the formatters are built after it is set.
const serverZones = ['America/Los_Angeles','Asia/Tokyo','Pacific/Kiritimati','Pacific/Pago_Pago','UTC'];
const original = process.env.TZ;
afterEach(() => { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; });
// ICU puts a narrow no-break space before AM/PM; compare with plain spaces.
const plain = (text:string) => text.replace(/\s/g,' ');
describe.each(serverZones)('with the server in %s',zone => {
 it('shows times and dates in English as stored',() => {
  process.env.TZ = zone;
  const en = wallClock('en');
  expect(plain(en.interval('19:00','07:00','Closed'))).toBe('7:00 PM – 7:00 AM');
  expect(plain(en.interval('09:00','17:00','Closed'))).toBe('9:00 AM – 5:00 PM');
  // Midnight and the first of January are where a shifted zone would change the day.
  expect(plain(en.time('00:00'))).toBe('12:00 AM');
  expect(plain(en.time('23:59'))).toBe('11:59 PM');
  expect(en.date('2026-12-25')).toBe('Dec 25, 2026');
  expect(en.date('2026-01-01')).toBe('Jan 1, 2026');
  expect(en.date('2026-12-31')).toBe('Dec 31, 2026');
 });
 it('shows times and dates in Spanish as stored',() => {
  process.env.TZ = zone;
  const es = wallClock('es');
  expect(plain(es.interval('19:00','07:00','Cerrado'))).toBe('19:00 – 7:00');
  expect(plain(es.interval('09:00','17:00','Cerrado'))).toBe('9:00 – 17:00');
  expect(plain(es.time('00:00'))).toBe('0:00');
  expect(es.date('2026-12-25')).toBe('25 dic 2026');
  expect(es.date('2026-01-01')).toBe('1 ene 2026');
  expect(es.range('2026-12-24','2026-12-26')).toBe('24 dic 2026 – 26 dic 2026');
 });
});
describe('intervals and ranges',() => {
 const en = wallClock('en');
 it('reads no times as the given closed text',() => {
  expect(en.interval(null,null,'Closed')).toBe('Closed');
  expect(en.day([],'Closed')).toBe('Closed');
 });
 it('joins several intervals on one day, earliest opening first',() => {
  const rows = [{opens_at:'18:00',closes_at:'21:00'},{opens_at:'09:00',closes_at:'12:00'},{opens_at:'13:30',closes_at:'17:00'}];
  expect(plain(en.day(rows,'Closed'))).toBe('9:00 AM – 12:00 PM, 1:30 PM – 5:00 PM, 6:00 PM – 9:00 PM');
  expect(rows.map(r => r.opens_at)).toEqual(['18:00','09:00','13:30']);
 });
 it('keeps an overnight interval as written when sorting',() => {
  expect(plain(en.day([{opens_at:'19:00',closes_at:'07:00'},{opens_at:'08:00',closes_at:'09:00'}],'Closed'))).toBe('8:00 AM – 9:00 AM, 7:00 PM – 7:00 AM');
 });
 it('shows a one-day range as one date and a longer range with both ends',() => {
  expect(en.range('2026-12-25','2026-12-25')).toBe('Dec 25, 2026');
  expect(en.range('2026-12-24','2026-12-26')).toBe('Dec 24, 2026 – Dec 26, 2026');
 });
});
