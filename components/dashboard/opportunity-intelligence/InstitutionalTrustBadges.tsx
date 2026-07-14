"use client";

import type { InstitutionalBadge } from "@/lib/opportunity-engine/institutional-presentation";

const BADGE_STYLES: Record<string, string> = {
  AI_VERIFIED: "border-accent/30 bg-accent/10 text-accent",
  VALIDATED: "border-gain/30 bg-gain/10 text-gain",
  HIGH_TRUST: "border-accent/30 bg-accent/10 text-accent",
  HIGH_CONFIDENCE: "border-gain/30 bg-gain/10 text-gain",
  HISTORICALLY_ACCURATE: "border-accent/20 bg-surface-hover text-text-secondary",
  BACKTEST_VERIFIED: "border-accent/20 bg-surface-hover text-text-secondary",
  HIGH_QUALITY: "border-gain/30 bg-gain/10 text-gain",
};

export function InstitutionalTrustBadges({
  badges,
  compact = false,
}: {
  badges: InstitutionalBadge[];
  compact?: boolean;
}) {
  if (badges.length === 0) return null;

  return (
    <div className={`flex flex-wrap gap-1 ${compact ? "" : "mt-1.5"}`}>
      {badges.map((badge) => (
        <span
          key={badge.id}
          className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
            BADGE_STYLES[badge.id] ?? "border-surface-border text-text-muted"
          }`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}
