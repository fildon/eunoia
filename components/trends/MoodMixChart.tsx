"use client";

import { formatDay, fromDayNumber } from "@/lib/date";
import type { MoodMixGroup } from "@/lib/insights";
import { moodColor } from "@/lib/moodColor";
import { tooltipProps } from "./HoverTooltip";
import { useElementWidth } from "./useElementWidth";

const LEFT = 38;
const TOP = 8;
const BOTTOM = 42;
const HEIGHT = 220;
// Columns with fewer logged days than this are faded: a 100% bar built
// from two days says very little.
const MIN_LOGGED = 7;

function labelsFor(group: MoodMixGroup): { label: string; title: string; year: string | null } {
  const [year, month] = fromDayNumber(group.startDay).split("-").map(Number);
  if (group.unit === "week") {
    return {
      label: formatDay(group.startDay, { month: "short", day: "numeric" }),
      title: `Week of ${formatDay(group.startDay, { month: "short", day: "numeric" })}`,
      year: null,
    };
  }
  if (group.unit === "month") {
    return {
      label: formatDay(group.startDay, { month: "short" }),
      title: formatDay(group.startDay, { month: "long", year: "numeric" }),
      year: month === 1 ? String(year) : null,
    };
  }
  const quarter = Math.ceil(month / 3);
  return { label: `Q${quarter}`, title: `Q${quarter} ${year}`, year: quarter === 1 ? String(year) : null };
}

// 100% stacked columns of logged days by mood, 1 at the bottom. Shows the
// spread an average hides: steady 3s and a mix of 1s and 5s look the same
// as a mean.
export function MoodMixChart({ groups }: { groups: MoodMixGroup[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const plotHeight = HEIGHT - TOP - BOTTOM;
  const slot = (width - LEFT) / groups.length;
  const barWidth = Math.min(40, slot * 0.72);
  const labelEvery = Math.max(1, Math.ceil(28 / slot));

  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          role="img"
          aria-label="Share of logged days at each mood"
          className="block text-[11px]"
        >
          {[0, 0.5, 1].map((share) => {
            const y = TOP + plotHeight * (1 - share);
            return (
              <g key={share}>
                <line x1={LEFT} x2={width} y1={y} y2={y} className="stroke-line" />
                <text x={LEFT - 6} y={y + 4} textAnchor="end" className="fill-muted font-mono tabular-nums">
                  {share * 100}%
                </text>
              </g>
            );
          })}

          {groups.map((group, index) => {
            const { label, title, year } = labelsFor(group);
            const x = LEFT + index * slot + (slot - barWidth) / 2;
            const faded = group.logged < MIN_LOGGED;
            let y = TOP + plotHeight;
            const segments = group.counts.map((count, i) => {
              if (count === 0) return null;
              const mood = i + 1;
              const height = (count / group.logged) * plotHeight;
              y -= height;
              const share = Math.round((count / group.logged) * 100);
              return (
                <rect
                  key={mood}
                  x={x}
                  // 2px gap between stacked segments.
                  y={y + 1}
                  width={barWidth}
                  height={Math.max(0.5, height - 2)}
                  rx={2}
                  className="hover:stroke-ink hover:stroke-[1.5]"
                  style={{ fill: moodColor(mood) }}
                  fillOpacity={faded ? 0.35 : 1}
                  {...tooltipProps(
                    title,
                    `Mood ${mood} on ${count} of ${group.logged} logged days (${share}%)` +
                      (faded ? ". Too few days to read much into." : ""),
                  )}
                />
              );
            });
            const showLabel = index % labelEvery === 0 || year !== null;
            return (
              <g key={group.startDay}>
                {segments}
                {showLabel && (
                  <>
                    <text x={x + barWidth / 2} y={TOP + plotHeight + 16} textAnchor="middle" className="fill-muted">
                      {label}
                    </text>
                    <text
                      x={x + barWidth / 2}
                      y={TOP + plotHeight + 30}
                      textAnchor="middle"
                      className="fill-muted font-mono text-[10px] tabular-nums"
                    >
                      {year ?? `${group.logged}d`}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
