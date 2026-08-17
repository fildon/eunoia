// Formats a Date as a local YYYY-MM-DD string (not UTC), so "today" matches
// the user's wall-clock day rather than shifting at UTC midnight.
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayDateString(): string {
  return toDateString(new Date());
}

export function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
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
  const date = new Date(`${dateStr}T00:00:00`);
  const jsDay = date.getDay(); // 0=Sun..6=Sat
  return (jsDay + 6) % 7; // 0=Mon..6=Sun
}
