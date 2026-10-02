import { createClient } from "@/lib/supabase/server";
import { listEntries } from "@/lib/moodEntries";
import { MoodTrendChart } from "@/components/MoodTrendChart";
import { getRequestToday } from "@/lib/timeZone";

export default async function TrendsPage() {
  const supabase = await createClient();

  const entries = await listEntries(supabase);
  const today = await getRequestToday();

  return (
    <main id="main-content" className="flex flex-1 flex-col items-center gap-2 p-8">
      <h1 className="mb-4 text-xl font-semibold">Trends</h1>
      <MoodTrendChart entries={entries} today={today} />
    </main>
  );
}
