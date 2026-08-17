"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { getEntryByDate, upsertEntry, type MoodEntry } from "@/lib/moodEntries";
import { formatDisplayDate, toDateString } from "@/lib/date";
import { moodColor } from "@/lib/moodColor";

const MOOD_OPTIONS = [
  { value: 5, emoji: "😄", label: "Great" },
  { value: 4, emoji: "🙂", label: "Good" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 2, emoji: "🙁", label: "Bad" },
  { value: 1, emoji: "😞", label: "Awful" },
];

export function MoodEntryForm({
  userId,
  initialEntry,
  existingTags,
}: {
  userId: string;
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
  const [today, setToday] = useState(() => new Date());

  // Tab stays open across midnight, so the day can roll over without a
  // refresh. Poll (and check on refocus) for that, and reload today's entry
  // when it happens — otherwise saving would write yesterday's stale
  // mood/tags into the new day's row.
  const todayRef = useRef(today);
  useEffect(() => {
    todayRef.current = today;
  }, [today]);

  useEffect(() => {
    async function checkForNewDay() {
      const now = new Date();
      if (toDateString(now) === toDateString(todayRef.current)) return;

      setToday(now);
      const supabase = createClient();
      const freshEntry = await getEntryByDate(supabase, toDateString(now));
      setMood(freshEntry?.mood ?? null);
      setTags(freshEntry?.tags ?? []);
      setStatus("idle");
    }

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
        entry_date: toDateString(today),
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
    <div className="flex w-full max-w-md flex-col gap-6">
      <p className="-mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
        {formatDisplayDate(today)}
      </p>
      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
          How are you feeling today?
        </h2>
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
                    ? { borderColor: color, backgroundColor: `${color}22` }
                    : undefined
                }
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl border p-3 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  selected
                    ? ""
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                <span className="text-2xl" aria-hidden="true">
                  {option.emoji}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
          What&apos;s influencing it? (optional)
        </h2>
        <div className="flex flex-wrap gap-2">
          {knownTags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={tags.includes(tag)}
              onClick={() => {
                toggleTag(tag);
                setStatus("idle");
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                tags.includes(tag)
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {tag}
            </button>
          ))}

          {showNewTagInput ? (
            <input
              autoFocus
              type="text"
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
              className="w-28 rounded-full border border-gray-300 px-3 py-1.5 text-sm outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowNewTagInput(true)}
              className="rounded-full border border-dashed border-gray-300 px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              + Add tag
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={mood === null || status === "saving"}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
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
        <p role="alert" aria-live="assertive" className="text-sm text-red-600 dark:text-red-400">
          Something went wrong saving your entry. Please try again.
        </p>
      )}
    </div>
  );
}
