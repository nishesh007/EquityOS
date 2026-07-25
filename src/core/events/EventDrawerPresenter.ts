/**
 * Event detail drawer presenter (Sprint 10D.2).
 * Pure view-model mapping — no UI.
 */

import { getEventCategory, getEventTypeLabel } from "@/constants/eventTypes";
import { addDays, formatDisplayDate, formatShortDate } from "@/src/core/events/EventFilters";
import type { EventIntelligenceEvent } from "@/types/event";
import type { CorporateActionDetails } from "@/types/corporateActions";

export type EventBadgeKind =
  | "upcoming"
  | "completed"
  | "today"
  | "tomorrow"
  | "live"
  | "high_impact"
  | "dividend"
  | "bonus"
  | "split"
  | "buyback";

export interface EventDrawerMetric {
  label: string;
  value: string;
}

export interface EventDrawerView {
  event: EventIntelligenceEvent;
  title: string;
  subtitle: string;
  badges: EventBadgeKind[];
  summary: string;
  timeline: Array<{ label: string; value: string }>;
  companySnapshot: EventDrawerMetric[];
  upcomingDates: EventDrawerMetric[];
  financialSummary: EventDrawerMetric[];
  corporateActionRows: EventDrawerMetric[];
  historicalRows: EventDrawerMetric[];
  historicalQuarters: Array<{
    label: string;
    revenue: string;
    eps: string;
    result: string;
  }>;
  relatedNewsPlaceholder: string;
  aiPreviewPlaceholder: string;
}

function moneyCr(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `₹${value.toLocaleString("en-IN")} Cr`;
}

function pct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function num(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toFixed(digits);
}

export function deriveEventBadges(
  event: EventIntelligenceEvent,
  today: string
): EventBadgeKind[] {
  const badges: EventBadgeKind[] = [];
  if (event.status === "live") badges.push("live");
  else if (event.status === "today" || event.date === today) badges.push("today");
  else if (event.status === "tomorrow" || event.date === addDays(today, 1)) {
    badges.push("tomorrow");
  } else if (event.status === "completed" || event.date < today) {
    badges.push("completed");
  } else {
    badges.push("upcoming");
  }

  if (event.importance === "critical" || event.importance === "high") {
    badges.push("high_impact");
  }

  if (event.eventType === "dividend") badges.push("dividend");
  if (event.eventType === "bonus") badges.push("bonus");
  if (event.eventType === "stock_split") badges.push("split");
  if (event.eventType === "buyback") badges.push("buyback");

  return badges;
}

function corporateActionRows(
  detail: CorporateActionDetails | null | undefined
): EventDrawerMetric[] {
  if (!detail) return [];
  switch (detail.kind) {
    case "dividend":
      return [
        { label: "Amount", value: `₹${detail.amountPerShare.toFixed(2)}` },
        { label: "Yield", value: pct(detail.yieldPct) },
        { label: "Ex-Date", value: formatShortDate(detail.exDate) },
        { label: "Record Date", value: formatShortDate(detail.recordDate) },
        {
          label: "Payment Date",
          value: detail.paymentDate
            ? formatShortDate(detail.paymentDate)
            : "—",
        },
        { label: "Frequency", value: detail.frequency },
      ];
    case "bonus":
      return [
        { label: "Ratio", value: detail.ratio },
        { label: "Effective Date", value: formatShortDate(detail.effectiveDate) },
      ];
    case "stock_split":
      return [
        { label: "Ratio", value: detail.ratio },
        { label: "Face Value Before", value: `₹${detail.faceValueBefore}` },
        { label: "Face Value After", value: `₹${detail.faceValueAfter}` },
        { label: "Effective Date", value: formatShortDate(detail.effectiveDate) },
      ];
    case "buyback":
      return [
        { label: "Price", value: `₹${detail.pricePerShare.toLocaleString("en-IN")}` },
        { label: "Offer Size", value: moneyCr(detail.offerSizeCr) },
        {
          label: "Record Date",
          value: detail.recordDate ? formatShortDate(detail.recordDate) : "—",
        },
        { label: "Open Date", value: formatShortDate(detail.openDate) },
        { label: "Close Date", value: formatShortDate(detail.closeDate) },
      ];
    case "rights_issue":
      return [
        { label: "Ratio", value: detail.ratio },
        { label: "Issue Price", value: `₹${detail.issuePrice.toLocaleString("en-IN")}` },
        { label: "Closing Date", value: formatShortDate(detail.closingDate) },
      ];
    case "agm":
    case "egm":
      return [
        { label: "Venue", value: detail.venue ?? "—" },
        { label: "Agenda", value: detail.agenda.join(" · ") || "—" },
      ];
    case "listing":
    case "delisting":
      return [
        { label: "Note", value: detail.exchangeNote ?? "—" },
        { label: "Effective Date", value: formatShortDate(detail.effectiveDate) },
      ];
    case "merger":
    case "demerger":
      return [
        { label: "Counterparty", value: detail.counterparty ?? "—" },
        { label: "Swap Ratio", value: detail.swapRatio ?? "—" },
        {
          label: "Effective Date",
          value: detail.effectiveDate
            ? formatShortDate(detail.effectiveDate)
            : "—",
        },
      ];
    case "open_offer":
      return [
        { label: "Offer Price", value: `₹${detail.offerPrice.toLocaleString("en-IN")}` },
        {
          label: "Offer Size",
          value:
            detail.offerSizePct != null ? `${detail.offerSizePct}%` : "—",
        },
        { label: "Open Date", value: formatShortDate(detail.openDate) },
        { label: "Close Date", value: formatShortDate(detail.closeDate) },
      ];
    default:
      return [];
  }
}

export function toEventDrawerView(
  event: EventIntelligenceEvent,
  today: string
): EventDrawerView {
  const earnings = event.earningsDetail ?? null;
  const call = event.conferenceCallDetail ?? null;
  const action = event.corporateActionDetail ?? null;
  const category = getEventCategory(event.eventType);

  const financialSummary: EventDrawerMetric[] = [];
  if (earnings) {
    const e = earnings.estimates;
    financialSummary.push(
      { label: "Expected Revenue", value: moneyCr(e.expectedRevenueCr) },
      { label: "Expected EPS", value: num(e.expectedEps) },
      { label: "Expected YoY Growth", value: pct(e.expectedYoyGrowthPct) },
      { label: "Expected QoQ Growth", value: pct(e.expectedQoqGrowthPct) },
      { label: "Previous Revenue", value: moneyCr(e.previousRevenueCr) },
      { label: "Previous EPS", value: num(e.previousEps) },
      {
        label: "Previous Quarter",
        value: e.previousQuarterLabel ?? "—",
      },
      {
        label: "Previous Year Same Q",
        value: e.previousYearSameQuarterLabel ?? "—",
      },
      {
        label: "Historical Surprise",
        value: pct(e.historicalSurprisePct),
      },
      {
        label: "Management Guidance",
        value: e.managementGuidance ?? "Not available",
      },
      { label: "Consensus Rating", value: e.consensusRating ?? "—" }
    );
  }

  const historicalRows: EventDrawerMetric[] = [];
  if (earnings) {
    const h = earnings.historical;
    const m = h.postResultMove;
    historicalRows.push(
      { label: "Avg Surprise", value: pct(h.averageSurprisePct) },
      { label: "Beats", value: String(h.beatCount) },
      { label: "Misses", value: String(h.missCount) },
      { label: "Inline", value: String(h.inlineCount) },
      { label: "1D Move", value: pct(m.day1Pct) },
      { label: "3D Move", value: pct(m.day3Pct) },
      { label: "5D Move", value: pct(m.day5Pct) },
      { label: "10D Move", value: pct(m.day10Pct) },
      { label: "Avg Volatility", value: pct(m.averageVolatilityPct) }
    );
  }

  const upcomingDates: EventDrawerMetric[] = [
    { label: "Event Date", value: formatDisplayDate(event.date) },
    {
      label: "Event Time",
      value: event.time ? `${event.time} IST` : "All day / TBA",
    },
  ];
  if (earnings?.conferenceCallId) {
    upcomingDates.push({
      label: "Conference Call",
      value: "Linked call scheduled",
    });
  }
  if (call) {
    upcomingDates.push({
      label: "Dial-in",
      value: call.dialIn ?? "See webcast",
    });
  }
  if (action?.kind === "dividend") {
    upcomingDates.push(
      { label: "Ex-Date", value: formatShortDate(action.exDate) },
      { label: "Record Date", value: formatShortDate(action.recordDate) }
    );
  }

  return {
    event,
    title: getEventTypeLabel(event.eventType),
    subtitle: [
      event.company ?? "Macro / Market",
      event.ticker,
      event.exchange,
    ]
      .filter(Boolean)
      .join(" · "),
    badges: deriveEventBadges(event, today),
    summary: event.description,
    timeline: [
      { label: "Category", value: category.replace(/_/g, " ") },
      { label: "Status", value: event.status },
      { label: "Importance", value: event.importance },
      {
        label: "Quarter",
        value: earnings ? `${earnings.quarter} ${earnings.financialYear}` : "—",
      },
    ],
    companySnapshot: [
      { label: "Company", value: event.company ?? "—" },
      { label: "Ticker", value: event.ticker ?? "—" },
      { label: "Sector", value: event.sector ?? "—" },
      { label: "Industry", value: event.industry ?? "—" },
      { label: "Market Cap", value: event.marketCap },
      { label: "Exchange", value: event.exchange },
    ],
    upcomingDates,
    financialSummary,
    corporateActionRows: corporateActionRows(action),
    historicalRows,
    historicalQuarters:
      earnings?.historical.quarters.map((q) => ({
        label: q.label,
        revenue: moneyCr(q.revenueCr),
        eps: num(q.eps),
        result: q.result,
      })) ?? [],
    relatedNewsPlaceholder:
      "Related news feed will appear here in a later sprint.",
    aiPreviewPlaceholder:
      "AI impact summary and preparation checklist arrive in later sub-sprints.",
  };
}
