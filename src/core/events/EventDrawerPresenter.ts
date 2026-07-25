/**
 * Event detail drawer presenter (Sprint 10D.2 / 10D.3).
 * Pure view-model mapping — no UI.
 */

import { getEventCategory, getEventTypeLabel } from "@/constants/eventTypes";
import { addDays, formatDisplayDate, formatShortDate } from "@/src/core/events/EventFilters";
import type { EventIntelligenceEvent } from "@/types/event";
import type { CorporateActionDetails } from "@/types/corporateActions";
import type {
  MacroAiPlaceholder,
  MacroDetail,
  MacroHistoricalReaction,
  HistoricalReading,
} from "@/types/macro";
import {
  MACRO_REGION_LABELS,
  MACRO_THEME_LABELS,
} from "@/types/macro";

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
  | "buyback"
  | "central_bank"
  | "macro";

export interface EventDrawerMetric {
  label: string;
  value: string;
}

export interface MacroDrawerView {
  overview: EventDrawerMetric[];
  economicData: EventDrawerMetric[];
  historicalReadings: HistoricalReading[];
  forecastVsActual: {
    forecast: number | null;
    actual: number | null;
    previous: number | null;
    unit: string;
  };
  sectorPositive: string[];
  sectorNegative: string[];
  sectorNote: string | null;
  marketImpact: EventDrawerMetric[];
  direction: string;
  volatility: string;
  affectedIndices: string[];
  historicalReaction: MacroHistoricalReaction | null;
  reactionAverages: EventDrawerMetric[];
  aiPlaceholder: MacroAiPlaceholder | null;
  themeLabel: string;
  regionLabel: string;
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
  macro: MacroDrawerView | null;
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

function formatIndicator(
  value: number | null | undefined,
  unit: string
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })} ${unit}`.trim();
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

  const category = getEventCategory(event.eventType);
  if (category === "central_bank") badges.push("central_bank");
  else if (event.macroDetail) badges.push("macro");

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

function toMacroDrawerView(detail: MacroDetail): MacroDrawerView {
  const ind = detail.indicator;
  const reaction = detail.historicalReaction;
  return {
    overview: [
      { label: "Country", value: detail.country },
      { label: "Authority", value: detail.authority },
      { label: "Theme", value: MACRO_THEME_LABELS[detail.theme] },
      { label: "Region", value: MACRO_REGION_LABELS[detail.region] },
      { label: "Frequency", value: detail.frequency },
      { label: "Data Source", value: ind.dataSource },
    ],
    economicData: [
      { label: "Actual", value: formatIndicator(ind.actual, ind.unit) },
      { label: "Forecast", value: formatIndicator(ind.forecast, ind.unit) },
      { label: "Consensus", value: formatIndicator(ind.consensus, ind.unit) },
      { label: "Previous", value: formatIndicator(ind.previous, ind.unit) },
      { label: "Revision", value: formatIndicator(ind.revision, ind.unit) },
      {
        label: "Historical Avg",
        value: formatIndicator(ind.historicalAverage, ind.unit),
      },
      {
        label: "Historical High",
        value: formatIndicator(ind.historicalHigh, ind.unit),
      },
      {
        label: "Historical Low",
        value: formatIndicator(ind.historicalLow, ind.unit),
      },
    ],
    historicalReadings: detail.historicalReadings,
    forecastVsActual: {
      forecast: ind.forecast,
      actual: ind.actual,
      previous: ind.previous,
      unit: ind.unit,
    },
    sectorPositive: detail.sectorImpact.positive,
    sectorNegative: detail.sectorImpact.negative,
    sectorNote: detail.sectorImpact.sensitivityNote,
    marketImpact: [
      { label: "Expected Direction", value: detail.marketImpact.direction },
      { label: "Expected Volatility", value: detail.marketImpact.volatility },
      {
        label: "Affected Indices",
        value: detail.marketImpact.affectedIndices.join(", ") || "—",
      },
      { label: "Narrative", value: detail.marketImpact.narrative },
    ],
    direction: detail.marketImpact.direction,
    volatility: detail.marketImpact.volatility,
    affectedIndices: detail.marketImpact.affectedIndices,
    historicalReaction: reaction,
    reactionAverages: reaction
      ? [
          {
            label: "Avg NIFTY Move",
            value: pct(reaction.averages.niftyMovePct),
          },
          {
            label: "Avg BANKNIFTY Move",
            value: pct(reaction.averages.bankNiftyMovePct),
          },
          {
            label: "Avg INR Move",
            value: pct(reaction.averages.inrMovePct),
          },
          {
            label: "Avg Bond Yield",
            value:
              reaction.averages.bondYieldMoveBps != null
                ? `${reaction.averages.bondYieldMoveBps > 0 ? "+" : ""}${reaction.averages.bondYieldMoveBps.toFixed(1)} bps`
                : "—",
          },
        ]
      : [],
    aiPlaceholder: detail.aiPlaceholder,
    themeLabel: MACRO_THEME_LABELS[detail.theme],
    regionLabel: MACRO_REGION_LABELS[detail.region],
  };
}

export function toEventDrawerView(
  event: EventIntelligenceEvent,
  today: string
): EventDrawerView {
  const earnings = event.earningsDetail ?? null;
  const call = event.conferenceCallDetail ?? null;
  const action = event.corporateActionDetail ?? null;
  const macro = event.macroDetail ?? null;
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
  if (macro) {
    upcomingDates.push(
      { label: "Timezone", value: event.timezone },
      { label: "Release Status", value: event.status }
    );
  }
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

  const timeline: EventDrawerMetric[] = [
    { label: "Category", value: category.replace(/_/g, " ") },
    { label: "Status", value: event.status },
    { label: "Importance", value: event.importance },
  ];
  if (earnings) {
    timeline.push({
      label: "Quarter",
      value: `${earnings.quarter} ${earnings.financialYear}`,
    });
  }
  if (macro) {
    timeline.push(
      { label: "Theme", value: MACRO_THEME_LABELS[macro.theme] },
      { label: "Region", value: MACRO_REGION_LABELS[macro.region] },
      { label: "Frequency", value: macro.frequency }
    );
  }

  return {
    event,
    title: getEventTypeLabel(event.eventType),
    subtitle: [
      event.company ?? macro?.authority ?? "Macro / Market",
      event.ticker,
      event.exchange,
    ]
      .filter(Boolean)
      .join(" · "),
    badges: deriveEventBadges(event, today),
    summary: event.description,
    timeline,
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
    macro: macro ? toMacroDrawerView(macro) : null,
    relatedNewsPlaceholder:
      "Related news feed will appear here in a later sprint.",
    aiPreviewPlaceholder:
      "AI impact summary and preparation checklist arrive in later sub-sprints.",
  };
}
