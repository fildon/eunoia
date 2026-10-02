"use client";

import { MIN_DAYS_PER_SIDE, type TagEffect } from "@/lib/insights";
import { pluralDays, signed } from "./format";
import { tooltipProps } from "./HoverTooltip";
import { useElementWidth } from "./useElementWidth";

const ROW_HEIGHT = 34;
const TOP = 22;
const MAX_UNSCORED_LISTED = 10;

function truncate(text: string, maxLength: number): string {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

// Diverging bars from zero: how much higher or lower mood is with each tag
// than without, with its likely range as a whisker. Bars whose range
// crosses zero are faded, since they could easily be chance. Tags too rare
// (or too common) to compare are listed underneath rather than drawn.
export function TagEffectsChart({ effects, lag }: { effects: TagEffect[]; lag: 0 | 1 }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const scored = effects.filter((effect) => effect.scored);
  const unscored = effects.filter((effect) => !effect.scored);

  const narrow = width < 520;
  const labelWidth = narrow ? 92 : 116;
  const rightWidth = narrow ? 70 : 130;
  const plotWidth = Math.max(120, width - labelWidth - rightWidth);
  const svgWidth = labelWidth + plotWidth + rightWidth;
  const svgHeight = TOP + scored.length * ROW_HEIGHT;

  // Symmetric scale in half-point steps, from ±1 up to ±2.
  const largest = Math.max(0, ...scored.map((effect) => Math.max(Math.abs(effect.low), Math.abs(effect.high))));
  const extent = Math.min(2, Math.max(1, Math.ceil(largest * 2) / 2));
  const step = extent === 2 ? 1 : 0.5;
  const ticks: number[] = [];
  for (let tick = -extent; tick <= extent + 1e-9; tick += step) ticks.push(Number(tick.toFixed(1)));
  const zeroX = labelWidth + plotWidth / 2;
  const x = (value: number) => zeroX + (Math.max(-extent, Math.min(extent, value)) / extent) * (plotWidth / 2);

  return (
    <div className="flex flex-col gap-3">
      <div ref={ref} className="w-full overflow-x-auto">
        {scored.length === 0 ? (
          <p className="text-sm text-muted">
            No tag has {MIN_DAYS_PER_SIDE} days with it and {MIN_DAYS_PER_SIDE} without it in this period yet.
          </p>
        ) : (
          width > 0 && (
            <svg
              width={svgWidth}
              height={svgHeight}
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              role="img"
              aria-label="Difference in mood with and without each tag"
              className="block text-[11px]"
            >
              {ticks.map((tick) => (
                <g key={tick}>
                  <line
                    x1={x(tick)}
                    x2={x(tick)}
                    y1={TOP - 4}
                    y2={svgHeight}
                    className={tick === 0 ? "stroke-faint" : "stroke-line"}
                  />
                  <text x={x(tick)} y={12} textAnchor="middle" className="fill-muted font-mono tabular-nums">
                    {tick === 0 ? "0" : signed(tick)}
                  </text>
                </g>
              ))}

              {scored.map((effect, index) => {
                if (!effect.scored) return null;
                const cy = TOP + index * ROW_HEIGHT + ROW_HEIGHT / 2;
                const barX = Math.min(zeroX, x(effect.difference));
                const barWidth = Math.max(2, Math.abs(x(effect.difference) - zeroX));
                const direction = effect.difference >= 0 ? "higher" : "lower";
                const detail =
                  `${lag ? "The day after" : "Days with"} ${effect.tag} average ${Math.abs(effect.difference).toFixed(2)} ${direction} ` +
                  `than ${lag ? "other days" : "days without"} (${effect.withCount} vs ${effect.withoutCount} days). ` +
                  `Likely range ${signed(effect.low, 2)} to ${signed(effect.high, 2)}.` +
                  (effect.clear ? "" : " That range includes zero, so this could be chance.");
                const low = x(effect.low);
                const high = x(effect.high);
                const valueX = labelWidth + plotWidth + 12;
                return (
                  <g key={effect.tag}>
                    <text x={labelWidth - 12} y={cy + 4} textAnchor="end" className="fill-ink text-[13px]">
                      <title>{effect.tag}</title>
                      {truncate(effect.tag, narrow ? 11 : 15)}
                    </text>
                    <rect
                      x={barX}
                      y={cy - 7}
                      width={barWidth}
                      height={14}
                      rx={3}
                      className={`hover:stroke-ink hover:stroke-[1.5] ${effect.difference >= 0 ? "fill-up" : "fill-down"}`}
                      fillOpacity={effect.clear ? 1 : 0.32}
                      {...tooltipProps(effect.tag, detail)}
                    />
                    <g className="stroke-whisker" strokeWidth={1.5} pointerEvents="none">
                      <line x1={low} x2={high} y1={cy} y2={cy} />
                      <line x1={low} x2={low} y1={cy - 5} y2={cy + 5} />
                      <line x1={high} x2={high} y1={cy - 5} y2={cy + 5} />
                    </g>
                    <text
                      x={valueX}
                      y={cy + 4}
                      className={`font-mono text-[12.5px] tabular-nums ${effect.clear ? "fill-ink font-semibold" : "fill-muted"}`}
                    >
                      {signed(effect.difference)}
                    </text>
                    {!narrow && (
                      <text x={valueX + 42} y={cy + 4} className="fill-muted">
                        {effect.withCount} / {effect.withoutCount} days
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )
        )}
      </div>

      {scored.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted">
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2 w-[18px] rounded-sm bg-up" />
            Clearly higher
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2 w-[18px] rounded-sm bg-down" />
            Clearly lower
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block h-2 w-[18px] rounded-sm bg-faint opacity-60" />
            Could be chance
          </span>
          <span className="inline-flex items-center gap-1.5">
            <i className="inline-block w-[18px] border-t-[1.5px] border-whisker" />
            Likely range (95%)
          </span>
        </div>
      )}

      {unscored.length > 0 && (
        <p className="text-[13px] text-muted">
          Not enough days to compare yet:{" "}
          {unscored
            .slice(0, MAX_UNSCORED_LISTED)
            .map((effect) =>
              effect.withCount < MIN_DAYS_PER_SIDE
                ? `${effect.tag} (${pluralDays(effect.withCount)})`
                : `${effect.tag} (on almost every day)`,
            )
            .join(", ")}
          {unscored.length > MAX_UNSCORED_LISTED && `, and ${unscored.length - MAX_UNSCORED_LISTED} more`}.
        </p>
      )}
    </div>
  );
}
