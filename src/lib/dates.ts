// Due dates are stored as midnight UTC ("date only"). A task is overdue once the whole
// due day has passed, measured in UTC.

export function startOfTodayUtc(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Latest year the date picker offers. Keep in sync with MAX_YEAR in calendar.ts. */
export const MAX_DUE_YEAR = 2200;

/**
 * True when a due date is clearly in the past. The picker blocks past days using the visitor's own
 * calendar, which can lag UTC by up to a day (and lead it by up to a day), so the server allows one
 * day of slack instead of rejecting someone who is still on "today" in a time zone behind UTC.
 */
export function isDueDateInPast(date: Date, now: Date = new Date()): boolean {
  const cutoff = startOfTodayUtc(now).getTime() - 24 * 60 * 60 * 1000;
  return date.getTime() < cutoff;
}

/** Parses "YYYY-MM-DD" into a UTC midnight Date, or null if it is not a real calendar date. */
export function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

export function toDateInput(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

const dateFmt = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" });
export function formatDate(date: Date): string {
  return dateFmt.format(date);
}

export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return "just now";
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
