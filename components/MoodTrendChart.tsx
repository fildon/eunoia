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
import { getWeekdayAverages, type MoodEntry } from "@/lib/moodEntries";
import { moodColor } from "@/lib/moodColor";

function formatShortDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function TooltipCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm shadow-md dark:border-gray-700 dark:bg-gray-800">
      {children}
    </div>
  );
}

function TooltipTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 font-semibold text-gray-900 dark:text-gray-50">{children}</p>
  );
}

function MoodPointTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ payload: { mood: number } }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  return (
    <TooltipCard>
      <TooltipTitle>{label}</TooltipTitle>
      <p className="text-gray-700 dark:text-gray-200">Mood: {payload[0].payload.mood}</p>
    </TooltipCard>
  );
}

function AverageTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean;
  label?: string;
  payload?: Array<{ payload: { average: number | null; count: number } }>;
}) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }
  const { average, count } = payload[0].payload;
  return (
    <TooltipCard>
      <TooltipTitle>{label}</TooltipTitle>
      <p className="text-gray-700 dark:text-gray-200">
        Average: {average === null ? "—" : average}
      </p>
      <p className="text-gray-700 dark:text-gray-200">
        Total entries: {count}
      </p>
    </TooltipCard>
  );
}

export function MoodTrendChart({ entries }: { entries: MoodEntry[] }) {
  const chartData = [...entries]
    .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
    .map((entry) => ({
      date: formatShortDate(entry.entry_date),
      mood: entry.mood,
    }));

  const uniqueTags = Array.from(new Set(entries.flatMap((e) => e.tags)));
  const tagAverages = uniqueTags
    .map((tag) => {
      const withTag = entries.filter((e) => e.tags.includes(tag));
      const average = withTag.reduce((sum, e) => sum + e.mood, 0) / withTag.length;
      return { tag, average: Number(average.toFixed(2)), count: withTag.length };
    })
    .sort((a, b) => b.count - a.count);

  const weekdayAverages = getWeekdayAverages(entries);

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
            <Tooltip content={<MoodPointTooltip />} />
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
              <Tooltip content={<AverageTooltip />} />
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

      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
          Average mood by weekday
        </h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={weekdayAverages} margin={{ left: -20 }}>
            <XAxis dataKey="weekday" tick={axisTick} />
            <YAxis domain={[0, 5]} allowDecimals={false} tick={axisTick} />
            <Tooltip content={<AverageTooltip />} />
            <Bar dataKey="average" radius={[4, 4, 0, 0]}>
              {weekdayAverages.map((entry) => (
                <Cell
                  key={entry.weekday}
                  fill={entry.average === null ? "#9ca3af" : moodColor(Math.round(entry.average))}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
