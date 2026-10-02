"use client";

import { formatDay, fromDayNumber, getMondayFirstWeekday, WEEKDAY_LABELS } from "@/lib/date";
import { getWeekdayStats, moodsBetween, type EntriesByDay } from "@/lib/insights";
import { moodColor } from "@/lib/moodColor";
import { pluralDays, signed, WEEKDAY_PLURALS } from "./format";
import { tooltipProps } from "./HoverTooltip";
import { useElementWidth } from "./useElementWidth";

const LABEL_WIDTH = 32;
const STAT_WIDTH = 46;
const TOP = 20;
const GAP = 3;

// One square per day: weeks are columns (Monday at the top), so weekday
// rows and seasonal runs both show without a separate chart. The column on
// the right is each weekday's average relative to the range's average.
export function MoodCalendar({
  byDay,
  startDay,
  endDay,
}: {
  byDay: EntriesByDay;
  startDay: number;
  endDay: number;
}) {
  const [ref, width] = useElementWidth<HTMLDivElement>();

  const firstMonday = startDay - getMondayFirstWeekday(startDay);
  const weeks = Math.ceil((endDay - firstMonday + 1) / 7);
  // Fill the width, within limits; at phone width a long range scrolls
  // sideways inside the container rather than shrinking past legibility.
  const cell = Math.max(10, Math.min(28, Math.floor((width - LABEL_WIDTH - STAT_WIDTH) / weeks) - GAP));
  const pitch = cell + GAP;
  const svgWidth = LABEL_WIDTH + weeks * pitch + STAT_WIDTH;
  const svgHeight = TOP + 7 * pitch;
  const columnX = (day: number) => LABEL_WIDTH + Math.floor((day - firstMonday) / 7) * pitch;
  const rowY = (weekday: number) => TOP + weekday * pitch;

  const days = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);

  // Month labels at each month's first column, skipping any that would
  // collide with the previous label or the stats column header.
  const monthLabels: { x: number; text: string }[] = [];
  let lastLabelEnd = -Infinity;
  for (const day of days) {
    const isoDate = fromDayNumber(day);
    if (!isoDate.endsWith("-01") && day !== startDay) continue;
    const x = columnX(day);
    if (x < lastLabelEnd || x > LABEL_WIDTH + weeks * pitch - 30) continue;
    const isJanuary = isoDate.slice(5, 7) === "01";
    // "Jan ’26" rather than the locale's "Jan 26", which reads as a date.
    const month = formatDay(day, { month: "short" });
    const text = isJanuary || day === startDay ? `${month} ’${isoDate.slice(2, 4)}` : month;
    monthLabels.push({ x, text });
    lastLabelEnd = x + text.length * 6.5 + 6;
  }

  const average = (() => {
    const moods = moodsBetween(byDay, startDay, endDay);
    return moods.reduce((sum, mood) => sum + mood, 0) / moods.length;
  })();
  const weekdayStats = getWeekdayStats(byDay, startDay, endDay);
  const statX = LABEL_WIDTH + weeks * pitch + 8;

  return (
    <div ref={ref} className="w-full overflow-x-auto">
      {width > 0 && (
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          role="img"
          aria-label="Calendar of daily mood"
          className="block text-[11px]"
        >
          {WEEKDAY_LABELS.map((label, row) => (
            <text key={label} x={LABEL_WIDTH - 6} y={rowY(row) + cell / 2 + 4} textAnchor="end" className="fill-muted">
              {label}
            </text>
          ))}

          {monthLabels.map((label) => (
            <text key={label.x} x={label.x} y={12} className="fill-muted">
              {label.text}
            </text>
          ))}

          {days.map((day) => {
            const entry = byDay.get(day);
            const when = formatDay(day, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
            const detail = entry
              ? `Mood ${entry.mood}${entry.tags.length > 0 ? ` · ${entry.tags.join(", ")}` : ""}`
              : "No entry";
            return (
              <rect
                key={day}
                x={columnX(day)}
                y={rowY(getMondayFirstWeekday(day))}
                width={cell}
                height={cell}
                rx={cell > 16 ? 4 : 2}
                className={`hover:stroke-ink hover:stroke-[1.5] ${entry ? "" : "fill-empty"}`}
                style={entry ? { fill: moodColor(entry.mood) } : undefined}
                {...tooltipProps(when, detail)}
              />
            );
          })}

          <text x={statX} y={12} className="fill-muted">
            vs avg
          </text>
          {weekdayStats.map((stat, row) => {
            if (stat.average === null) return null;
            const deviation = stat.average - average;
            return (
              <text
                key={row}
                x={statX}
                y={rowY(row) + cell / 2 + 4}
                className={`font-mono tabular-nums ${Math.abs(deviation) >= 0.25 ? "fill-ink font-semibold" : "fill-muted"}`}
                {...tooltipProps(
                  WEEKDAY_PLURALS[row],
                  `Average ${stat.average.toFixed(2)} over ${pluralDays(stat.count)} (${signed(deviation, 2)} vs this period)`,
                )}
              >
                {signed(deviation)}
              </text>
            );
          })}
        </svg>
      )}
    </div>
  );
}
