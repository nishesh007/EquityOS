"use client";

import { getEventCategory } from "@/constants/eventTypes";
import { EVENT_CATEGORY_COLORS } from "@/constants/eventColors";
import {
  addDays,
  startOfWeek,
  toDateKey,
} from "@/src/core/events";
import { cn } from "@/lib/utils";
import type { EventIntelligenceEvent, EventType } from "@/types/event";
import {
  AlertTriangle,
  Building2,
  CalendarDays,
  Landmark,
  LineChart,
  Scale,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { memo, useMemo } from "react";

export interface EventStatMetric {
  id: string;
  label: string;
  value: number;
  subtitle: string;
  icon: LucideIcon;
  tone: keyof typeof EVENT_CATEGORY_COLORS | "accent" | "amber";
}

function toneClasses(tone: EventStatMetric["tone"]) {
  if (tone === "accent") {
    return {
      text: "text-accent",
      bg: "bg-accent/10",
      border: "border-accent/20",
    };
  }
  if (tone === "amber") {
    return {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    };
  }
  const colors = EVENT_CATEGORY_COLORS[tone];
  return {
    text: colors.text,
    bg: colors.bg,
    border: colors.border,
  };
}

export function computeEventStats(
  events: readonly EventIntelligenceEvent[],
  today: string = toDateKey(new Date())
): EventStatMetric[] {
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 6);

  let todayCount = 0;
  let weekCount = 0;
  let criticalCount = 0;
  let upcomingEarnings = 0;
  let corporateCount = 0;
  let economicCount = 0;

  for (const event of events) {
    const category = getEventCategory(event.eventType);
    if (event.date === today) todayCount += 1;
    if (event.date >= weekStart && event.date <= weekEnd) weekCount += 1;
    if (event.importance === "critical") criticalCount += 1;
    if (category === "results" && event.date >= today) upcomingEarnings += 1;
    if (category === "corporate_actions") corporateCount += 1;
    if (category === "economic" || category === "central_bank") {
      economicCount += 1;
    }
  }

  return [
    {
      id: "today",
      label: "Today's Events",
      value: todayCount,
      subtitle: "Scheduled today",
      icon: CalendarDays,
      tone: "accent",
    },
    {
      id: "week",
      label: "This Week",
      value: weekCount,
      subtitle: "Mon–Sun window",
      icon: Building2,
      tone: "amber",
    },
    {
      id: "critical",
      label: "Critical Events",
      value: criticalCount,
      subtitle: "High vigilance",
      icon: AlertTriangle,
      tone: "critical",
    },
    {
      id: "earnings",
      label: "Upcoming Earnings",
      value: upcomingEarnings,
      subtitle: "Results ahead",
      icon: LineChart,
      tone: "results",
    },
    {
      id: "corporate",
      label: "Corporate Actions",
      value: corporateCount,
      subtitle: "In catalog",
      icon: Scale,
      tone: "corporate_actions",
    },
    {
      id: "economic",
      label: "Economic Events",
      value: economicCount,
      subtitle: "Macro & policy",
      icon: Landmark,
      tone: "economic",
    },
  ];
}

const StatCard = memo(function StatCard({ metric }: { metric: EventStatMetric }) {
  const tones = toneClasses(metric.tone);
  const Icon = metric.icon;
  return (
    <div
      className={cn(
        "group flex min-w-0 items-start gap-2.5 rounded-lg border bg-surface-raised/60 px-3 py-2.5 transition-[border-color,background-color] duration-150",
        "hover:bg-surface-hover/40",
        tones.border
      )}
      data-testid={`event-stat-${metric.id}`}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
          tones.bg,
          tones.text
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium leading-none text-text-muted">
          {metric.label}
        </p>
        <p
          className={cn(
            "mt-1 font-mono text-[22px] font-semibold leading-none tabular-nums tracking-tight",
            tones.text
          )}
        >
          {metric.value}
        </p>
        <p className="mt-1 truncate text-[10px] text-text-faint">
          {metric.subtitle}
        </p>
      </div>
    </div>
  );
});

interface EventStatsStripProps {
  events: readonly EventIntelligenceEvent[];
  today: string;
  className?: string;
}

export const EventStatsStrip = memo(function EventStatsStrip({
  events,
  today,
  className,
}: EventStatsStripProps) {
  const metrics = useMemo(
    () => computeEventStats(events, today),
    [events, today]
  );

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6",
        className
      )}
      data-testid="event-stats-strip"
      aria-label="Event statistics"
    >
      {metrics.map((metric) => (
        <StatCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
});

/** Event type IDs for quick-action presets (presentation only). */
export const QUICK_ACTION_PRESETS = {
  earnings: [
    "quarterly_results",
    "annual_results",
    "conference_call",
  ] as EventType[],
  corporate: [
    "dividend",
    "bonus",
    "stock_split",
    "rights_issue",
    "buyback",
    "agm",
    "egm",
  ] as EventType[],
  economic: [
    "rbi_policy",
    "fed_meeting",
    "gdp",
    "cpi",
    "wpi",
    "pmi",
    "iip",
    "trade_balance",
    "forex_reserves",
    "generic_economic",
  ] as EventType[],
} as const;

interface EventQuickActionsProps {
  onApplyEarnings: () => void;
  onApplyCorporate: () => void;
  onApplyEconomic: () => void;
}

export const EventQuickActions = memo(function EventQuickActions({
  onApplyEarnings,
  onApplyCorporate,
  onApplyEconomic,
}: EventQuickActionsProps) {
  const actions = [
    {
      id: "earnings",
      label: "Upcoming Earnings",
      icon: LineChart,
      onClick: onApplyEarnings,
      disabled: false,
      tone: "results" as const,
    },
    {
      id: "corporate",
      label: "Corporate Actions",
      icon: Scale,
      onClick: onApplyCorporate,
      disabled: false,
      tone: "corporate_actions" as const,
    },
    {
      id: "economic",
      label: "Economic Events",
      icon: Landmark,
      onClick: onApplyEconomic,
      disabled: false,
      tone: "economic" as const,
    },
    {
      id: "ai-summary",
      label: "AI Summary",
      icon: Sparkles,
      onClick: () => undefined,
      disabled: true,
      tone: "neutral" as const,
    },
  ];

  return (
    <div data-testid="event-quick-actions">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-faint">
        Quick Actions
      </p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const colors = EVENT_CATEGORY_COLORS[action.tone];
          return (
            <button
              key={action.id}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              aria-label={
                action.disabled
                  ? `${action.label} (Coming Soon)`
                  : action.label
              }
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-semibold transition-[border-color,background-color,color,transform] duration-150",
                action.disabled
                  ? "cursor-not-allowed border-surface-border-subtle bg-surface-overlay/30 text-text-faint"
                  : cn(
                      "border-surface-border-subtle bg-surface-raised/50 text-text-secondary",
                      "hover:border-opacity-40 hover:bg-surface-hover hover:text-text-primary active:scale-[0.98]",
                      colors.border
                    )
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5",
                  action.disabled ? "text-text-faint" : colors.text
                )}
                aria-hidden
              />
              {action.label}
              {action.disabled ? (
                <span className="rounded border border-surface-border-subtle px-1 py-px text-[9px] font-medium uppercase tracking-wide text-text-faint">
                  Soon
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
});
