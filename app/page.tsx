import { createClient } from "@/lib/supabase/server";
import { listEntries, getTagUsage } from "@/lib/moodEntries";
import { MoodEntryForm } from "@/components/MoodEntryForm";
import { getRequestToday } from "@/lib/timeZone";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const entries = await listEntries(supabase);
  const today = await getRequestToday();
  const todayEntry = entries.find((entry) => entry.entry_date === today) ?? null;
  const existingTags = getTagUsage(entries);

  return (
    <main id="main-content" className="flex flex-1 flex-col items-center gap-2 p-8">
      <h1 className="mb-4 text-xl font-semibold">Today</h1>
      <MoodEntryForm
        userId={session.user.id}
        initialToday={today}
        initialEntry={todayEntry}
        existingTags={existingTags}
      />
    </main>
  );
}
