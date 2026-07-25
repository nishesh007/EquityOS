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

  const upcomingEarningsEvents: EventIntelligenceEvent[] = [];
  const corporateEvents: EventIntelligenceEvent[] = [];
  const economicEvents: EventIntelligenceEvent[] = [];

  for (const event of events) {
    const category = getEventCategory(event.eventType);
    if (event.date === today) todayCount += 1;
    if (event.date >= weekStart && event.date <= weekEnd) weekCount += 1;
    if (event.importance === "critical") criticalCount += 1;
    if (category === "results" && event.date >= today) {
      upcomingEarningsEvents.push(event);
    }
    if (category === "corporate_actions" || category === "ipo") {
      corporateEvents.push(event);
    }
    if (category === "economic" || category === "central_bank") {
      economicEvents.push(event);
    }
  }

  upcomingEarningsEvents.sort((a, b) => a.date.localeCompare(b.date));
  corporateEvents.sort((a, b) => a.date.localeCompare(b.date));
  const nextEarn = upcomingEarningsEvents[0];
  const nextCorp = corporateEvents.find((e) => e.date >= today) ?? corporateEvents[0];
  const topEconomic = [...economicEvents].sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
    return rank[a.importance] - rank[b.importance];
  })[0];

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
      value: upcomingEarningsEvents.length,
      subtitle: nextEarn
        ? `${nextEarn.ticker ?? nextEarn.company ?? "Next"} · ${nextEarn.date}`
        : "No upcoming prints",
      icon: LineChart,
      tone: "results",
    },
    {
      id: "corporate",
      label: "Corporate Actions",
      value: corporateEvents.length,
      subtitle: nextCorp
        ? `${nextCorp.ticker ?? nextCorp.title} · ${nextCorp.date}`
        : "No actions queued",
      icon: Scale,
      tone: "corporate_actions",
    },
    {
      id: "economic",
      label: "Economic Events",
      value: economicEvents.length,
      subtitle: topEconomic
        ? `${topEconomic.importance} · ${topEconomic.title}`
        : "No macro events",
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
        <p className="text-[11px] font-medium leading-none text-text-secondary">
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
        <p className="mt-1 truncate text-[10px] text-text-muted">
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

export function computeMacroDashboardStats(
  events: readonly EventIntelligenceEvent[],
  today: string = toDateKey(new Date())
): EventStatMetric[] {
  const macro = events.filter((e) => e.macroDetail != null);
  const upcoming = macro.filter(
    (e) => e.date >= today && e.status !== "completed"
  );
  const todays = macro.filter((e) => e.date === today);
  const critical = macro.filter(
    (e) => e.importance === "critical" || e.importance === "high"
  );
  const centralBanks = macro.filter(
    (e) => e.macroDetail?.theme === "central_bank"
  );
  const inflation = macro.filter((e) => e.macroDetail?.theme === "inflation");
  const growth = macro.filter((e) => e.macroDetail?.theme === "growth");

  const nextCritical = [...critical]
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  return [
    {
      id: "macro-upcoming",
      label: "Upcoming Macro",
      value: upcoming.length,
      subtitle: "Scheduled releases",
      icon: CalendarDays,
      tone: "economic",
    },
    {
      id: "macro-today",
      label: "Today's Macro",
      value: todays.length,
      subtitle: "Releases today",
      icon: Landmark,
      tone: "accent",
    },
    {
      id: "macro-critical",
      label: "Highest Importance",
      value: critical.length,
      subtitle: nextCritical
        ? `${nextCritical.title.slice(0, 28)}`
        : "No critical macro",
      icon: AlertTriangle,
      tone: "critical",
    },
    {
      id: "macro-cb",
      label: "Central Bank Events",
      value: centralBanks.length,
      subtitle: "RBI · Fed · ECB · BOJ",
      icon: Building2,
      tone: "central_bank",
    },
    {
      id: "macro-inflation",
      label: "Inflation Events",
      value: inflation.length,
      subtitle: "CPI · Core · WPI · PPI",
      icon: LineChart,
      tone: "amber",
    },
    {
      id: "macro-growth",
      label: "Growth Events",
      value: growth.length,
      subtitle: "GDP · IIP · PMI",
      icon: Scale,
      tone: "results",
    },
  ];
}

interface MacroDashboardStripProps {
  events: readonly EventIntelligenceEvent[];
  today: string;
  className?: string;
}

export const MacroDashboardStrip = memo(function MacroDashboardStrip({
  events,
  today,
  className,
}: MacroDashboardStripProps) {
  const metrics = useMemo(
    () => computeMacroDashboardStats(events, today),
    [events, today]
  );

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6",
        className
      )}
      data-testid="macro-dashboard-strip"
      aria-label="Macro economic dashboard"
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
    "listing",
    "delisting",
    "ipo",
    "merger",
    "demerger",
    "open_offer",
  ] as EventType[],
  economic: [
    "rbi_policy",
    "rbi_minutes",
    "rbi_governor_speech",
    "fed_meeting",
    "fomc_minutes",
    "ecb_policy",
    "boj_policy",
    "gdp",
    "quarterly_gdp",
    "cpi",
    "core_cpi",
    "wpi",
    "ppi",
    "pmi",
    "pmi_services",
    "iip",
    "nfp",
    "unemployment_rate",
    "trade_balance",
    "current_account",
    "forex_reserves",
    "repo_rate",
    "reverse_repo",
    "crr",
    "slr",
    "fiscal_budget",
    "gst_collection",
    "government_borrowing",
    "oil_inventory",
    "crude_prices",
    "msci_review",
    "ftse_review",
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
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-primary">
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
                  ? "cursor-not-allowed border-surface-border-subtle bg-surface-overlay/30 text-text-muted"
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
                  action.disabled ? "text-text-muted" : colors.text
                )}
                aria-hidden
              />
              {action.label}
              {action.disabled ? (
                <span className="rounded border border-surface-border-subtle px-1 py-px text-[9px] font-medium uppercase tracking-wide text-text-muted">
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
