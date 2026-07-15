"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { upsertEntry, type MoodEntry } from "@/lib/moodEntries";
import { MOOD_TAGS } from "@/lib/tags";
import { todayDateString } from "@/lib/date";
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
}: {
  userId: string;
  initialEntry: MoodEntry | null;
}) {
  const [mood, setMood] = useState<number | null>(initialEntry?.mood ?? null);
  const [tags, setTags] = useState<string[]>(initialEntry?.tags ?? []);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  function toggleTag(tagId: string) {
    setTags((current) =>
      current.includes(tagId)
        ? current.filter((t) => t !== tagId)
        : [...current, tagId],
    );
  }

  async function handleSave() {
    if (mood === null) return;
    setStatus("saving");
    try {
      const supabase = createClient();
      await upsertEntry(supabase, userId, {
        entry_date: todayDateString(),
        mood,
        tags,
      });
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
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
                onClick={() => {
                  setMood(option.value);
                  setStatus("idle");
                }}
                style={
                  selected
                    ? { borderColor: color, backgroundColor: `${color}22` }
                    : undefined
                }
                className={`flex flex-1 flex-col items-center gap-1 rounded-xl border p-3 transition ${
                  selected
                    ? ""
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                }`}
              >
                <span className="text-2xl">{option.emoji}</span>
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
          {MOOD_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => {
                toggleTag(tag.id);
                setStatus("idle");
              }}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                tags.includes(tag.id)
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={mood === null || status === "saving"}
        className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-gray-700"
      >
        {status === "saving"
          ? "Saving..."
          : status === "saved"
            ? "Saved ✓"
            : initialEntry
              ? "Update today's entry"
              : "Save today's entry"}
      </button>
      {status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Something went wrong saving your entry. Please try again.
        </p>
      )}
    </div>
  );
}
