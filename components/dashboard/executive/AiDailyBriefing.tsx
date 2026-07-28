/**
 * EquityOS Institutional Bulletin — presentation-only briefing.
 * Keyword accents (green / amber / red) · less chrome · better spacing.
 */

import type { BriefingBullet } from "@/lib/dashboard/executive-intelligence";
import { formatBriefingClock } from "@/lib/dashboard/executive-intelligence";
import type { ReactNode } from "react";

interface AiDailyBriefingProps {
  bullets: BriefingBullet[];
  updatedAt: string;
}

const GREEN =
  /\b(bull|bullish|gain|gains|advance|advances|strong|strength|upside|breakout|rally|positive|risk[- ]?on)\b/gi;
const AMBER =
  /\b(neutral|mixed|caution|watch|moderate|range|sideways|stable)\b/gi;
const RED =
  /\b(bear|bearish|loss|losses|decline|declines|weak|weakness|downside|selloff|negative|risk[- ]?off|volatile|volatility)\b/gi;

function highlightKeywords(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = new RegExp(
    `${GREEN.source}|${AMBER.source}|${RED.source}`,
    "gi"
  );
  let last = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    const word = match[0];
    const lower = word.toLowerCase();
    let tone = "text-text-primary";
    if (GREEN.test(lower)) tone = "text-emerald-400 font-semibold";
    else if (RED.test(lower)) tone = "text-red-400 font-semibold";
    else if (AMBER.test(lower)) tone = "text-amber-400 font-semibold";
    GREEN.lastIndex = 0;
    RED.lastIndex = 0;
    AMBER.lastIndex = 0;
    parts.push(
      <span key={`kw-${key++}`} className={tone}>
        {word}
      </span>
    );
    last = match.index + word.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function AiDailyBriefing({ bullets, updatedAt }: AiDailyBriefingProps) {
  const clock = formatBriefingClock(updatedAt);
  const visible = bullets.slice(0, 4);

  return (
    <section
      aria-label="Institutional Bulletin"
      className="flex h-full flex-col rounded-xl border border-surface-border-subtle bg-surface-raised px-4 py-3"
    >
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-card-title font-semibold text-text-primary">
          Institutional Bulletin
        </h2>
        <p className="shrink-0 text-micro text-text-muted">
          Updated {clock} IST
        </p>
      </div>
      {visible.length === 0 ? (
        <p className="text-caption text-text-muted">
          Waiting for market intelligence snapshot.
        </p>
      ) : (
        <ul className="flex-1 space-y-3">
          {visible.map((bullet) => (
            <li
              key={bullet.id}
              className="text-body leading-[1.3] text-text-secondary"
            >
              {highlightKeywords(bullet.text)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
