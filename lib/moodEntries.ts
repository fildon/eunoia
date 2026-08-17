import type { SupabaseClient } from "@supabase/supabase-js";
import { getMondayFirstWeekday, WEEKDAY_LABELS } from "./date";

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
