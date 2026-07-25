/**
 * EquityOS AI Daily Briefing — explainable bullets from live dashboard DTOs.
 */

import type { BriefingBullet } from "@/lib/dashboard/executive-intelligence";
import { formatBriefingClock } from "@/lib/dashboard/executive-intelligence";

interface AiDailyBriefingProps {
  bullets: BriefingBullet[];
  updatedAt: string;
}

export function AiDailyBriefing({ bullets, updatedAt }: AiDailyBriefingProps) {
  const clock = formatBriefingClock(updatedAt);

  return (
    <section
      aria-label="EquityOS AI Daily Briefing"
      className="flex h-full flex-col rounded-lg border border-surface-border-subtle bg-card/40 px-3 py-2"
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
          EquityOS AI Daily Briefing
        </h2>
        <p className="shrink-0 font-mono text-[10px] text-text-muted">
          Last updated {clock} IST
        </p>
      </div>
      {bullets.length === 0 ? (
        <p className="text-xs text-text-muted">
          Waiting for market intelligence snapshot.
        </p>
      ) : (
        <ul className="flex-1 space-y-1">
          {bullets.map((bullet) => (
            <li
              key={bullet.id}
              className="flex gap-2 text-[12px] leading-snug text-text-primary"
            >
              <span
                aria-hidden
                className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-accent"
              />
              <span>{bullet.text}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
