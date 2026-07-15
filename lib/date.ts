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
