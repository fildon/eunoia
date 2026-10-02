import { moodColor } from "@/lib/moodColor";

export function MoodLegend({ showNoEntry = false }: { showNoEntry?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-muted">
      {[1, 2, 3, 4, 5].map((mood) => (
        <span key={mood} className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-[3px]" style={{ backgroundColor: moodColor(mood) }} />
          {mood}
        </span>
      ))}
      {showNoEntry && (
        <span className="inline-flex items-center gap-1.5">
          <i className="inline-block h-3 w-3 rounded-[3px] bg-empty outline outline-1 outline-line" />
          No entry
        </span>
      )}
    </div>
  );
}
