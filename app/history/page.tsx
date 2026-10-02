import { createClient } from "@/lib/supabase/server";
import { listEntries } from "@/lib/moodEntries";
import { MoodHistoryList } from "@/components/MoodHistoryList";
import { Page } from "@/components/Page";

export default async function HistoryPage() {
  const supabase = await createClient();
  const entries = await listEntries(supabase);

  return (
    <Page title="History">
      <MoodHistoryList entries={entries} />
    </Page>
  );
}
