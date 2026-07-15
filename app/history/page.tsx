import { createClient } from "@/lib/supabase/server";
import { listEntries } from "@/lib/moodEntries";
import { MoodHistoryList } from "@/components/MoodHistoryList";

export default async function HistoryPage() {
  const supabase = await createClient();
  const entries = await listEntries(supabase);

  return (
    <main className="flex flex-1 flex-col items-center gap-2 p-8">
      <h1 className="mb-4 text-xl font-semibold">History</h1>
      <MoodHistoryList entries={entries} />
    </main>
  );
}
