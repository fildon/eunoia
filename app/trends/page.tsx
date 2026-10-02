import { createClient } from "@/lib/supabase/server";
import { listEntries } from "@/lib/moodEntries";
import { Page } from "@/components/Page";
import { TrendsView } from "@/components/trends/TrendsView";
import { getRequestToday } from "@/lib/timeZone";

export default async function TrendsPage() {
  const supabase = await createClient();

  const entries = await listEntries(supabase);
  const today = await getRequestToday();

  return (
    <Page title="Trends">
      <TrendsView entries={entries} today={today} />
    </Page>
  );
}
