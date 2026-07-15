"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MoodEntry } from "@/lib/moodEntries";
import { MOOD_TAGS } from "@/lib/tags";
import { moodColor } from "@/lib/moodColor";

function formatShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function MoodTrendChart({ entries }: { entries: MoodEntry[] }) {
  const chartData = [...entries]
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((entry) => ({
      date: formatShortDate(entry.entry_date),
      mood: entry.mood,
    }));

  const tagAverages = MOOD_TAGS.map((tag) => {
    const withTag = entries.filter((e) => e.tags.includes(tag.id));
    const average =
      withTag.length === 0
        ? 0
        : withTag.reduce((sum, e) => sum + e.mood, 0) / withTag.length;
    return { tag: tag.label, average: Number(average.toFixed(2)), count: withTag.length };
  }).filter((t) => t.count > 0);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No entries yet — log a few days of mood to see trends here.
      </p>
    );
  }

  const axisTick = { fontSize: 12, fill: "#6b7280" };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-10">
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
          Mood over time
        </h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={chartData} margin={{ left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af" strokeOpacity={0.3} />
            <XAxis dataKey="date" tick={axisTick} />
            <YAxis domain={[1, 5]} allowDecimals={false} tick={axisTick} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="mood"
              stroke="#9ca3af"
              strokeWidth={2}
              dot={(props: {
                cx?: number;
                cy?: number;
                payload?: { mood: number };
                key?: React.Key | null;
              }) => {
                const { cx, cy, payload, key } = props;
                if (cx === undefined || cy === undefined || !payload) {
                  return <g key={key ?? undefined} />;
                }
                return (
                  <circle
                    key={key ?? undefined}
                    cx={cx}
                    cy={cy}
                    r={4}
                    fill={moodColor(payload.mood)}
                    stroke="none"
                  />
                );
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {tagAverages.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
            Average mood by tag
          </h2>
          <ResponsiveContainer width="100%" height={Math.max(120, tagAverages.length * 40)}>
            <BarChart data={tagAverages} layout="vertical" margin={{ left: 10 }}>
              <XAxis type="number" domain={[0, 5]} tick={axisTick} />
              <YAxis dataKey="tag" type="category" width={90} tick={axisTick} />
              <Tooltip />
              <Bar dataKey="average" radius={[0, 4, 4, 0]}>
                {tagAverages.map((entry) => (
                  <Cell
                    key={entry.tag}
                    fill={moodColor(Math.round(entry.average))}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
