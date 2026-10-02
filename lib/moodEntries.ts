import type { SupabaseClient } from "@supabase/supabase-js";
import { fromDayNumber, getMondayFirstWeekday, toDayNumber, WEEKDAY_LABELS } from "./date";

export type MoodEntry = {
  id: string;
  user_id: string;
  entry_date: string;
  mood: number;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export async function getEntryByDate(
  supabase: SupabaseClient,
  entryDate: string,
): Promise<MoodEntry | null> {
  const { data, error } = await supabase
    .from("mood_entries")
    .select("*")
    .eq("entry_date", entryDate)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function upsertEntry(
  supabase: SupabaseClient,
  userId: string,
  entry: { entry_date: string; mood: number; tags: string[] },
): Promise<MoodEntry> {
  const { data, error } = await supabase
    .from("mood_entries")
    .upsert(
      {
        user_id: userId,
        entry_date: entry.entry_date,
        mood: entry.mood,
        tags: entry.tags,
      },
      { onConflict: "user_id,entry_date" },
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listEntries(
  supabase: SupabaseClient,
  options?: { sinceDate?: string },
): Promise<MoodEntry[]> {
  let query = supabase
    .from("mood_entries")
    .select("*")
    .order("entry_date", { ascending: false });

  if (options?.sinceDate) {
    query = query.gte("entry_date", options.sinceDate);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function getTagUsage(entries: MoodEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

export type WeekdayAverage = {
  weekday: string; // abbreviated label, e.g. "Mon"
  average: number | null; // null when count === 0
  count: number;
};

export function getWeekdayAverages(entries: MoodEntry[]): WeekdayAverage[] {
  const sums = new Array(7).fill(0);
  const counts = new Array(7).fill(0);

  for (const entry of entries) {
    const idx = getMondayFirstWeekday(entry.entry_date);
    sums[idx] += entry.mood;
    counts[idx] += 1;
  }

  return WEEKDAY_LABELS.map((label, idx) => ({
    weekday: label,
    average: counts[idx] > 0 ? Number((sums[idx] / counts[idx]).toFixed(2)) : null,
    count: counts[idx],
  }));
}

export type DailyMoodPoint = {
  day: number; // day number (see toDayNumber)
  date: string; // YYYY-MM-DD
  mood: number | null; // null on a day with no entry
  avg: number | null; // trailing windowDays-day average; null if no entries in the window
  avgCount: number; // entries the average is based on
};

// One row per calendar day from startDay to endDay inclusive, so missed days
// show up as gaps rather than being skipped. The rolling average is defined
// on every day with at least one entry in its trailing window (including
// missed days and days before startDay), and is only absent when the whole
// window is empty.
export function getDailySeries(
  entries: MoodEntry[],
  startDay: number,
  endDay: number,
  windowDays: number,
): DailyMoodPoint[] {
  const moodByDay = new Map<number, number>();
  for (const entry of entries) {
    moodByDay.set(toDayNumber(entry.entry_date), entry.mood);
  }

  let windowSum = 0;
  let windowCount = 0;
  const series: DailyMoodPoint[] = [];

  // Start early enough that the first row's window is full.
  const firstWindowDay = startDay - windowDays + 1;
  for (let day = firstWindowDay; day <= endDay; day++) {
    const mood = moodByDay.get(day);
    if (mood !== undefined) {
      windowSum += mood;
      windowCount++;
    }
    // Only drop a day that was added in an earlier iteration.
    const leavingDay = day - windowDays;
    const leaving = leavingDay >= firstWindowDay ? moodByDay.get(leavingDay) : undefined;
    if (leaving !== undefined) {
      windowSum -= leaving;
      windowCount--;
    }

    if (day < startDay) continue;
    series.push({
      day,
      date: fromDayNumber(day),
      mood: mood ?? null,
      avg: windowCount > 0 ? Number((windowSum / windowCount).toFixed(2)) : null,
      avgCount: windowCount,
    });
  }

  return series;
}
