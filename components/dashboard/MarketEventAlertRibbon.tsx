"use client";

/**
 * Market Event Alert Ribbon — Sprint 10D.5.2.
 * Dashboard presentation only. Reuses Event Intelligence catalog + drawer.
 */

import { useOptionalGlobalEventDrawer } from "@/components/events/GlobalEventDrawerProvider";
import {
  getEventCategory,
  getEventTypeLabel,
} from "@/constants/eventTypes";
import { getEventTypeColors } from "@/constants/eventColors";
import { cn } from "@/lib/utils";
import {
  addDays,
  buildEventSeedCatalog,
  toDateKey,
} from "@/src/core/events";
import { dashboardEventService } from "@/src/core/events/integration";
import type { EventIntelligenceEvent, EventImportance } from "@/types/event";
import {
  AlertTriangle,
  Building2,
  Check,
  Landmark,
  LineChart,
  Scale,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ImpactBand = "Very High" | "High" | "Medium" | "Low";

function impactBand(score: number | null | undefined): ImpactBand {
  const value = score ?? 0;
  if (value >= 80) return "Very High";
  if (value >= 65) return "High";
  if (value >= 45) return "Medium";
  return "Low";
}

function impactBarClass(band: ImpactBand): string {
  switch (band) {
    case "Very High":
      return "bg-red-400";
    case "High":
      return "bg-amber-400";
    case "Medium":
      return "bg-sky-400";
    default:
      return "bg-zinc-400";
  }
}

function importanceBadgeClass(importance: EventImportance): string {
  switch (importance) {
    case "critical":
      return "border-red-400/50 bg-red-500/20 text-red-200";
    case "high":
      return "border-amber-400/50 bg-amber-500/20 text-amber-200";
    case "medium":
      return "border-sky-400/45 bg-sky-500/15 text-sky-200";
    default:
      return "border-zinc-400/40 bg-zinc-500/15 text-zinc-300";
  }
}

function importanceLabel(importance: EventImportance): string {
  switch (importance) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}

function priorityRank(importance: EventImportance): number {
  switch (importance) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    default:
      return 3;
  }
}

function categoryIcon(event: EventIntelligenceEvent): LucideIcon {
  const category = getEventCategory(event.eventType);
  switch (category) {
    case "central_bank":
    case "economic":
      return Landmark;
    case "results":
      return LineChart;
    case "corporate_actions":
      return Scale;
    default:
      return Building2;
  }
}

function formatClock(time: string): string {
  const [hhRaw, mmRaw] = time.split(":").map(Number);
  if (!Number.isFinite(hhRaw) || !Number.isFinite(mmRaw)) return time;
  const hh = hhRaw!;
  const mm = mmRaw!;
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")} ${period}`;
}

function formatRelativeCountdown(
  event: EventIntelligenceEvent,
  today: string,
  allowHours: boolean
): string {
  const countdown = dashboardEventService.countdown(event.date, today);
  if (countdown.days < 0) return "Completed";

  if (allowHours && countdown.days === 0 && event.time) {
    const [hh, mm] = event.time.split(":").map(Number);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      const now = new Date();
      const target = new Date();
      target.setHours(hh!, mm!, 0, 0);
      const diffMs = target.getTime() - now.getTime();
      if (diffMs > 0) {
        const hours = Math.max(1, Math.round(diffMs / 3_600_000));
        if (hours <= 18) return `${hours} Hour${hours === 1 ? "" : "s"}`;
      }
    }
    return "Today";
  }

  if (countdown.days === 0) return "Today";
  if (countdown.days === 1) return "Tomorrow";
  return `${countdown.days} Days`;
}

function formatScheduleLine(
  event: EventIntelligenceEvent,
  today: string
): string {
  const countdown = dashboardEventService.countdown(event.date, today);
  if (countdown.days < 0) return "Completed";

  let dayLabel = "Today";
  if (countdown.days === 1) dayLabel = "Tomorrow";
  else if (countdown.days > 1) dayLabel = `${countdown.days} Days`;

  if (event.time) return `${dayLabel} · ${formatClock(event.time)}`;
  return dayLabel;
}

function shortTitle(event: EventIntelligenceEvent): string {
  if (event.macroDetail) {
    return event.title
      .replace(/\s*\(.*?\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  if (
    event.eventType === "quarterly_results" ||
    event.eventType === "annual_results"
  ) {
    const company = event.ticker || event.company || "Results";
    return `${company} Results`;
  }
  return event.title;
}

function isEarnings(event: EventIntelligenceEvent): boolean {
  return (
    event.eventType === "quarterly_results" ||
    event.eventType === "annual_results" ||
    event.eventType === "conference_call"
  );
}

function isMacro(event: EventIntelligenceEvent): boolean {
  const category = getEventCategory(event.eventType);
  return (
    event.exchange === "MACRO" ||
    category === "economic" ||
    category === "central_bank"
  );
}

function isCorporate(event: EventIntelligenceEvent): boolean {
  return getEventCategory(event.eventType) === "corporate_actions";
}

function sortByAlertPriority(
  a: EventIntelligenceEvent,
  b: EventIntelligenceEvent
): number {
  const byImportance = priorityRank(a.importance) - priorityRank(b.importance);
  if (byImportance !== 0) return byImportance;
  const byDate = a.date.localeCompare(b.date);
  if (byDate !== 0) return byDate;
  const byTime = (a.time ?? "").localeCompare(b.time ?? "");
  if (byTime !== 0) return byTime;
  return (b.impactScore ?? 0) - (a.impactScore ?? 0);
}

function ImpactMeter({ score }: { score: number | null | undefined }) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const band = impactBand(score);
  return (
    <div className="flex min-w-[5.5rem] flex-col gap-0.5">
      <div className="h-1 w-full overflow-hidden rounded-full bg-surface-overlay">
        <div
          className={cn("h-full rounded-full", impactBarClass(band))}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[10px] font-semibold tabular-nums text-text-primary">
          {Math.round(value)}
        </span>
        <span className="text-[9px] font-medium text-text-secondary">{band}</span>
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "critical" | "high" | "neutral";
}) {
  return (
    <div className="min-w-[3.75rem] rounded-md border border-white/10 bg-black/20 px-2 py-1 backdrop-blur-sm">
      <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
        {label}
      </p>
      <p
        className={cn(
          "text-base font-bold tabular-nums leading-none",
          tone === "critical" && value > 0
            ? "text-red-300"
            : tone === "high" && value > 0
              ? "text-amber-300"
              : "text-text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AlertEventCard({
  event,
  today,
  allowHours,
  onOpen,
}: {
  event: EventIntelligenceEvent;
  today: string;
  allowHours: boolean;
  onOpen: (event: EventIntelligenceEvent) => void;
}) {
  const Icon = categoryIcon(event);
  const colors = getEventTypeColors(event.eventType);
  const schedule = formatScheduleLine(event, today);
  const countdown = formatRelativeCountdown(event, today, allowHours);

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      aria-label={`Open event details for ${event.title}`}
      className={cn(
        "flex min-w-[15.5rem] max-w-[18rem] shrink-0 items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-left backdrop-blur-sm",
        "transition-[border-color,background-color,box-shadow] duration-150",
        "hover:border-white/20 hover:bg-black/35 hover:shadow-[var(--eos-shadow-card)]"
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
          colors.bg,
          colors.border,
          colors.text
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold leading-tight text-text-primary">
          {shortTitle(event)}
        </p>
        <p className="mt-0.5 truncate text-[11px] text-text-secondary">
          {event.company
            ? `${event.company} · ${schedule}`
            : event.macroDetail?.authority
              ? `${event.macroDetail.authority} · ${schedule}`
              : schedule}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="text-[11px] font-bold tabular-nums text-text-primary">
          {countdown}
        </span>
        <ImpactMeter score={event.impactScore} />
        <span
          className={cn(
            "inline-flex rounded border px-1 py-px text-[8px] font-semibold uppercase tracking-wide",
            importanceBadgeClass(event.importance)
          )}
        >
          {importanceLabel(event.importance)}
        </span>
      </div>
    </button>
  );
}

/** Premium institutional alert ribbon — first surface under the dashboard header. */
export function MarketEventAlertRibbon() {
  const drawer = useOptionalGlobalEventDrawer();
  const [allowHours, setAllowHours] = useState(false);
  const today = useMemo(() => toDateKey(new Date()), []);
  const horizonEnd = useMemo(() => addDays(today, 2), [today]);

  useEffect(() => {
    setAllowHours(true);
  }, []);

  const catalog = useMemo(() => buildEventSeedCatalog(today), [today]);

  const model = useMemo(() => {
    const windowEvents = catalog.filter(
      (event) =>
        event.date >= today &&
        event.date <= horizonEnd &&
        event.status !== "completed" &&
        event.status !== "cancelled"
    );

    const major = windowEvents.filter(
      (event) =>
        event.importance === "critical" ||
        event.importance === "high" ||
        (event.impactScore ?? 0) >= 65
    );

    const prioritized = [...major].sort(sortByAlertPriority);
    const preview = prioritized.slice(0, 3);

    const counts = {
      critical: windowEvents.filter((e) => e.importance === "critical").length,
      high: windowEvents.filter((e) => e.importance === "high").length,
      earnings: windowEvents.filter(isEarnings).length,
      macro: windowEvents.filter(isMacro).length,
      corporate: windowEvents.filter(isCorporate).length,
    };

    const nextScheduled =
      catalog
        .filter(
          (event) =>
            event.date >= today &&
            event.status !== "completed" &&
            event.status !== "cancelled"
        )
        .sort(sortByAlertPriority)[0] ?? null;

    return { preview, counts, nextScheduled, hasMajor: major.length > 0 };
  }, [catalog, today, horizonEnd]);

  const open = (event: EventIntelligenceEvent) => {
    drawer?.openEvent(event);
  };

  return (
    <section
      aria-label="Market event alerts"
      data-testid="market-event-alert-ribbon"
      className={cn(
        "relative mb-3 overflow-hidden rounded-xl border border-amber-400/25",
        "bg-gradient-to-r from-amber-500/10 via-surface-raised/80 to-red-500/10",
        "shadow-[var(--eos-shadow-card)] backdrop-blur-xl",
        "max-h-[110px] px-3 py-2"
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-amber-400 via-red-400 to-amber-500/40"
      />

      <div className="flex flex-col gap-1.5 md:gap-2 xl:flex-row xl:items-center xl:gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 xl:max-w-[38%] xl:flex-nowrap">
          <div className="min-w-0 shrink-0 pr-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle
                className="h-3.5 w-3.5 shrink-0 text-amber-300"
                aria-hidden
              />
              <h2 className="text-[13px] font-semibold text-text-primary">
                Market Event Alert
              </h2>
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-text-secondary">
              High-impact events over the next 48 hours
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <SummaryChip
              label="Critical"
              value={model.counts.critical}
              tone="critical"
            />
            <SummaryChip label="High" value={model.counts.high} tone="high" />
            <SummaryChip label="Earnings" value={model.counts.earnings} />
            <SummaryChip label="Macro" value={model.counts.macro} />
            <SummaryChip label="Corporate" value={model.counts.corporate} />
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {model.hasMajor ? (
            <div className="-mx-0.5 flex gap-2 overflow-x-auto px-0.5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap xl:flex-nowrap xl:overflow-visible">
              {model.preview.map((event) => (
                <AlertEventCard
                  key={event.id}
                  event={event}
                  today={today}
                  allowHours={allowHours}
                  onOpen={open}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/10 bg-black/20 px-2.5 py-1.5 text-[12px] backdrop-blur-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300">
                <Check className="h-3.5 w-3.5" aria-hidden />
                No High-Impact Events in the Next 48 Hours
              </span>
              {model.nextScheduled ? (
                <button
                  type="button"
                  onClick={() => open(model.nextScheduled!)}
                  className="text-left text-text-secondary transition-colors hover:text-text-primary"
                >
                  <span className="text-text-muted">Next scheduled · </span>
                  <span className="font-semibold text-text-primary">
                    {getEventTypeLabel(model.nextScheduled.eventType)}
                    {model.nextScheduled.ticker
                      ? ` · ${model.nextScheduled.ticker}`
                      : model.nextScheduled.company
                        ? ` · ${model.nextScheduled.company}`
                        : ""}
                  </span>
                  <span className="ml-1.5 font-bold text-text-primary">
                    {formatRelativeCountdown(
                      model.nextScheduled,
                      today,
                      allowHours
                    )}
                  </span>
                </button>
              ) : null}
            </div>
          )}
        </div>

        <Link
          href="/events"
          className="shrink-0 self-start rounded-md border border-white/15 bg-black/25 px-2.5 py-1.5 text-[11px] font-semibold text-accent backdrop-blur-sm transition-colors hover:border-accent/40 hover:bg-accent/10 xl:self-center"
        >
          View Calendar →
        </Link>
      </div>
    </section>
  );
}
