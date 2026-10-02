import type { MoodEntry } from "./moodEntries";
import { fromDayNumber, getMondayFirstWeekday, toDayNumber } from "./date";

// All functions here work on inclusive day-number ranges (see toDayNumber).

// A tag needs at least this many days with it and without it before its
// effect is scored at all.
export const MIN_DAYS_PER_SIDE = 5;

export type EntriesByDay = Map<number, MoodEntry>;

export function indexEntriesByDay(entries: MoodEntry[]): EntriesByDay {
  return new Map(entries.map((entry) => [toDayNumber(entry.entry_date), entry]));
}

function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function sampleVariance(values: number[]): number {
  const m = mean(values);
  return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
}

export function moodsBetween(byDay: EntriesByDay, startDay: number, endDay: number): number[] {
  const moods: number[] = [];
  for (let day = startDay; day <= endDay; day++) {
    const entry = byDay.get(day);
    if (entry) moods.push(entry.mood);
  }
  return moods;
}

export type TagEffect = { tag: string; withCount: number; withoutCount: number } & (
  | { scored: false }
  | {
      scored: true;
      difference: number; // mean mood with the tag minus without
      low: number; // approximate 95% interval for the difference
      high: number;
      clear: boolean; // the interval excludes zero
    }
);

// For each tag used in the range: mood on the outcome day (`lag` days after
// the tag day) when the tag day had the tag, minus when it didn't. Both days
// need an entry — a missed day says nothing about whether the tag applied.
// The interval is a normal approximation with Welch's standard error.
export function getTagEffects(
  byDay: EntriesByDay,
  startDay: number,
  endDay: number,
  lag: 0 | 1,
): TagEffect[] {
  const pairs: { tags: string[]; outcome: number }[] = [];
  for (let day = startDay; day + lag <= endDay; day++) {
    const entry = byDay.get(day);
    const outcome = byDay.get(day + lag);
    if (entry && outcome) pairs.push({ tags: entry.tags, outcome: outcome.mood });
  }
  const allTags = new Set(pairs.flatMap((pair) => pair.tags));

  const effects: TagEffect[] = [...allTags].map((tag) => {
    const withTag: number[] = [];
    const without: number[] = [];
    for (const pair of pairs) {
      (pair.tags.includes(tag) ? withTag : without).push(pair.outcome);
    }
    const counts = { tag, withCount: withTag.length, withoutCount: without.length };
    if (withTag.length < MIN_DAYS_PER_SIDE || without.length < MIN_DAYS_PER_SIDE) {
      return { ...counts, scored: false };
    }
    const difference = mean(withTag) - mean(without);
    const halfWidth =
      1.96 * Math.sqrt(sampleVariance(withTag) / withTag.length + sampleVariance(without) / without.length);
    const low = difference - halfWidth;
    const high = difference + halfWidth;
    return { ...counts, scored: true, difference, low, high, clear: low > 0 || high < 0 };
  });

  return effects.sort((a, b) => {
    if (a.scored && b.scored) return b.difference - a.difference;
    if (a.scored !== b.scored) return a.scored ? -1 : 1;
    return b.withCount - a.withCount;
  });
}

export type WeekdayStat = { count: number; average: number | null };

// Monday-first, one per weekday.
export function getWeekdayStats(byDay: EntriesByDay, startDay: number, endDay: number): WeekdayStat[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (let day = startDay; day <= endDay; day++) {
    const entry = byDay.get(day);
    if (entry) buckets[getMondayFirstWeekday(day)].push(entry.mood);
  }
  return buckets.map((moods) => ({
    count: moods.length,
    average: moods.length > 0 ? mean(moods) : null,
  }));
}

export type MoodMixGroup = {
  unit: "week" | "month" | "quarter";
  startDay: number; // first day of the group that falls inside the range
  counts: [number, number, number, number, number]; // days at mood 1..5
  logged: number;
};

// Logged days per mood, grouped by week for short ranges, by month for up
// to two years, and by quarter beyond that.
export function getMoodMix(byDay: EntriesByDay, startDay: number, endDay: number): MoodMixGroup[] {
  const span = endDay - startDay + 1;
  const unit = span <= 45 ? "week" : span <= 731 ? "month" : "quarter";
  const groups = new Map<string, MoodMixGroup>();

  for (let day = startDay; day <= endDay; day++) {
    const [year, month] = fromDayNumber(day).split("-").map(Number);
    const key =
      unit === "week"
        ? String(day - getMondayFirstWeekday(day))
        : unit === "month"
          ? `${year}-${month}`
          : `${year}-Q${Math.ceil(month / 3)}`;
    let group = groups.get(key);
    if (!group) {
      group = { unit, startDay: day, counts: [0, 0, 0, 0, 0], logged: 0 };
      groups.set(key, group);
    }
    const entry = byDay.get(day);
    if (entry) {
      group.counts[entry.mood - 1]++;
      group.logged++;
    }
  }

  return [...groups.values()];
}

export type Insight =
  | { kind: "overview"; logged: number; days: number; average: number; change: number | null }
  | { kind: "tag"; tag: string; difference: number; withCount: number; withoutCount: number }
  | { kind: "nextDay"; tag: string; difference: number }
  | { kind: "weekday"; best: { weekday: number; average: number }; worst: { weekday: number; average: number } }
  | { kind: "nothingClearYet" };

// The headline sentences at the top of Trends. Only differences whose
// interval excludes zero are mentioned, so a sparse range says less rather
// than reporting noise.
export function getInsights(byDay: EntriesByDay, startDay: number, endDay: number): Insight[] {
  const days = endDay - startDay + 1;
  const moods = moodsBetween(byDay, startDay, endDay);
  if (moods.length === 0) return [];

  const average = mean(moods);
  const previous = moodsBetween(byDay, startDay - days, startDay - 1);
  const insights: Insight[] = [
    {
      kind: "overview",
      logged: moods.length,
      days,
      average,
      // Only compare against a previous period that's at least half logged.
      change: previous.length >= days / 2 ? average - mean(previous) : null,
    },
  ];

  const sameDay = getTagEffects(byDay, startDay, endDay, 0);
  const clearSameDay = sameDay.filter((effect) => effect.scored && effect.clear);
  const best = clearSameDay.find((effect) => effect.scored && effect.difference > 0);
  const worst = clearSameDay.findLast((effect) => effect.scored && effect.difference < 0);
  for (const effect of [best, worst]) {
    if (effect?.scored) {
      insights.push({
        kind: "tag",
        tag: effect.tag,
        difference: effect.difference,
        withCount: effect.withCount,
        withoutCount: effect.withoutCount,
      });
    }
  }

  // A next-day effect is only worth a sentence when the same-day view
  // doesn't already say it.
  const sameDayByTag = new Map(sameDay.map((effect) => [effect.tag, effect]));
  const nextDay = getTagEffects(byDay, startDay, endDay, 1)
    .filter((effect) => {
      if (!effect.scored || !effect.clear || Math.abs(effect.difference) < 0.3) return false;
      const same = sameDayByTag.get(effect.tag);
      return !same?.scored || !same.clear || Math.sign(same.difference) !== Math.sign(effect.difference);
    })
    .sort((a, b) => (a.scored && b.scored ? Math.abs(b.difference) - Math.abs(a.difference) : 0))[0];
  if (nextDay?.scored) {
    insights.push({ kind: "nextDay", tag: nextDay.tag, difference: nextDay.difference });
  }

  if (insights.length < 4) {
    const weekdays = getWeekdayStats(byDay, startDay, endDay)
      .map((stat, weekday) => ({ weekday, count: stat.count, average: stat.average ?? 0 }))
      .filter((stat) => stat.count >= 4);
    if (weekdays.length >= 5) {
      const sorted = [...weekdays].sort((a, b) => b.average - a.average);
      const top = sorted[0];
      const bottom = sorted[sorted.length - 1];
      if (top.average - bottom.average >= 0.4) {
        insights.push({
          kind: "weekday",
          best: { weekday: top.weekday, average: top.average },
          worst: { weekday: bottom.weekday, average: bottom.average },
        });
      }
    }
  }

  if (insights.length === 1) insights.push({ kind: "nothingClearYet" });
  return insights;
}
