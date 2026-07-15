/**
 * Portfolio impact — position weight × earnings scorecard signals.
 */

import {
  buildEarningsCountdown,
  getEarningsCalendarService,
  type EarningsCalendarEvent,
} from "@/src/core/earnings/calendar";
import {
  getEarningsDashboardEngine,
  type EarningsScorecard,
} from "@/src/core/earnings/dashboard";
import type {
  HoldingWeightInput,
  PortfolioImpactDirection,
  PortfolioImpactRow,
  PortfolioImpactView,
  WorkspaceContext,
} from "./WorkspaceModels";
import { WORKSPACE_EMPTY } from "./WorkspaceModels";

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function holdingMap(holdings: readonly HoldingWeightInput[]): Map<string, HoldingWeightInput> {
  const map = new Map<string, HoldingWeightInput>();
  for (const h of holdings) {
    map.set(h.symbol.toUpperCase(), h);
  }
  return map;
}

function totalPortfolioValue(
  holdings: readonly HoldingWeightInput[],
  override?: number
): number {
  if (override != null && Number.isFinite(override) && override > 0) {
    return override;
  }
  return holdings.reduce(
    (sum, h) => sum + Math.max(0, h.quantity) * Math.max(0, h.currentPrice),
    0
  );
}

export function resolveImpactDirection(
  scorecard: EarningsScorecard,
  weightPct: number
): PortfolioImpactDirection {
  if (weightPct <= 0) return "Neutral";
  if (
    scorecard.outlook === "Bullish" &&
    scorecard.beatProbability >= 55 &&
    scorecard.riskScore < 70
  ) {
    return "Positive";
  }
  if (
    scorecard.outlook === "Bearish" ||
    scorecard.beatProbability < 40 ||
    scorecard.riskScore >= 75
  ) {
    return "Negative";
  }
  return "Neutral";
}

export function formatWeight(weightPct: number): string {
  if (!Number.isFinite(weightPct) || weightPct <= 0) return "—";
  return `${weightPct.toFixed(1)}%`;
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

export function buildPortfolioImpactRow(
  event: EarningsCalendarEvent,
  scorecard: EarningsScorecard,
  holding: HoldingWeightInput | null,
  totalValue: number,
  now = new Date()
): PortfolioImpactRow {
  const countdown = buildEarningsCountdown(
    event.resultDate,
    event.resultTime,
    now
  );
  const positionValue =
    holding != null
      ? Math.max(0, holding.quantity) * Math.max(0, holding.currentPrice)
      : 0;
  const weightPct =
    totalValue > 0 && positionValue > 0
      ? (positionValue / totalValue) * 100
      : event.inPortfolio
        ? 0
        : 0;
  const direction = resolveImpactDirection(scorecard, weightPct || (event.inPortfolio ? 1 : 0));
  const exposureScore = clamp(
    (weightPct || (event.inPortfolio ? 5 : 0)) * 2 +
      scorecard.portfolioImpact * 0.4 +
      scorecard.expectedVolatilityScore * 0.2
  );

  return {
    ticker: event.ticker,
    companyName: event.companyName,
    upcomingEarnings: `${event.quarter} ${event.financialYear}`,
    daysRemaining:
      countdown.daysRemaining != null
        ? String(countdown.daysRemaining)
        : countdown.label,
    positionSize: formatCurrency(positionValue),
    portfolioWeight: formatWeight(weightPct),
    aiConviction: scorecard.available
      ? String(scorecard.aiConfidence)
      : "—",
    beatProbability: scorecard.available
      ? String(scorecard.beatProbability)
      : "—",
    riskLevel: String(scorecard.riskScore),
    expectedVolatility: String(scorecard.expectedVolatilityScore),
    expectedPortfolioImpact: direction,
    overallExposure: String(exposureScore),
    event,
    scorecard,
  };
}

export class PortfolioImpactEngine {
  private readonly cache = new Map<string, PortfolioImpactView>();

  clearCache(): void {
    this.cache.clear();
  }

  getPortfolioImpact(
    context: WorkspaceContext = {},
    now = new Date()
  ): PortfolioImpactView {
    const holdings = context.holdings ?? [];
    const cacheKey = [
      getCacheDay(now),
      holdings.map((h) => h.symbol).sort().join(","),
      String(context.totalValue ?? ""),
    ].join("::");
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const calendar = getEarningsCalendarService();
    const events = calendar.getPortfolioEarnings({ now });
    const dashboard = getEarningsDashboardEngine();
    dashboard.precomputeVisible(events, now);

    const total = totalPortfolioValue(holdings, context.totalValue);
    const bySymbol = holdingMap(holdings);
    const rows = events.map((event) => {
      const scored = dashboard.scoreEvent(event, now);
      return buildPortfolioImpactRow(
        event,
        scored.scorecard,
        bySymbol.get(event.ticker.toUpperCase()) ?? null,
        total,
        now
      );
    });

    const overall = rows.length
      ? String(
          clamp(
            rows.reduce((s, r) => s + Number(r.overallExposure || 0), 0) /
              rows.length
          )
        )
      : "—";

    const empty = rows.length === 0;
    const view: PortfolioImpactView = {
      rows,
      overallExposure: overall,
      empty,
      emptyMessage: empty ? WORKSPACE_EMPTY.noPortfolio : "",
    };
    this.cache.set(cacheKey, view);
    return view;
  }
}

function getCacheDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

let singleton: PortfolioImpactEngine | null = null;

export function getPortfolioImpactEngine(): PortfolioImpactEngine {
  if (!singleton) singleton = new PortfolioImpactEngine();
  return singleton;
}

export function resetPortfolioImpactEngine(): void {
  singleton?.clearCache();
  singleton = null;
}

/** Public API */
export function getPortfolioImpact(
  context: WorkspaceContext = {},
  now = new Date()
): PortfolioImpactView {
  return getPortfolioImpactEngine().getPortfolioImpact(context, now);
}
