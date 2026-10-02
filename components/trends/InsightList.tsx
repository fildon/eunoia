import type { Insight } from "@/lib/insights";
import { WEEKDAY_PLURALS } from "./format";

type Tone = "up" | "down" | "neutral";

function Num({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-[0.94em] font-medium tabular-nums">{children}</span>;
}

function higherOrLower(difference: number): string {
  return `${Math.abs(difference).toFixed(1)} ${difference > 0 ? "higher" : "lower"}`;
}

function describe(insight: Insight): { tone: Tone; content: React.ReactNode } {
  switch (insight.kind) {
    case "overview": {
      const { change } = insight;
      const steady = change === null || Math.abs(change) < 0.1;
      return {
        tone: steady ? "neutral" : change > 0 ? "up" : "down",
        content: (
          <>
            You logged{" "}
            <b className="font-semibold">
              {insight.logged} of {insight.days}
            </b>{" "}
            days, averaging <Num>{insight.average.toFixed(1)}</Num>
            {change !== null &&
              (steady ? (
                <>, about the same as the {insight.days} days before</>
              ) : (
                <>
                  , <b className="font-semibold">{higherOrLower(change)}</b> than the {insight.days} days before
                </>
              ))}
            .
          </>
        ),
      };
    }
    case "tag":
      return {
        tone: insight.difference > 0 ? "up" : "down",
        content: (
          <>
            Days tagged <b className="font-semibold">{insight.tag}</b> average{" "}
            <b className="font-semibold">{higherOrLower(insight.difference)}</b> than days without (
            {insight.withCount} days vs {insight.withoutCount}).
          </>
        ),
      };
    case "nextDay":
      return {
        tone: insight.difference > 0 ? "up" : "down",
        content: (
          <>
            The day <i>after</i> <b className="font-semibold">{insight.tag}</b> averages{" "}
            <b className="font-semibold">{higherOrLower(insight.difference)}</b> than other days.
          </>
        ),
      };
    case "weekday":
      return {
        tone: "neutral",
        content: (
          <>
            <b className="font-semibold">{WEEKDAY_PLURALS[insight.best.weekday]}</b> are your best day on average (
            <Num>{insight.best.average.toFixed(1)}</Num>),{" "}
            <b className="font-semibold">{WEEKDAY_PLURALS[insight.worst.weekday]}</b> your lowest (
            <Num>{insight.worst.average.toFixed(1)}</Num>).
          </>
        ),
      };
    case "nothingClearYet":
      return { tone: "neutral", content: <>No tag stands out clearly yet. More entries will help.</> };
  }
}

const DOT_CLASS: Record<Tone, string> = {
  up: "bg-up",
  down: "bg-down",
  neutral: "bg-faint",
};

export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-3 rounded-[14px] border border-line bg-surface p-4 sm:px-[22px] sm:py-5">
        {insights.map((insight, index) => {
          const { tone, content } = describe(insight);
          return (
            <li key={index} className="grid grid-cols-[14px_1fr] items-baseline gap-2.5 text-[15px] sm:text-base">
              <span className={`h-2.5 w-2.5 translate-y-px rounded-full ${DOT_CLASS[tone]}`} aria-hidden="true" />
              <span>{content}</span>
            </li>
          );
        })}
      </ul>
      <p className="text-[12.5px] text-muted">
        Only differences that are unlikely to be chance are mentioned. Seen together doesn&apos;t mean one causes the
        other.
      </p>
    </div>
  );
}
