// A difference with an explicit sign, using a true minus sign.
export function signed(value: number, digits = 1): string {
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(digits)}`;
}

export function pluralDays(count: number): string {
  return `${count} ${count === 1 ? "day" : "days"}`;
}

// Monday-first, matching WEEKDAY_LABELS in lib/date.ts.
export const WEEKDAY_PLURALS = [
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
  "Sundays",
] as const;
