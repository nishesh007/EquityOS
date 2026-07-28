/**
 * Sprint 10C — Executive Intelligence presentation builders.
 * Pure functions over existing dashboard DTOs. No engines, no APIs, no invented facts.
 */

import type { MarketIntelligenceSnapshot } from "@/lib/market-intelligence";
import type { InstitutionalStrategySlot } from "@/lib/recommendations";
import type { SharedRecommendation } from "@/lib/recommendations";
import type {
  MarketBreadth,
  MarketIndex,
  MarketNews,
  MarketPulse,
  PortfolioSummary,
  UpcomingResult,
  WatchlistItem,
} from "@/types";

export type ChipTone = "green" | "amber" | "red" | "blue" | "neutral";

export interface PulseChip {
  id: string;
  label: string;
  value: string;
  tone: ChipTone;
  href: string;
}

export interface BriefingBullet {
  id: string;
  text: string;
}

export type FlashCategory =
  | "BUY SIGNAL"
  | "BREAKOUT"
  | "RESULT ALERT"
  | "PORTFOLIO RISK"
  | "WATCHLIST ALERT"
  | "DIVIDEND"
  | "SECTOR ROTATION"
  | "VALUATION"
  | "HIGH VOLUME"
  | "NEW 52W HIGH";

export interface FlashCard {
  id: string;
  category: FlashCategory;
  insight: string;
  tone: ChipTone;
  href: string;
}

export type AlertPriority = 1 | 2 | 3 | 4 | 5;

export interface PortfolioAlertItem {
  id: string;
  icon: "warning" | "up" | "down";
  text: string;
  priority: AlertPriority;
  href: string;
}

function findIndex(
  indices: readonly MarketIndex[],
  ...symbols: string[]
): MarketIndex | undefined {
  const upper = symbols.map((s) => s.toUpperCase());
  return indices.find((idx) => upper.includes(idx.symbol.toUpperCase()));
}

function toneFromChange(changePercent: number | null | undefined): ChipTone {
  if (changePercent == null || !Number.isFinite(changePercent)) return "neutral";
  if (changePercent > 0.15) return "green";
  if (changePercent < -0.15) return "red";
  return "amber";
}

function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatScore(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return String(Math.round(value));
}

function toDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

function regimeTone(regime: string): ChipTone {
  const lower = regime.toLowerCase();
  if (lower.includes("bull") || lower.includes("risk on")) return "green";
  if (lower.includes("bear") || lower.includes("risk off")) return "red";
  return "amber";
}

function riskTone(risk: string): ChipTone {
  const lower = risk.toLowerCase();
  if (lower.includes("low")) return "green";
  if (lower.includes("high") || lower.includes("elevated")) return "red";
  return "amber";
}

function volTone(vol: string): ChipTone {
  const lower = vol.toLowerCase();
  if (lower.includes("low")) return "blue";
  if (lower.includes("high") || lower.includes("elevated")) return "red";
  return "amber";
}

function breadthTone(score: number): ChipTone {
  if (score >= 55) return "green";
  if (score <= 45) return "red";
  return "amber";
}

function moodTone(mood: string | undefined): ChipTone {
  if (!mood) return "neutral";
  const lower = mood.toLowerCase();
  if (lower.includes("bull") || lower.includes("positive")) return "green";
  if (lower.includes("bear") || lower.includes("negative")) return "red";
  return "amber";
}

/** Compact market pulse chips for the executive ribbon. */
export function buildMarketPulseChips(input: {
  indices: readonly MarketIndex[];
  pulse: MarketPulse;
  intelligence: MarketIntelligenceSnapshot;
  breadth: MarketBreadth | null;
}): PulseChip[] {
  const { indices, pulse, intelligence, breadth } = input;
  const nifty = findIndex(indices, "NIFTY", "NIFTY 50");
  const sensex = findIndex(indices, "SENSEX");
  const bank = findIndex(indices, "BANKNIFTY", "NIFTY BANK");
  const vix = findIndex(indices, "INDIAVIX", "INDIA VIX");

  const statusLabel =
    breadth?.marketStatusLabel ??
    (pulse.marketTrend ? "Session live" : "Market Status");

  const chips: PulseChip[] = [
    {
      id: "nifty",
      label: "NIFTY",
      value: nifty ? formatPct(nifty.changePercent) : "—",
      tone: toneFromChange(nifty?.changePercent),
      href: "/markets",
    },
    {
      id: "sensex",
      label: "SENSEX",
      value: sensex ? formatPct(sensex.changePercent) : "—",
      tone: toneFromChange(sensex?.changePercent),
      href: "/markets",
    },
    {
      id: "banknifty",
      label: "BANKNIFTY",
      value: bank ? formatPct(bank.changePercent) : "—",
      tone: toneFromChange(bank?.changePercent),
      href: "/markets",
    },
    {
      id: "vix",
      label: "INDIA VIX",
      value:
        vix != null
          ? vix.value.toFixed(2)
          : pulse.indiaVix.toFixed(2),
      tone: toneFromChange(
        vix?.changePercent ?? pulse.indiaVixChange
      ),
      href: "/markets",
    },
    {
      id: "status",
      label: "Market Status",
      value: statusLabel,
      tone: "blue",
      href: "/markets",
    },
    {
      id: "regime",
      label: "Market Internals",
      value: intelligence.regime.regime || "—",
      tone: regimeTone(intelligence.regime.regime || ""),
      href: "/markets",
    },
    {
      id: "breadth",
      label: "Breadth",
      value: formatScore(intelligence.context.breadthScore),
      tone: breadthTone(intelligence.context.breadthScore),
      href: "/markets#breadth-analytics",
    },
    {
      id: "risk",
      label: "Risk",
      value: intelligence.context.riskMode || "—",
      tone: riskTone(intelligence.context.riskMode || ""),
      href: "/markets#market-pulse",
    },
    {
      id: "volatility",
      label: "Volatility",
      value: intelligence.context.volatilityRegime || "—",
      tone: volTone(intelligence.context.volatilityRegime || ""),
      href: "/markets#market-pulse",
    },
    {
      id: "mood",
      label: "Market Mood",
      value: breadth?.marketMood ?? intelligence.context.marketTrend ?? "—",
      tone: moodTone(breadth?.marketMood ?? intelligence.context.marketTrend),
      href: "/markets#strength-analytics",
    },
  ];

  return chips;
}

/** Explainable daily briefing bullets from live dashboard DTOs only. */
export function buildDailyBriefing(input: {
  intelligence: MarketIntelligenceSnapshot;
  breadth: MarketBreadth | null;
  slots: readonly InstitutionalStrategySlot[];
  portfolio: PortfolioSummary;
  recommendations: readonly SharedRecommendation[];
  results: readonly UpcomingResult[];
}): { bullets: BriefingBullet[]; updatedAt: string } {
  const { intelligence, breadth, slots, portfolio, recommendations, results } =
    input;
  const bullets: BriefingBullet[] = [];
  const ctx = intelligence.context;
  const regime = intelligence.regime;

  const breadthPctLabel =
    breadth?.breadthPercent != null
      ? breadth.breadthPercent.toFixed(1)
      : String(Math.round(ctx.breadthScore));
  const regimeLine =
    regime.summary[0] ||
    ctx.summary[0] ||
    `Market classified as ${regime.regime} with breadth at ${breadthPctLabel}%.`;
  bullets.push({ id: "regime", text: regimeLine });

  if (ctx.leadingSectors.length > 0) {
    const leads = ctx.leadingSectors.slice(0, 3).join(", ");
    const weak =
      ctx.weakSectors.length > 0
        ? ` Weak: ${ctx.weakSectors.slice(0, 2).join(", ")}.`
        : "";
    bullets.push({
      id: "sectors",
      text: `${leads} lead sector breadth.${weak}`,
    });
  }

  const conviction = slots.filter((slot) => slot.pick != null).length;
  if (conviction > 0) {
    bullets.push({
      id: "opportunities",
      text: `${conviction} high-conviction strateg${conviction === 1 ? "y" : "ies"} currently filled on the Opportunity Dashboard.`,
    });
  } else if (intelligence.eligibleStrategyCount > 0) {
    bullets.push({
      id: "opportunities-empty",
      text: `Opportunity Engine scanned ${intelligence.eligibleStrategyCount} eligible strategies with no high-conviction fill yet.`,
    });
  }

  const holdingBySymbol = new Map(
    portfolio.holdings.map((h) => [h.symbol.toUpperCase(), h])
  );
  const stopHits = recommendations.filter((rec) => {
    const holding = holdingBySymbol.get(rec.symbol.toUpperCase());
    if (!holding || !(rec.stopLoss > 0)) return false;
    const price = holding.currentPrice;
    if (!(price > 0)) return false;
    return Math.abs(price - rec.stopLoss) / price <= 0.03;
  });
  if (stopHits.length > 0) {
    bullets.push({
      id: "stops",
      text: `${stopHits.length} portfolio holding${stopHits.length === 1 ? " is" : "s are"} within 3% of a Strategy Engine stop-loss.`,
    });
  } else if (portfolio.dayChangePercent <= -1) {
    bullets.push({
      id: "day-pnl",
      text: `Portfolio day change is ${portfolio.dayChangePercent.toFixed(1)}% across ${portfolio.holdings.length} holdings.`,
    });
  }

  const today = toDateKey(new Date());
  const tomorrow = toDateKey(addDays(new Date(), 1));
  const earningsToday = results.filter((r) => r.date === today);
  const earningsTomorrow = results.filter((r) => r.date === tomorrow);
  if (earningsToday.length > 0) {
    bullets.push({
      id: "earnings-today",
      text: `${earningsToday.length} result${earningsToday.length === 1 ? "" : "s"} scheduled today (${earningsToday
        .slice(0, 3)
        .map((r) => r.symbol)
        .join(", ")}).`,
    });
  } else if (earningsTomorrow.length > 0) {
    bullets.push({
      id: "earnings-tomorrow",
      text: `${earningsTomorrow.length} result${earningsTomorrow.length === 1 ? "" : "s"} scheduled tomorrow.`,
    });
  }

  if (breadth?.marketMood && bullets.length < 6) {
    bullets.push({
      id: "mood",
      text: `Market Internals mood reads ${breadth.marketMood}${
        breadth.breadthPercent != null
          ? ` with breadth at ${breadth.breadthPercent.toFixed(1)}%`
          : ""
      }.`,
    });
  }

  return {
    bullets: bullets.slice(0, 6),
    updatedAt: intelligence.timestamp || new Date().toISOString(),
  };
}

/** Actionable flash cards only — skip empty / non-actionable noise. */
export function buildFlashCards(input: {
  slots: readonly InstitutionalStrategySlot[];
  breadth: MarketBreadth | null;
  portfolio: PortfolioSummary;
  recommendations: readonly SharedRecommendation[];
  watchlist: readonly WatchlistItem[];
  results: readonly UpcomingResult[];
  intelligence: MarketIntelligenceSnapshot;
}): FlashCard[] {
  const cards: FlashCard[] = [];
  const {
    slots,
    breadth,
    portfolio,
    recommendations,
    watchlist,
    results,
    intelligence,
  } = input;

  for (const slot of slots) {
    if (!slot.pick) continue;
    const buyCount = cards.filter((c) => c.category === "BUY SIGNAL").length;
    if (buyCount >= 2) break;
    cards.push({
      id: `buy-${slot.strategyId}`,
      category: "BUY SIGNAL",
      insight: `${slot.label}: ${slot.pick.symbol} · conviction ${Math.round(slot.pick.conviction)}`,
      tone: "green",
      href: slot.href || "/opportunities",
    });
  }

  const today = toDateKey(new Date());
  const earningsToday = results.filter((r) => r.date === today);
  if (earningsToday.length > 0 && cards.length < 6) {
    cards.push({
      id: "results-today",
      category: "RESULT ALERT",
      insight: `${earningsToday.length} earnings today · ${earningsToday
        .slice(0, 2)
        .map((r) => r.symbol)
        .join(", ")}`,
      tone: "amber",
      href: "/results",
    });
  }

  const holdingBySymbol = new Map(
    portfolio.holdings.map((h) => [h.symbol.toUpperCase(), h])
  );
  const riskRec = recommendations.find((rec) => {
    const holding = holdingBySymbol.get(rec.symbol.toUpperCase());
    if (!holding || !(rec.stopLoss > 0)) return false;
    const price = holding.currentPrice;
    if (!(price > 0)) return false;
    return Math.abs(price - rec.stopLoss) / price <= 0.03;
  });
  if (riskRec && cards.length < 6) {
    cards.push({
      id: `risk-${riskRec.symbol}`,
      category: "PORTFOLIO RISK",
      insight: `${riskRec.symbol} within 3% of stop ₹${riskRec.stopLoss.toFixed(0)}`,
      tone: "red",
      href: "/portfolio",
    });
  }

  const watchSignals = recommendations.filter(
    (rec) =>
      watchlist.some(
        (item) => item.symbol.toUpperCase() === rec.symbol.toUpperCase()
      ) &&
      rec.action === "BUY" &&
      rec.confidence >= 70
  );
  if (watchSignals[0] && cards.length < 6) {
    const rec = watchSignals[0];
    cards.push({
      id: `watch-${rec.symbol}`,
      category: "WATCHLIST ALERT",
      insight: `${rec.symbol} · ${rec.action} · ${rec.primaryStrategy}`,
      tone: "blue",
      href: "/watchlist",
    });
  }

  if (breadth?.weekHighs?.length && cards.length < 6) {
    const top = breadth.weekHighs[0];
    cards.push({
      id: `high-${top.symbol}`,
      category: "NEW 52W HIGH",
      insight: `${top.symbol} near 52-week high · ${formatPct(top.changePercent)}`,
      tone: "green",
      href: "/markets",
    });
  }

  if (
    intelligence.context.leadingSectors.length > 0 &&
    intelligence.context.weakSectors.length > 0 &&
    cards.length < 6
  ) {
    cards.push({
      id: "rotation",
      category: "SECTOR ROTATION",
      insight: `Lead ${intelligence.context.leadingSectors[0]} · lag ${intelligence.context.weakSectors[0]}`,
      tone: "amber",
      href: "/markets",
    });
  }

  if (breadth?.mostActive?.[0] && cards.length < 6) {
    const active = breadth.mostActive[0];
    cards.push({
      id: `vol-${active.symbol}`,
      category: "HIGH VOLUME",
      insight: `${active.symbol} most active · ${active.volume}`,
      tone: "blue",
      href: "/markets",
    });
  }

  return cards.slice(0, 6);
}

/** Portfolio alerts — priority sorted, deduped, max 5. */
export function buildPortfolioAlerts(input: {
  portfolio: PortfolioSummary;
  recommendations: readonly SharedRecommendation[];
  results: readonly UpcomingResult[];
}): PortfolioAlertItem[] {
  const { portfolio, recommendations, results } = input;
  const alerts: PortfolioAlertItem[] = [];
  const seen = new Set<string>();

  const push = (alert: PortfolioAlertItem) => {
    if (seen.has(alert.id) || alerts.length >= 5) return;
    seen.add(alert.id);
    alerts.push(alert);
  };

  const total = portfolio.totalValue || 0;
  for (const holding of portfolio.holdings) {
    const price = holding.currentPrice || holding.avgPrice;
    const value = price * holding.quantity;
    const weight = total > 0 ? value / total : 0;
    if (weight >= 0.25) {
      push({
        id: `overweight-${holding.symbol}`,
        icon: "warning",
        text: `${holding.symbol} position overweight (${(weight * 100).toFixed(0)}%)`,
        priority: 3,
        href: "/portfolio",
      });
    }
  }

  const holdingMap = new Map(
    portfolio.holdings.map((h) => [h.symbol.toUpperCase(), h])
  );

  for (const holding of portfolio.holdings) {
    if (holding.changePercent >= 5) {
      push({
        id: `rally-${holding.symbol}`,
        icon: "up",
        text: `${holding.symbol} strong day · ${formatPct(holding.changePercent)}`,
        priority: 4,
        href: "/portfolio",
      });
    }
    if (holding.changePercent <= -5) {
      push({
        id: `drop-${holding.symbol}`,
        icon: "down",
        text: `${holding.symbol} sharp decline · ${formatPct(holding.changePercent)}`,
        priority: 2,
        href: "/portfolio",
      });
    }
  }

  for (const rec of recommendations) {
    const holding = holdingMap.get(rec.symbol.toUpperCase());
    if (!holding) continue;
    const price = holding.currentPrice;
    if (rec.stopLoss > 0 && price > 0) {
      const distance = Math.abs(price - rec.stopLoss) / price;
      if (distance <= 0.03) {
        push({
          id: `stop-${rec.symbol}`,
          icon: "warning",
          text: `Stop-loss approaching · ${rec.symbol}`,
          priority: 1,
          href: "/portfolio",
        });
      }
    }
    const target = rec.targets?.[0];
    if (target && target > 0 && price > 0) {
      const upside = (target - price) / price;
      if (upside <= 0.01 && upside >= -0.02) {
        push({
          id: `target-${rec.symbol}`,
          icon: "up",
          text: `Target achieved · ${rec.symbol}`,
          priority: 2,
          href: "/portfolio",
        });
      }
    }
  }

  const today = toDateKey(new Date());
  const tomorrow = toDateKey(addDays(new Date(), 1));
  for (const result of results) {
    if (!holdingMap.has(result.symbol.toUpperCase())) continue;
    if (result.date === tomorrow) {
      push({
        id: `earn-${result.symbol}`,
        icon: "warning",
        text: `Earnings tomorrow · ${result.symbol}`,
        priority: 2,
        href: "/results",
      });
    }
    if (result.date === today) {
      push({
        id: `earn-today-${result.symbol}`,
        icon: "warning",
        text: `Earnings today · ${result.symbol}`,
        priority: 1,
        href: "/results",
      });
    }
  }

  return alerts.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

export function formatBriefingClock(iso: string): string {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

/** Re-export news type guard for ticker consumers. */
export type { MarketNews };
