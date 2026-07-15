import { createClient } from "@/lib/supabase/server";
import { listEntries } from "@/lib/moodEntries";
import { MoodTrendChart } from "@/components/MoodTrendChart";
import { toDateString } from "@/lib/date";

export default async function TrendsPage() {
  const supabase = await createClient();

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const entries = await listEntries(supabase, {
    sinceDate: toDateString(ninetyDaysAgo),
  });

  return (
    <main className="flex flex-1 flex-col items-center gap-2 p-8">
      <h1 className="mb-4 text-xl font-semibold">Trends</h1>
      <MoodTrendChart entries={entries} />
    </main>
  );
}
