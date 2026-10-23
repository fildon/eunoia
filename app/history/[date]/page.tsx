import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listEntries, getTagUsage } from "@/lib/moodEntries";
import { MoodEntryForm } from "@/components/MoodEntryForm";
import { Page } from "@/components/Page";
import { isValidDateString } from "@/lib/date";
import { getRequestToday } from "@/lib/timeZone";

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidDateString(date)) notFound();

  const today = await getRequestToday();
  // Today has its own page (which also handles the midnight rollover), and
  // there's nothing to record for days that haven't happened yet.
  if (date === today) redirect("/");
  if (date > today) notFound();

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const entries = await listEntries(supabase);
  const entry = entries.find((e) => e.entry_date === date) ?? null;
  const existingTags = getTagUsage(entries);

  return (
    <Page>
      <MoodEntryForm
        userId={session.user.id}
        initialToday={today}
        initialEntry={entry}
        existingTags={existingTags}
        entryDate={date}
      />
    </Page>
  );
}
