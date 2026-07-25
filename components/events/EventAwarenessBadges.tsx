"use client";

import { cn } from "@/lib/utils";
import type { EventAwarenessKind } from "@/types/eventIntegration";
import { memo } from "react";

const AWARENESS_LABELS: Record<EventAwarenessKind, string> = {
  results_tomorrow: "Results Tomorrow",
  results_today: "Results Today",
  dividend_today: "Dividend Today",
  dividend_upcoming: "Dividend",
  bonus: "Bonus",
  split: "Split",
  buyback: "Buyback",
  high_impact: "High Impact",
  critical: "Critical",
  macro: "Macro",
  corporate_action: "Corporate Action",
  portfolio_risk: "Portfolio Risk",
  watchlist: "Watchlist",
  central_bank: "Central Bank",
  agm: "AGM",
};

const AWARENESS_CLASS: Record<EventAwarenessKind, string> = {
  results_tomorrow: "border-sky-400/45 bg-sky-500/20 text-sky-200",
  results_today: "border-accent/45 bg-accent/20 text-accent",
  dividend_today: "border-emerald-400/45 bg-emerald-500/20 text-emerald-200",
  dividend_upcoming: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  bonus: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  split: "border-teal-400/40 bg-teal-500/15 text-teal-200",
  buyback: "border-cyan-400/40 bg-cyan-500/15 text-cyan-200",
  high_impact: "border-amber-400/50 bg-amber-500/20 text-amber-200",
  critical: "border-red-400/50 bg-red-500/20 text-red-200",
  macro: "border-orange-400/45 bg-orange-500/20 text-orange-200",
  corporate_action: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
  portfolio_risk: "border-rose-400/45 bg-rose-500/20 text-rose-200",
  watchlist: "border-violet-400/40 bg-violet-500/15 text-violet-200",
  central_bank: "border-violet-400/45 bg-violet-500/20 text-violet-200",
  agm: "border-zinc-400/40 bg-zinc-500/15 text-zinc-200",
};

interface EventAwarenessBadgeProps {
  kind: EventAwarenessKind;
  className?: string;
  onClick?: () => void;
}

export const EventAwarenessBadge = memo(function EventAwarenessBadge({
  kind,
  className,
  onClick,
}: EventAwarenessBadgeProps) {
  const Comp = onClick ? "button" : "span";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        AWARENESS_CLASS[kind],
        onClick && "cursor-pointer transition-opacity hover:opacity-90",
        className
      )}
    >
      {AWARENESS_LABELS[kind]}
    </Comp>
  );
});

interface EventAwarenessBadgeRowProps {
  kinds: readonly EventAwarenessKind[];
  max?: number;
  className?: string;
  onBadgeClick?: (kind: EventAwarenessKind) => void;
}

export const EventAwarenessBadgeRow = memo(function EventAwarenessBadgeRow({
  kinds,
  max = 3,
  className,
  onBadgeClick,
}: EventAwarenessBadgeRowProps) {
  if (kinds.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {kinds.slice(0, max).map((kind) => (
        <EventAwarenessBadge
          key={kind}
          kind={kind}
          onClick={onBadgeClick ? () => onBadgeClick(kind) : undefined}
        />
      ))}
    </div>
  );
});

export { AWARENESS_LABELS };
