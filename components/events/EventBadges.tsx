"use client";

import { Badge } from "@/components/ui/Badge";
import type { EventBadgeKind } from "@/src/core/events/EventDrawerPresenter";
import { cn } from "@/lib/utils";
import { memo } from "react";

const BADGE_LABELS: Record<EventBadgeKind, string> = {
  upcoming: "Upcoming",
  completed: "Completed",
  today: "Today",
  tomorrow: "Tomorrow",
  live: "Live",
  high_impact: "High Impact",
  dividend: "Dividend",
  bonus: "Bonus",
  split: "Split",
  buyback: "Buyback",
  central_bank: "Central Bank",
  macro: "Macro",
};

/** High-contrast badge tokens for dark + light theme readability. */
const BADGE_CLASS: Record<EventBadgeKind, string> = {
  upcoming: "border-sky-400/45 bg-sky-500/20 text-sky-200",
  completed: "border-zinc-400/40 bg-zinc-500/20 text-zinc-200",
  today: "border-accent/45 bg-accent/20 text-accent",
  tomorrow: "border-violet-400/45 bg-violet-500/20 text-violet-200",
  live: "border-red-400/50 bg-red-500/20 text-red-200",
  high_impact: "border-amber-400/50 bg-amber-500/20 text-amber-200",
  dividend: "border-emerald-400/45 bg-emerald-500/20 text-emerald-200",
  bonus: "border-emerald-400/45 bg-emerald-500/20 text-emerald-200",
  split: "border-emerald-400/45 bg-emerald-500/20 text-emerald-200",
  buyback: "border-emerald-400/45 bg-emerald-500/20 text-emerald-200",
  central_bank: "border-violet-400/45 bg-violet-500/20 text-violet-200",
  macro: "border-orange-400/45 bg-orange-500/20 text-orange-200",
};

interface EventBadgesProps {
  badges: readonly EventBadgeKind[];
  className?: string;
}

export const EventBadges = memo(function EventBadges({
  badges,
  className,
}: EventBadgesProps) {
  if (badges.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {badges.map((badge) => (
        <Badge
          key={badge}
          size="sm"
          variant="neutral"
          className={cn("border font-semibold", BADGE_CLASS[badge])}
        >
          {BADGE_LABELS[badge]}
        </Badge>
      ))}
    </div>
  );
});
