"use client";

import { EventBadges } from "@/components/events/EventBadges";
import {
  EVENT_IMPORTANCE_LABELS,
  getEventCategory,
  getEventTypeLabel,
} from "@/constants/eventTypes";
import {
  getEventTypeColors,
  getImportanceColors,
} from "@/constants/eventColors";
import { deriveEventBadges } from "@/src/core/events/EventDrawerPresenter";
import { formatShortDate, toDateKey } from "@/src/core/events";
import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import type { EventIntelligenceEvent } from "@/types/event";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  Landmark,
  LineChart,
  Megaphone,
  Rocket,
  Scale,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  results: LineChart,
  corporate_actions: Scale,
  economic: Landmark,
  central_bank: Landmark,
  ipo: Rocket,
  critical: Megaphone,
  neutral: Sparkles,
};

interface EventCardProps {
  event: EventIntelligenceEvent;
  compact?: boolean;
  onViewDetails?: (event: EventIntelligenceEvent) => void;
}

function intelligencePreview(event: EventIntelligenceEvent): string | null {
  if (event.earningsDetail) {
    const e = event.earningsDetail.estimates;
    const parts = [
      event.earningsDetail.quarter,
      event.earningsDetail.financialYear,
      e.expectedRevenueCr != null
        ? `Rev ₹${e.expectedRevenueCr.toLocaleString("en-IN")} Cr`
        : null,
      e.expectedEps != null ? `EPS ${e.expectedEps.toFixed(2)}` : null,
    ].filter(Boolean);
    return parts.join(" · ");
  }
  if (event.corporateActionDetail?.kind === "dividend") {
    const d = event.corporateActionDetail;
    return `₹${d.amountPerShare.toFixed(2)} · Yield ${d.yieldPct?.toFixed(2) ?? "—"}% · Ex ${formatShortDate(d.exDate)}`;
  }
  if (event.corporateActionDetail?.kind === "buyback") {
    const d = event.corporateActionDetail;
    return `₹${d.pricePerShare.toLocaleString("en-IN")} · ₹${d.offerSizeCr.toLocaleString("en-IN")} Cr`;
  }
  if (event.corporateActionDetail?.kind === "bonus") {
    return `Bonus ${event.corporateActionDetail.ratio}`;
  }
  if (event.corporateActionDetail?.kind === "stock_split") {
    return `Split ${event.corporateActionDetail.ratio}`;
  }
  if (event.corporateActionDetail?.kind === "rights_issue") {
    const d = event.corporateActionDetail;
    return `Rights ${d.ratio} @ ₹${d.issuePrice}`;
  }
  if (event.macroDetail) {
    const m = event.macroDetail;
    const ind = m.indicator;
    const parts = [
      m.authority,
      ind.actual != null
        ? `Act ${ind.actual}${ind.unit ? ` ${ind.unit}` : ""}`
        : ind.forecast != null
          ? `Fcst ${ind.forecast}${ind.unit ? ` ${ind.unit}` : ""}`
          : null,
      m.marketImpact.direction,
      `Vol ${m.marketImpact.volatility}`,
    ].filter(Boolean);
    return parts.join(" · ");
  }
  return null;
}

export function EventCard({
  event,
  compact = false,
  onViewDetails,
}: EventCardProps) {
  const category = getEventCategory(event.eventType);
  const colors = getEventTypeColors(event.eventType);
  const importanceColors = getImportanceColors(event.importance);
  const Icon = CATEGORY_ICONS[category] ?? Sparkles;
  const today = useMemo(() => toDateKey(new Date()), []);
  const badges = useMemo(
    () => deriveEventBadges(event, today),
    [event, today]
  );
  const preview = intelligencePreview(event);

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-raised/80 shadow-card transition-[border-color,box-shadow] duration-200",
        "hover:border-surface-border hover:shadow-floating",
        compact ? "p-3" : "p-4"
      )}
      data-testid="event-card"
      data-event-id={event.id}
    >
      <div
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-1", colors.strip)}
      />

      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
            colors.bg,
            colors.border,
            colors.text
          )}
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-text-primary">
                {event.title}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                {event.company ? (
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3 w-3" aria-hidden />
                    <span className="truncate">{event.company}</span>
                  </span>
                ) : (
                  <span className="text-text-faint">Macro / Market</span>
                )}
                {event.ticker ? (
                  <span className="font-mono text-[11px] font-semibold text-text-secondary">
                    {event.ticker}
                  </span>
                ) : null}
                {event.sector ? (
                  <span className="text-[11px] text-text-faint">{event.sector}</span>
                ) : null}
                {event.marketCap !== "unknown" ? (
                  <span className="text-[11px] capitalize text-text-faint">
                    {event.marketCap} cap
                  </span>
                ) : null}
              </div>
            </div>

            <span
              className={cn(
                "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                importanceColors.chip
              )}
            >
              {EVENT_IMPORTANCE_LABELS[event.importance]}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
                colors.chip
              )}
            >
              {getEventTypeLabel(event.eventType)}
            </span>
            <EventBadges badges={badges} />
            <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
              <CalendarDays className="h-3 w-3" aria-hidden />
              {formatShortDate(event.date)}
            </span>
            {event.time ? (
              <span className="inline-flex items-center gap-1 text-[11px] text-text-muted">
                <Clock3 className="h-3 w-3" aria-hidden />
                {event.time} IST
              </span>
            ) : (
              <span className="text-[11px] text-text-faint">All day</span>
            )}
          </div>

          {!compact && preview ? (
            <p className="mt-2 line-clamp-1 font-mono text-[11px] text-text-secondary">
              {preview}
            </p>
          ) : null}

          {!compact && !preview && event.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-muted">
              {event.description}
            </p>
          ) : null}

          <div className="mt-3">
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border border-surface-border-subtle bg-surface-overlay/40 px-2.5 py-1.5 text-[11px] font-semibold text-text-secondary transition-colors",
                "hover:border-surface-border hover:bg-surface-hover hover:text-text-primary",
                FOCUS_RING_CLASS
              )}
              aria-label={`View details for ${event.title}`}
              onClick={() => onViewDetails?.(event)}
            >
              View Details
              <ChevronRight className="h-3 w-3" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
