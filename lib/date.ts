export const DEFAULT_TIME_ZONE = "Europe/Amsterdam";
export const TIME_ZONE_COOKIE = "tz";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Formats a Date as a local YYYY-MM-DD string (not UTC), so "today" matches
// the user's wall-clock day rather than shifting at UTC midnight.
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// With no timeZone this is the runtime's own local day — right in the
// browser, but UTC on the server. Server code must pass the user's zone
// (see getRequestToday in lib/timeZone.ts).
export function todayDateString(timeZone?: string): string {
  if (!timeZone) return toDateString(new Date());
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

// Entry dates are plain calendar days with no time zone attached, so all
// date arithmetic goes through these integer day numbers (days since
// 1970-01-01). Unlike stepping a local Date by 24h, this can't drift across
// a DST change.
export function toDayNumber(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
}

export function fromDayNumber(dayNumber: number): string {
  const date = new Date(dayNumber * MS_PER_DAY);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Fixed English abbreviations in Monday-first order — intentionally not
// locale-derived (unlike formatDisplayDate above), since callers need exact
// labels and ordering regardless of browser locale.
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

// Returns 0-6 where 0=Monday..6=Sunday for a "YYYY-MM-DD" entry_date string.
export function getMondayFirstWeekday(dateStr: string): number {
  // Day 0 (1970-01-01) was a Thursday, i.e. index 3 Monday-first.
  return (((toDayNumber(dateStr) + 3) % 7) + 7) % 7;
}
