// Stored times of day ("19:00") and calendar dates ("2026-12-25") are wall-clock values, not instants. They are formatted in UTC, so the server's time zone never shifts them.
export type Interval = { opens_at: string; closes_at: string };
export function wallClock(locale: string) {
 const clock = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
 const calendar = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
 const time = (value: string) => { const [h, m] = value.split(':').map(Number); return clock.format(Date.UTC(2000, 0, 1, h, m)); };
 const date = (value: string) => { const [y, m, d] = value.split('-').map(Number); return calendar.format(Date.UTC(y, m - 1, d)); };
 // "opens – closes". A closing time earlier than the opening time means the next morning, so it reads as written ("7:00 PM – 7:00 AM"). No times means `closed`.
 const interval = (opens: string | null, closes: string | null, closed: string) => opens && closes ? `${time(opens)} – ${time(closes)}` : closed;
 // One day's intervals, earliest opening first. 'HH:MM' text sorts as times do.
 const day = (rows: readonly Interval[], closed: string) => rows.length ? [...rows].sort((a, b) => a.opens_at < b.opens_at ? -1 : a.opens_at > b.opens_at ? 1 : 0).map(r => interval(r.opens_at, r.closes_at, closed)).join(', ') : closed;
 const range = (from: string, to: string) => from === to ? date(from) : `${date(from)} – ${date(to)}`;
 return { time, date, interval, day, range };
}
