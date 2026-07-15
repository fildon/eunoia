const MOOD_COLORS: Record<number, string> = {
  1: "#b91c1c",
  2: "#f97316",
  3: "#eab308",
  4: "#84cc16",
  5: "#16a34a",
};

const MOOD_EMOJI: Record<number, string> = {
  1: "😞",
  2: "🙁",
  3: "😐",
  4: "🙂",
  5: "😄",
};

export function moodColor(mood: number): string {
  return MOOD_COLORS[mood] ?? "#9ca3af";
}

export function moodEmoji(mood: number): string {
  return MOOD_EMOJI[mood] ?? "❔";
}
