"use client";

/**
 * Event Intelligence dashboard widget — compact executive redesign (Sprint 10D.5.1).
 * Presentation only. Reuses existing catalog / buckets / drawer wiring.
 */

import { useOptionalGlobalEventDrawer } from "@/components/events/GlobalEventDrawerProvider";
import { Card } from "@/components/ui/Card";
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
import {
  buildDashboardEventBuckets,
  dashboardEventService,
} from "@/src/core/events/integration";
import type { EventIntelligenceEvent, EventImportance } from "@/types/event";
import {
  Building2,
  Check,
  Landmark,
  LineChart,
  Scale,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";

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

/** Presentation countdown — Today / Tomorrow / N Days / hours / Completed. */
function formatRelativeCountdown(
  event: EventIntelligenceEvent,
  today: string
): string {
  const countdown = dashboardEventService.countdown(event.date, today);
  if (countdown.days < 0) return "Completed";

  if (countdown.days === 0 && event.time) {
    const [hh, mm] = event.time.split(":").map(Number);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      const now = new Date();
      const target = new Date();
      target.setHours(hh!, mm!, 0, 0);
      const diffMs = target.getTime() - now.getTime();
      if (diffMs <= 0) return "Today";
      const hours = Math.max(1, Math.round(diffMs / 3_600_000));
      if (hours <= 12) return `${hours} Hour${hours === 1 ? "" : "s"}`;
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

function formatClock(time: string): string {
  const [hhRaw, mmRaw] = time.split(":").map(Number);
  if (!Number.isFinite(hhRaw) || !Number.isFinite(mmRaw)) return time;
  const hh = hhRaw!;
  const mm = mmRaw!;
  const period = hh >= 12 ? "PM" : "AM";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  return `${hour12}:${String(mm).padStart(2, "0")} ${period}`;
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

function ImpactMeter({ score }: { score: number | null | undefined }) {
  const value = Math.max(0, Math.min(100, score ?? 0));
  const band = impactBand(score);
  return (
    <div className="flex min-w-[7.5rem] flex-col gap-0.5">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-overlay">
        <div
          className={cn("h-full rounded-full transition-[width]", impactBarClass(band))}
          style={{ width: `${value}%` }}
        />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold tabular-nums text-text-primary">
          Impact {Math.round(value)}
        </span>
        <span className="text-[10px] font-medium text-text-secondary">{band}</span>
      </div>
    </div>
  );
}

function ExecutiveEventRow({
  event,
  today,
  onOpen,
}: {
  event: EventIntelligenceEvent;
  today: string;
  onOpen: (event: EventIntelligenceEvent) => void;
}) {
  const Icon = categoryIcon(event);
  const colors = getEventTypeColors(event.eventType);
  const schedule = formatScheduleLine(event, today);
  const countdown = formatRelativeCountdown(event, today);

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      aria-label={`Open event details for ${event.title}`}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-left",
        "transition-[background-color,border-color,box-shadow] duration-150",
        "hover:border-surface-border-subtle hover:bg-surface-hover/55 hover:shadow-[var(--eos-shadow-card)]"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border",
          colors.bg,
          colors.border,
          colors.text
        )}
        aria-hidden
      >
        <Icon className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-tight text-text-primary">
          {shortTitle(event)}
        </p>
        <p className="mt-0.5 truncate text-[13px] leading-snug text-text-secondary">
          {event.company && event.ticker
            ? `${event.company} · ${schedule}`
            : event.company
              ? `${event.company} · ${schedule}`
              : event.macroDetail?.authority
                ? `${event.macroDetail.authority} · ${schedule}`
                : schedule}
        </p>
        <div className="mt-1 sm:hidden">
          <ImpactMeter score={event.impactScore} />
        </div>
      </div>

      <div className="hidden shrink-0 sm:block">
        <ImpactMeter score={event.impactScore} />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 self-start sm:self-center">
        <span className="text-[13px] font-bold tabular-nums text-text-primary">
          {countdown}
        </span>
        <span
          className={cn(
            "inline-flex rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
            importanceBadgeClass(event.importance)
          )}
        >
          {importanceLabel(event.importance)}
        </span>
      </div>
    </button>
  );
}

function SummaryStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "critical" | "neutral";
}) {
  return (
    <div className="rounded-md border border-surface-border-subtle/80 bg-surface/35 px-2 py-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-lg font-bold tabular-nums leading-none",
          tone === "critical" && value > 0
            ? "text-red-300"
            : "text-text-primary"
        )}
      >
        {value}
      </p>
    </div>
  );
}

/** Dashboard Event Intelligence composite — executive compact layout (10D.5.1). */
export function EventIntelligenceDashboardWidget() {
  const drawer = useOptionalGlobalEventDrawer();
  const today = useMemo(() => toDateKey(new Date()), []);
  const catalog = useMemo(() => buildEventSeedCatalog(today), [today]);
  const buckets = useMemo(
    () => buildDashboardEventBuckets(catalog, today),
    [catalog, today]
  );

  const horizonEnd = useMemo(() => addDays(today, 2), [today]);

  const next48h = useMemo(
    () =>
      catalog.filter(
        (event) =>
          event.date >= today &&
          event.date <= horizonEnd &&
          event.status !== "completed"
      ),
    [catalog, today, horizonEnd]
  );

  const summary = useMemo(() => {
    let critical = 0;
    let earnings = 0;
    let macro = 0;
    let corporate = 0;
    for (const event of next48h) {
      if (event.importance === "critical" || event.importance === "high") {
        critical += 1;
      }
      const category = getEventCategory(event.eventType);
      if (
        event.eventType === "quarterly_results" ||
        event.eventType === "annual_results" ||
        event.eventType === "conference_call"
      ) {
        earnings += 1;
      } else if (category === "corporate_actions") {
        corporate += 1;
      } else if (
        event.exchange === "MACRO" ||
        category === "economic" ||
        category === "central_bank"
      ) {
        macro += 1;
      }
    }

    const highestImpact = [...next48h].sort(
      (a, b) => (b.impactScore ?? 0) - (a.impactScore ?? 0)
    )[0] ?? null;

    const nextEvent =
      [...next48h].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return (a.time ?? "").localeCompare(b.time ?? "");
      })[0] ?? null;

    const nextCorporate =
      catalog
        .filter(
          (event) =>
            event.date >= today &&
            getEventCategory(event.eventType) === "corporate_actions"
        )
        .sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

    return {
      critical,
      earnings,
      macro,
      corporate,
      highestImpact,
      nextEvent,
      nextCorporate,
    };
  }, [next48h, catalog, today]);

  const topCritical = buckets.criticalUpcoming.slice(0, 5);

  const open = (event: EventIntelligenceEvent) => {
    if (drawer) drawer.openEvent(event);
  };

  return (
    <Card
      padding="sm"
      hover={false}
      className="h-full"
      data-testid="event-intelligence-dashboard"
    >
      <header className="mb-2.5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden />
            <h3 className="text-sm font-semibold text-text-primary">
              Event Intelligence
            </h3>
          </div>
          <p className="mt-0.5 text-[13px] text-text-secondary">Next 48 Hours</p>
        </div>
        <Link
          href="/events"
          className="shrink-0 text-[13px] font-semibold text-accent hover:underline"
        >
          Open Calendar →
        </Link>
      </header>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,7fr)_minmax(12rem,3fr)]">
        {/* LEFT — upcoming critical list */}
        <section aria-label="Upcoming critical events" className="min-w-0">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Upcoming Critical Events
          </p>
          {topCritical.length === 0 ? (
            <p className="rounded-lg border border-dashed border-surface-border-subtle px-3 py-4 text-[13px] text-text-secondary">
              No critical catalysts in the near term.
            </p>
          ) : (
            <ul className="divide-y divide-surface-border-subtle/70 rounded-lg border border-surface-border-subtle/80 bg-surface/25">
              {topCritical.map((event) => (
                <li key={event.id}>
                  <ExecutiveEventRow
                    event={event}
                    today={today}
                    onOpen={open}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Compact corporate note — never a large empty card */}
          {buckets.todaysCorporateActions.length === 0 ? (
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-surface-border-subtle/70 bg-surface/20 px-2.5 py-1.5 text-[13px]">
              <span className="inline-flex items-center gap-1 font-medium text-emerald-300">
                <Check className="h-3.5 w-3.5" aria-hidden />
                No Corporate Actions Today
              </span>
              {summary.nextCorporate ? (
                <button
                  type="button"
                  onClick={() => open(summary.nextCorporate!)}
                  className="text-left text-text-secondary transition-colors hover:text-text-primary"
                >
                  <span className="text-text-muted">Next · </span>
                  <span className="font-semibold text-text-primary">
                    {getEventTypeLabel(summary.nextCorporate.eventType)}
                  </span>
                  {summary.nextCorporate.ticker || summary.nextCorporate.company
                    ? ` · ${summary.nextCorporate.ticker ?? summary.nextCorporate.company}`
                    : ""}
                  <span className="ml-1 font-bold text-text-primary">
                    {formatRelativeCountdown(summary.nextCorporate, today)}
                  </span>
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {/* RIGHT — summary panel */}
        <aside
          aria-label="Event summary"
          className="flex flex-col gap-2 rounded-lg border border-surface-border-subtle/80 bg-surface/30 p-2.5"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
            Summary
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            <SummaryStat label="Critical" value={summary.critical} tone="critical" />
            <SummaryStat label="Earnings" value={summary.earnings} />
            <SummaryStat label="Macro" value={summary.macro} />
            <SummaryStat label="Corporate" value={summary.corporate} />
          </div>

          <div className="rounded-md border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
              Highest Impact
            </p>
            {summary.highestImpact ? (
              <button
                type="button"
                onClick={() => open(summary.highestImpact!)}
                className="mt-1 w-full text-left transition-opacity hover:opacity-90"
              >
                <p className="truncate text-[13px] font-semibold text-text-primary">
                  {shortTitle(summary.highestImpact)}
                </p>
                <div className="mt-1.5">
                  <ImpactMeter score={summary.highestImpact.impactScore} />
                </div>
              </button>
            ) : (
              <p className="mt-1 text-[13px] text-text-secondary">None in window</p>
            )}
          </div>

          <div className="rounded-md border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-text-secondary">
              Next Event
            </p>
            {summary.nextEvent ? (
              <button
                type="button"
                onClick={() => open(summary.nextEvent!)}
                className="mt-1 w-full text-left transition-opacity hover:opacity-90"
              >
                <p className="truncate text-[13px] font-semibold text-text-primary">
                  {shortTitle(summary.nextEvent)}
                </p>
                <p className="mt-0.5 text-[13px] font-bold text-text-primary">
                  {formatScheduleLine(summary.nextEvent, today)}
                </p>
              </button>
            ) : (
              <p className="mt-1 text-[13px] text-text-secondary">None scheduled</p>
            )}
          </div>
        </aside>
      </div>
    </Card>
  );
}
