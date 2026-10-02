import type { MoodEntry } from "@/lib/moodEntries";
import { moodColor, moodEmoji } from "@/lib/moodColor";
import { formatDay, toDayNumber } from "@/lib/date";

function formatDate(dateStr: string): { day: string; monthYear: string } {
  const dayNumber = toDayNumber(dateStr);
  return {
    day: formatDay(dayNumber, { weekday: "short", month: "short", day: "numeric" }),
    monthYear: formatDay(dayNumber, { month: "long", year: "numeric" }),
  };
}

export function MoodHistoryList({ entries }: { entries: MoodEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-sm text-muted">No entries yet. Log today&apos;s mood to get started.</p>;
  }

  // Entries arrive newest first, so consecutive runs share a month.
  const months: { monthYear: string; rows: { entry: MoodEntry; day: string }[] }[] = [];
  for (const entry of entries) {
    const { day, monthYear } = formatDate(entry.entry_date);
    const current = months[months.length - 1];
    if (current?.monthYear === monthYear) {
      current.rows.push({ entry, day });
    } else {
      months.push({ monthYear, rows: [{ entry, day }] });
    }
  }

  return (
    <div className="flex w-full max-w-xl flex-col gap-8">
      {months.map(({ monthYear, rows }) => (
        <section key={monthYear} className="flex flex-col gap-3">
          <h2 className="eyebrow">{monthYear}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[14px] border border-line bg-surface">
            {rows.map(({ entry, day }) => (
              <li key={entry.id} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-lg"
                  style={{ backgroundColor: `${moodColor(entry.mood)}33` }}
                  role="img"
                  aria-label={`Mood ${entry.mood}`}
                >
                  <span aria-hidden="true">{moodEmoji(entry.mood)}</span>
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm text-ink">{day}</span>
                  {entry.tags.length > 0 && (
                    <span className="truncate text-xs text-muted">{entry.tags.join(", ")}</span>
                  )}
                </div>
                <span className="font-mono text-sm tabular-nums text-muted" aria-hidden="true">
                  {entry.mood}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
