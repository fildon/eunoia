import { createClient } from "@/lib/supabase/server";
import { getTodayEntry } from "@/lib/moodEntries";
import { MoodEntryForm } from "@/components/MoodEntryForm";

export default async function TodayPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const todayEntry = await getTodayEntry(supabase);

  return (
    <main className="flex flex-1 flex-col items-center gap-2 p-8">
      <h1 className="mb-4 text-xl font-semibold">Today</h1>
      <MoodEntryForm userId={user.id} initialEntry={todayEntry} />
    </main>
  );
}
