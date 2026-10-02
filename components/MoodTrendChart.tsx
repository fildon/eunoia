"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  usePlotArea,
  useXAxisScale,
  useYAxisScale,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDailySeries,
  getWeekdayAverages,
  type DailyMoodPoint,
  type MoodEntry,
} from "@/lib/moodEntries";
import { moodColor } from "@/lib/moodColor";
import { fromDayNumber, getMondayFirstWeekday, toDayNumber } from "@/lib/date";

const ROLLING_WINDOW_DAYS = 7;

function formatDayNumber(day: number, options: Intl.DateTimeFormatOptions): string {
  return new Date(`${fromDayNumber(day)}T00:00:00`).toLocaleDateString(undefined, options);
}

const RANGE_OPTIONS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "All", days: null },
] as const;

type RangeLabel = (typeof RANGE_OPTIONS)[number]["label"];

// X-axis ticks at fixed calendar boundaries (rather than every Nth data
// point), coarsening as the range grows so labels don't crowd.
function getCalendarTicks(
  startDay: number,
  endDay: number,
): { ticks: number[]; format: (day: number) => string } {
  const span = endDay - startDay + 1;
  const days = Array.from({ length: span }, (_, i) => startDay + i);
  const shortDate = (day: number) => formatDayNumber(day, { month: "short", day: "numeric" });
  const monthYear = (day: number) => formatDayNumber(day, { month: "short", year: "2-digit" });

  if (span <= 10) {
    return { ticks: days, format: shortDate };
  }
  if (span <= 45) {
    return {
      ticks: days.filter((day) => getMondayFirstWeekday(fromDayNumber(day)) === 0),
      format: shortDate,
    };
  }
  const monthStarts = days.filter((day) => fromDayNumber(day).endsWith("-01"));
  if (span <= 200) {
    return { ticks: monthStarts, format: monthYear };
  }
  const quarterStarts = monthStarts.filter((day) =>
    ["01", "04", "07", "10"].includes(fromDayNumber(day).slice(5, 7)),
  );
  if (span <= 800) {
    return { ticks: quarterStarts, format: monthYear };
  }
  return {
    ticks: quarterStarts.filter((day) => fromDayNumber(day).slice(5, 7) === "01"),
    format: (day) => formatDayNumber(day, { year: "numeric" }),
  };
}

// The Y domain is padded past [1, 5] and the X axis past the first/last
// day so that dots at the edges of the chart aren't clipped by the plot
// area — see MoodTrendChart. That padding would otherwise stretch the grid
// (and the Y axis's own line, rendered separately below) past the data's
// actual range, so this bounds both to the real [1, 5] / first-to-last-day
// extent using the chart's own scales. The YAxis element itself renders
// with `axisLine={false}` so only this trimmed line shows.
function MoodOverTimeAxisLines({ firstDay, lastDay }: { firstDay: number; lastDay: number }) {
  const xScale = useXAxisScale();
  const yScale = useYAxisScale();
  const plotArea = usePlotArea();
  const gridProps = {
    strokeDasharray: "3 3",
    stroke: "#9ca3af",
    strokeOpacity: 0.3,
    // Without this, CartesianGrid also draws a line at the axis's min/max
    // pixel extent (the padded domain edges), on top of one at each tick.
    syncWithTicks: true,
  };

  if (!xScale || !yScale || !plotArea) {
    return <CartesianGrid {...gridProps} />;
  }

  const x1 = xScale(firstDay);
  const x2 = xScale(lastDay);
  const y1 = yScale(5);
  const y2 = yScale(1);

  if (x1 === undefined || x2 === undefined || y1 === undefined || y2 === undefined) {
    return <CartesianGrid {...gridProps} />;
  }

  const gridX = Math.min(x1, x2);
  const gridY = Math.min(y1, y2);
  const gridWidth = Math.abs(x2 - x1);
  const gridHeight = Math.abs(y2 - y1);

  return (
    <>
      <CartesianGrid {...gridProps} x={gridX} y={gridY} width={gridWidth} height={gridHeight} />
      {/* Bottom stays at the actual axis intercept (the padded domain's
          floor) rather than gridY + gridHeight (value 1), so the Y axis
          still visibly meets the X axis in the corner. */}
      <line x1={plotArea.x} y1={gridY} x2={plotArea.x} y2={plotArea.y + plotArea.height} stroke="#666" />
    </>
  );
}

// Shared tooltip content for every chart on this page, so they all read
// consistently instead of each relying on Recharts' default styling (whose
// label/item text colors come from each series' own stroke/fill — fragile,
// and unreadable against its fixed white background in the wrong case).
// When a series' underlying data row carries a `count` (the tag/weekday
// average charts), it's shown alongside the value so a bar's sample size is
// visible at a glance.
function ChartTooltip({ active, payload, label }: TooltipContentProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md dark:border-gray-700 dark:bg-gray-800">
      {label !== undefined && (
        <p className="mb-1 font-medium text-gray-900 dark:text-gray-100">{label}</p>
      )}
      <ul className="flex flex-col gap-0.5">
        {payload.map((entry, index) => {
          const row = entry.payload as { count?: number } | undefined;
          const count = row?.count;
          return (
            <li
              key={index}
              className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300"
            >
              {entry.color && (
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
              )}
              <span>
                {entry.name}: {entry.value}
                {typeof count === "number" && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {" "}
                    ({count} {count === 1 ? "entry" : "entries"})
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// The mood-over-time chart has one row per calendar day, so it gets its own
// tooltip: it names missed days explicitly and shows how many days a
// rolling average actually covers. It looks the row up by the hovered day
// (the axis label) because Recharts drops null values from `payload`.
function MoodOverTimeTooltip({
  active,
  label,
  payload,
  pointsByDay,
}: TooltipContentProps & { pointsByDay: Map<number, DailyMoodPoint> }) {
  const point =
    (typeof label === "number" ? pointsByDay.get(label) : undefined) ??
    (payload?.[0]?.payload as DailyMoodPoint | undefined);
  if (!active || !point) {
    return null;
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md dark:border-gray-700 dark:bg-gray-800">
      <p className="mb-1 font-medium text-gray-900 dark:text-gray-100">
        {formatDayNumber(point.day, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
      </p>
      <ul className="flex flex-col gap-0.5">
        <li className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          {point.mood === null ? (
            <span className="text-gray-500 dark:text-gray-400">No entry</span>
          ) : (
            <>
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: moodColor(point.mood) }}
              />
              <span>Mood: {point.mood}</span>
            </>
          )}
        </li>
        {point.avg !== null && (
          <li className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-gray-600" />
            <span>
              {ROLLING_WINDOW_DAYS}-day avg: {point.avg}
              <span className="text-gray-500 dark:text-gray-400">
                {" "}
                ({point.avgCount} of {ROLLING_WINDOW_DAYS} days)
              </span>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}

export function MoodTrendChart({
  entries,
  today,
}: {
  entries: MoodEntry[];
  // Today's date in the user's time zone (see lib/timeZone.ts), passed from
  // the server so server and client render the same range.
  today: string;
}) {
  const [selectedRange, setSelectedRange] = useState<RangeLabel>("30d");

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 dark:text-gray-400">
        No entries yet — log a few days of mood to see trends here.
      </p>
    );
  }

  const selectedOption = RANGE_OPTIONS.find((option) => option.label === selectedRange)!;

  // Ranges are calendar-bounded: "7d" is today and the 6 days before it,
  // however many of those have entries. The end is normally today, but can
  // be later if an entry was logged in a time zone that's ahead of this one.
  const entryDays = entries.map((entry) => toDayNumber(entry.entry_date));
  const endDay = Math.max(toDayNumber(today), ...entryDays);
  const startDay =
    selectedOption.days === null
      ? Math.min(endDay, ...entryDays)
      : toDayNumber(today) - (selectedOption.days - 1);

  const visibleEntries = entries.filter((entry) => {
    const day = toDayNumber(entry.entry_date);
    return day >= startDay && day <= endDay;
  });

  // Built from full history (not visibleEntries) so days near the start of
  // the range still get a correct trailing average using days before it.
  const chartData = getDailySeries(entries, startDay, endDay, ROLLING_WINDOW_DAYS);
  const pointsByDay = new Map(chartData.map((point) => [point.day, point]));
  const xTicks = getCalendarTicks(startDay, endDay);

  const uniqueTags = Array.from(new Set(visibleEntries.flatMap((e) => e.tags)));
  const tagAverages = uniqueTags
    .map((tag) => {
      const withTag = visibleEntries.filter((e) => e.tags.includes(tag));
      const average = withTag.reduce((sum, e) => sum + e.mood, 0) / withTag.length;
      return { tag, average: Number(average.toFixed(2)), count: withTag.length };
    })
    .sort((a, b) => b.count - a.count);

  const weekdayAverages = getWeekdayAverages(visibleEntries);

  const axisTick = { fontSize: 12, fill: "#6b7280" };

  return (
    <div className="flex w-full max-w-2xl flex-col gap-10">
      <div role="group" aria-label="Time range" className="flex gap-1 self-start">
        {RANGE_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={selectedRange === option.label}
            onClick={() => setSelectedRange(option.label)}
            className={`rounded-md px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
              selectedRange === option.label
                ? "font-medium text-blue-600 dark:text-blue-400"
                : "text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {visibleEntries.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No entries in the selected range — try a wider range.
        </p>
      ) : (
        <>
          <div>
            <h2 className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
              Mood over time
            </h2>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 8, left: -20 }}>
                <MoodOverTimeAxisLines firstDay={startDay} lastDay={endDay} />
                <XAxis
                  dataKey="day"
                  type="number"
                  domain={[startDay, endDay]}
                  ticks={xTicks.ticks}
                  tickFormatter={xTicks.format}
                  tick={axisTick}
                  padding={{ left: 12, right: 12 }}
                />
                <YAxis
                  domain={[0.5, 5.5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={axisTick}
                  axisLine={false}
                />
                <Tooltip
                  content={(props) => (
                    <MoodOverTimeTooltip {...props} pointsByDay={pointsByDay} />
                  )}
                />
                {/* No connectNulls: the average only breaks where a whole
                    7-day window has no entries, and that gap should show. */}
                <Line
                  type="monotone"
                  dataKey="avg"
                  stroke="#4b5563"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="mood"
                  stroke="#9ca3af"
                  strokeOpacity={0}
                  isAnimationActive={false}
                  dot={(props: {
                    cx?: number;
                    cy?: number;
                    payload?: DailyMoodPoint;
                    key?: React.Key | null;
                  }) => {
                    const { cx, cy, payload, key } = props;
                    // Missed days have a null mood and get no dot.
                    if (cx == null || cy == null || payload?.mood == null) {
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
                  <Tooltip content={ChartTooltip} />
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
                <Tooltip content={ChartTooltip} />
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
        </>
      )}
    </div>
  );
}
