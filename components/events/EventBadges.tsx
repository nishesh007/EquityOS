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
};

const BADGE_CLASS: Record<EventBadgeKind, string> = {
  upcoming: "border-sky-500/25 bg-sky-500/10 text-sky-400",
  completed: "border-slate-500/25 bg-slate-500/10 text-slate-400",
  today: "border-accent/30 bg-accent/15 text-accent",
  tomorrow: "border-violet-500/25 bg-violet-500/10 text-violet-400",
  live: "border-red-500/30 bg-red-500/15 text-red-400",
  high_impact: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  dividend: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  bonus: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  split: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
  buyback: "border-emerald-500/25 bg-emerald-500/10 text-emerald-400",
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
          className={cn("border", BADGE_CLASS[badge])}
        >
          {BADGE_LABELS[badge]}
        </Badge>
      ))}
    </div>
  );
});
