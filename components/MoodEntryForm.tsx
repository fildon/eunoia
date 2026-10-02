"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEntryByDate, upsertEntry, type MoodEntry } from "@/lib/moodEntries";
import { formatDisplayDate, todayDateString } from "@/lib/date";
import { moodColor } from "@/lib/moodColor";
import { PageHeader } from "@/components/Page";

const MOOD_OPTIONS = [
  { value: 5, emoji: "😄", label: "Great" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 2, emoji: "🙁", label: "Bad" },
  { value: 1, emoji: "😞", label: "Awful" },
];

export function MoodEntryForm({
  userId,
  initialToday,
  initialEntry,
  existingTags,
}: {
  userId: string;
  // Today's date in the user's zone, as the server saw it (see
  // lib/timeZone.ts) — so the first render matches the server's.
  initialToday: string;
  initialEntry: MoodEntry | null;
  existingTags: string[];
}) {
  const router = useRouter();
  const [mood, setMood] = useState<number | null>(initialEntry?.mood ?? null);
  const [tags, setTags] = useState<string[]>(initialEntry?.tags ?? []);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagText, setNewTagText] = useState("");
  const [today, setToday] = useState(initialToday);

  // Tab stays open across midnight, so the day can roll over without a
  // refresh. Poll (and check on refocus) for that, and reload today's entry
  // when it happens — otherwise saving would write yesterday's stale
  // mood/tags into the new day's row. The device clock is the authority on
  // "today", so this also runs on mount in case the server rendered for a
  // stale time zone (e.g. just after travelling).
  const todayRef = useRef(today);
  useEffect(() => {
    todayRef.current = today;
  }, [today]);

  useEffect(() => {
    async function checkForNewDay() {
      const deviceToday = todayDateString();
      if (deviceToday === todayRef.current) return;

      setToday(deviceToday);
      const supabase = createClient();
      const freshEntry = await getEntryByDate(supabase, deviceToday);
      setMood(freshEntry?.mood ?? null);
      setTags(freshEntry?.tags ?? []);
      setStatus("idle");
    }

    checkForNewDay();
    const interval = setInterval(checkForNewDay, 60_000);
    document.addEventListener("visibilitychange", checkForNewDay);
    window.addEventListener("focus", checkForNewDay);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", checkForNewDay);
      window.removeEventListener("focus", checkForNewDay);
    };
  }, []);

  // Tags already on this entry might not appear in existingTags (e.g. loaded before any other entry existed).
  const knownTags = Array.from(new Set([...existingTags, ...tags]));

  function toggleTag(tagId: string) {
    setTags((current) =>
      current.includes(tagId)
        ? current.filter((t) => t !== tagId)
        : [...current, tagId],
    );
  }

  function addNewTag() {
    const trimmed = newTagText.trim();
    setNewTagText("");
    setShowNewTagInput(false);
    if (!trimmed) return;

    const existingMatch = knownTags.find(
      (t) => t.toLowerCase() === trimmed.toLowerCase(),
    );
    const tagToAdd = existingMatch ?? trimmed;
    setTags((current) =>
      current.includes(tagToAdd) ? current : [...current, tagToAdd],
    );
    setStatus("idle");
  }

  async function handleSave() {
    if (mood === null) return;
    setStatus("saving");
    try {
      const supabase = createClient();
      await upsertEntry(supabase, userId, {
        entry_date: today,
        mood,
        tags,
      });
      setStatus("saved");
      // Writes go straight to Supabase, bypassing Next's revalidation, so
      // History/Trends' client-cached pages (see staleTimes.dynamic) need an
      // explicit bust or they'd keep showing pre-save data for a while.
      router.refresh();
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <PageHeader eyebrow="Today" title={formatDisplayDate(today)} />
      <div className="flex w-full max-w-xl flex-col gap-10">
        <section className="flex flex-col gap-3">
          <h2 className="text-[17px] font-semibold">How are you feeling?</h2>
          <div className="flex justify-between gap-2">
            {MOOD_OPTIONS.map((option) => {
              const selected = mood === option.value;
              const color = moodColor(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setMood(option.value);
                    setStatus("idle");
                  }}
                  style={
                    selected
                      ? { borderColor: color, backgroundColor: `${color}22`, boxShadow: `inset 0 0 0 1px ${color}` }
                      : undefined
                  }
                  className={`focus-ring flex flex-1 flex-col items-center gap-1 rounded-[14px] border bg-surface px-1 py-3 transition ${
                    selected ? "" : "border-line hover:border-faint"
                  }`}
                >
                  <span className="text-2xl" aria-hidden="true">
                    {option.emoji}
                  </span>
                  <span className={`text-xs ${selected ? "font-medium text-ink" : "text-muted"}`}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold">What&apos;s influencing it?</h2>
            <p className="text-[13.5px] text-muted">Optional. Tags feed the comparisons on Trends.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {knownTags.map((tag) => {
              const selected = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    toggleTag(tag);
                    setStatus("idle");
                  }}
                  className={`focus-ring rounded-full border px-3 py-1.5 text-sm transition ${
                    selected
                      ? "border-pill bg-pill text-pill-ink"
                      : "border-line bg-surface text-muted hover:border-faint hover:text-ink"
                  }`}
                >
                  {tag}
                </button>
              );
            })}

            {showNewTagInput ? (
              <input
                autoFocus
                type="text"
                aria-label="New tag"
                value={newTagText}
                onChange={(e) => setNewTagText(e.target.value)}
                onBlur={addNewTag}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNewTag();
                  } else if (e.key === "Escape") {
                    setNewTagText("");
                    setShowNewTagInput(false);
                  }
                }}
                placeholder="New tag"
                className="w-32 rounded-full border border-faint bg-surface px-3 py-1.5 text-sm text-ink outline-none placeholder:text-faint"
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowNewTagInput(true)}
                className="focus-ring rounded-full border border-dashed border-faint px-3 py-1.5 text-sm text-muted transition hover:text-ink"
              >
                + Add tag
              </button>
            )}
          </div>
        </section>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={mood === null || status === "saving"}
            className="focus-ring self-start rounded-full bg-pill px-5 py-2.5 text-sm font-medium text-pill-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-line disabled:text-faint"
          >
            {status === "saving"
              ? "Saving..."
              : status === "saved"
                ? "Saved ✓"
                : initialEntry
                  ? "Update today's entry"
                  : "Save today's entry"}
          </button>
          <div role="status" aria-live="polite" className="sr-only">
            {status === "saved" && "Entry saved."}
          </div>
          {status === "error" && (
            <p role="alert" aria-live="assertive" className="text-sm text-danger">
              Something went wrong saving your entry. Please try again.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
