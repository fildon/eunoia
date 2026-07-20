import type { MoodEntry } from "@/lib/moodEntries";
import { moodColor, moodEmoji } from "@/lib/moodColor";

function formatDate(dateStr: string): { day: string; monthYear: string } {
  const date = new Date(`${dateStr}T00:00:00`);
  return {
    day: date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }),
    monthYear: date.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    }),
  };
}

export function MoodHistoryList({ entries }: { entries: MoodEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No entries yet — log today&apos;s mood to get started.
      </p>
    );
  }

  const rows = entries.map((entry, index) => {
    const { day, monthYear } = formatDate(entry.entry_date);
    const previousMonthYear =
      index > 0 ? formatDate(entries[index - 1].entry_date).monthYear : null;
    return { entry, day, monthYear, showMonthHeader: monthYear !== previousMonthYear };
  });

  return (
    <div className="flex w-full max-w-md flex-col gap-1">
      {rows.map(({ entry, day, monthYear, showMonthHeader }) => {
        return (
          <div key={entry.id}>
            {showMonthHeader && (
              <h3 className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-gray-400 first:mt-0 dark:text-gray-500">
                {monthYear}
              </h3>
            )}
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg"
                style={{ backgroundColor: `${moodColor(entry.mood)}33` }}
              >
                {moodEmoji(entry.mood)}
              </span>
              <div className="flex flex-1 flex-col">
                <span className="text-sm text-gray-800 dark:text-gray-100">
                  {day}
                </span>
                {entry.tags.length > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {entry.tags.join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
