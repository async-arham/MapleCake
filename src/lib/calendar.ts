// Date helpers for the date picker. A "key" is a "YYYY-MM-DD" string. All maths is done in UTC,
// so there are no time zone surprises. Weeks start on Monday.

export const MIN_YEAR = 1900;
export const MAX_YEAR = 2200;

const pad = (n: number) => String(n).padStart(2, "0");

/** `month` is 0 to 11, like JavaScript dates. */
export function toKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

/** Returns null unless the text is a real calendar date. */
export function parseKey(key: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]) - 1;
  const d = Number(match[3]);
  const date = new Date(Date.UTC(y, m, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m && date.getUTCDate() === d ? { y, m, d } : null;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function addDays(key: string, days: number): string {
  const p = parseKey(key)!;
  const date = new Date(Date.UTC(p.y, p.m, p.d + days));
  return toKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** Moves by whole months and keeps the day inside the new month (31 Jan + 1 month = 28 Feb). */
export function moveByMonths(key: string, delta: number): string {
  const p = parseKey(key)!;
  const total = p.y * 12 + p.m + delta;
  const year = Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  return toKey(year, month, Math.min(p.d, daysInMonth(year, month)));
}

/** 0 = Monday ... 6 = Sunday. */
export function weekdayIndex(key: string): number {
  const p = parseKey(key)!;
  return (new Date(Date.UTC(p.y, p.m, p.d)).getUTCDay() + 6) % 7;
}

export type CalendarDay = { key: string; day: number; inMonth: boolean };

/** Always 6 full weeks (42 days), starting on the Monday on or before the 1st. */
export function monthGrid(year: number, month: number): CalendarDay[] {
  const lead = weekdayIndex(toKey(year, month, 1));
  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(Date.UTC(year, month, 1 - lead + i));
    return {
      key: toKey(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
    };
  });
}

export function formatKey(key: string): string {
  const p = parseKey(key);
  if (!p) return "";
  return new Intl.DateTimeFormat("en", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(p.y, p.m, p.d)));
}

export function monthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month, 1)));
}

/** Today on the visitor's own calendar. */
export function todayKey(now: Date = new Date()): string {
  return toKey(now.getFullYear(), now.getMonth(), now.getDate());
}
