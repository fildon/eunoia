"use client";

import { useMemo, useState } from "react";
import { toDayNumber } from "@/lib/date";
import { getInsights, getMoodMix, getTagEffects, indexEntriesByDay, moodsBetween } from "@/lib/insights";
import type { MoodEntry } from "@/lib/moodEntries";
import { SegmentedControl } from "@/components/SegmentedControl";
import { HoverTooltip } from "./HoverTooltip";
import { InsightList } from "./InsightList";
import { MoodCalendar } from "./MoodCalendar";
import { MoodLegend } from "./MoodLegend";
import { MoodMixChart } from "./MoodMixChart";
import { TagEffectsChart } from "./TagEffectsChart";

const RANGE_OPTIONS = [
  { value: "30d", label: "30d", days: 30 },
  { value: "90d", label: "90d", days: 90 },
  { value: "1y", label: "1y", days: 365 },
  { value: "all", label: "All", days: null },
] as const;

type Range = (typeof RANGE_OPTIONS)[number]["value"];

const LAG_OPTIONS = [
  { value: "same", label: "Same day" },
  { value: "next", label: "Next day" },
] as const;

type Lag = (typeof LAG_OPTIONS)[number]["value"];

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-[17px] font-semibold text-balance">{title}</h2>
          <p className="max-w-[62ch] text-[13.5px] text-muted">{description}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function TrendsView({
  entries,
  today,
}: {
  entries: MoodEntry[];
  // Today's date in the user's time zone (see lib/timeZone.ts), passed from
  // the server so server and client render the same range.
  today: string;
}) {
  const [range, setRange] = useState<Range>("90d");
  const [lag, setLag] = useState<Lag>("same");
  const byDay = useMemo(() => indexEntriesByDay(entries), [entries]);

  if (entries.length === 0) {
    return <p className="text-sm text-muted">No entries yet. Log a few days of mood to see trends here.</p>;
  }

  // Ranges are calendar-bounded: "30d" is today and the 29 days before it,
  // however many of those have entries. The end is normally today, but can
  // be later if an entry was logged in a time zone that's ahead of this one.
  const rangeDays = RANGE_OPTIONS.find((option) => option.value === range)!.days;
  const todayDay = toDayNumber(today);
  const entryDays = [...byDay.keys()];
  const endDay = Math.max(todayDay, ...entryDays);
  const startDay = rangeDays === null ? Math.min(endDay, ...entryDays) : todayDay - (rangeDays - 1);
  const lagDays = lag === "next" ? 1 : 0;
  const hasEntriesInRange = moodsBetween(byDay, startDay, endDay).length > 0;

  return (
    <HoverTooltip className="flex flex-col gap-10">
      <SegmentedControl label="Time range" options={RANGE_OPTIONS} value={range} onChange={setRange} />

      {!hasEntriesInRange ? (
        <p className="text-sm text-muted">No entries in this period. Try a longer range.</p>
      ) : (
        <>
          <section className="flex flex-col gap-3" aria-labelledby="what-stands-out">
            <h2 id="what-stands-out" className="eyebrow">
              What stands out
            </h2>
            <InsightList insights={getInsights(byDay, startDay, endDay)} />
          </section>

          <Section
            title="Every day"
            description="One square per day, weeks running left to right. Blank squares are days with no entry. The column on the right shows how each weekday compares to your average for the period."
          >
            <MoodCalendar byDay={byDay} startDay={startDay} endDay={endDay} />
            <MoodLegend showNoEntry />
          </Section>

          <Section
            title="What goes with better and worse days"
            description={
              lag === "next"
                ? "Average mood the day after each tag, minus the day after days without it. Faded bars could easily be chance."
                : "Average mood on days with each tag, minus days without it. Faded bars could easily be chance."
            }
            action={<SegmentedControl label="Which day to measure" options={LAG_OPTIONS} value={lag} onChange={setLag} />}
          >
            <TagEffectsChart effects={getTagEffects(byDay, startDay, endDay, lagDays)} lag={lagDays} />
          </Section>

          <Section
            title="Mix of days"
            description="Share of logged days at each mood. An average of 3 can mean steady days or a mix of very good and very bad ones; this shows which. Faded columns have fewer than 7 entries."
          >
            <MoodMixChart groups={getMoodMix(byDay, startDay, endDay)} />
            <MoodLegend />
          </Section>
        </>
      )}
    </HoverTooltip>
  );
}
