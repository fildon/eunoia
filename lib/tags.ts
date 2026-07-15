export const MOOD_TAGS = [
  { id: "good_sleep", label: "Good Sleep" },
  { id: "bad_sleep", label: "Bad Sleep" },
  { id: "exercise", label: "Exercise" },
  { id: "work_stress", label: "Stress" },
  { id: "social", label: "Friends" },
  { id: "health", label: "Health" },
] as const;

export type MoodTagId = (typeof MOOD_TAGS)[number]["id"];

export function tagLabel(id: string): string {
  return MOOD_TAGS.find((tag) => tag.id === id)?.label ?? id;
}
