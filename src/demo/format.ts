import type { Cents, ISODate, Stamp } from "./types";

/* The business date for repeatable demos. Everything relative ("last Friday",
   "14 days overdue", "due in 7 days") is worked out from this day. */
export const TODAY: ISODate = "2026-11-23";
export const TZ = "Europe/Dublin";

const DAY_MS = 86400000;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DOW_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MON_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const parts = (d: ISODate) => {
  const [y, m, dd] = d.slice(0, 10).split("-").map(Number);
  return { y, m, d: dd };
};
const utc = (d: ISODate) => {
  const p = parts(d);
  return Date.UTC(p.y, p.m - 1, p.d);
};

export function addDays(d: ISODate, n: number): ISODate {
  return new Date(utc(d) + n * DAY_MS).toISOString().slice(0, 10);
}
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((utc(a) - utc(b)) / DAY_MS);
}
export function dow(d: ISODate): number {
  return new Date(utc(d)).getUTCDay();
}
export function isWeekday(d: ISODate) {
  const w = dow(d);
  return w > 0 && w < 6;
}
export function monthOf(d: ISODate) {
  return d.slice(0, 7);
}
export function monthName(d: ISODate) {
  return MON_LONG[parts(d).m - 1];
}

/** "Fri 20 Nov" */
export function dShort(d?: ISODate) {
  if (!d) return "";
  const p = parts(d);
  return DOW[dow(d)] + " " + p.d + " " + MON[p.m - 1];
}
/** "20 Nov" */
export function dDayMon(d?: ISODate) {
  if (!d) return "";
  const p = parts(d);
  return p.d + " " + MON[p.m - 1];
}
/** "20 Nov 2026" */
export function dMed(d?: ISODate) {
  if (!d) return "";
  const p = parts(d);
  return p.d + " " + MON[p.m - 1] + " " + p.y;
}
/** "Friday 20 November 2026" */
export function dLong(d?: ISODate) {
  if (!d) return "";
  const p = parts(d);
  return DOW_LONG[dow(d)] + " " + p.d + " " + MON_LONG[p.m - 1] + " " + p.y;
}
/** "9–20 Nov" for a run of dates */
export function dRange(dates: ISODate[]) {
  if (!dates.length) return "";
  const s = [...dates].sort();
  const a = parts(s[0]), b = parts(s[s.length - 1]);
  if (s.length === 1) return dDayMon(s[0]);
  if (a.m === b.m) return a.d + "–" + b.d + " " + MON[b.m - 1];
  return dDayMon(s[0]) + " – " + dDayMon(s[s.length - 1]);
}
export function stampDate(s: Stamp): ISODate {
  return s.slice(0, 10);
}
export function stampTime(s: Stamp) {
  return s.slice(11, 16);
}
/** "Mon 23 Nov · 17:30" */
export function stampLabel(s: Stamp) {
  return dShort(stampDate(s)) + " · " + stampTime(s);
}
/** "Today 17:30", "Yesterday", "Fri 20 Nov" */
export function stampRelative(s: Stamp) {
  const d = stampDate(s);
  const gap = diffDays(TODAY, d);
  if (gap === 0) return "Today " + stampTime(s);
  if (gap === 1) return "Yesterday " + stampTime(s);
  return dShort(d);
}

/** Real wall-clock time in Dublin, used for the greeting and for stamping
    actions taken during the demo (on the fixed business date). */
export function dublinNow() {
  const f = new Intl.DateTimeFormat("en-IE", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const [h, m] = f.format(new Date()).split(":").map(Number);
  return { h, m, hm: String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") };
}
export function nowStamp(): Stamp {
  return TODAY + "T" + dublinNow().hm;
}
export function greeting() {
  const { h } = dublinNow();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

const nf0 = new Intl.NumberFormat("en-IE", { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
/** "€6,640" or "€12.50" */
export function euro(c: Cents) {
  const neg = c < 0;
  const abs = Math.abs(c);
  const s = abs % 100 === 0 ? nf0.format(abs / 100) : nf2.format(abs / 100);
  return (neg ? "−€" : "€") + s;
}
/** "+€2,127" */
export function euroSigned(c: Cents) {
  return (c >= 0 ? "+" : "") + euro(c);
}
export function hours(h: number) {
  return (Number.isInteger(h) ? String(h) : h.toFixed(1)) + " h";
}
export function num(n: number) {
  return nf0.format(n);
}
/** Parse "400", "€1,040.50" into cents. NaN when unreadable. */
export function parseEuro(s: string): Cents {
  const clean = s.replace(/[€,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return NaN;
  return Math.round(parseFloat(clean) * 100);
}

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
export function words(n: number) {
  return n >= 0 && n <= 20 && Number.isInteger(n) ? WORDS[n] : String(n);
}
export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export function plural(n: number, one: string, many?: string) {
  return n + " " + (n === 1 ? one : many || one + "s");
}
