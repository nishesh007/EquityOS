import type { OpportunityCandidate } from "@/lib/opportunity-engine/types";

export type TradeGrade = "A" | "B" | "C" | "D";
export type TradeStatus =
  | "target2_hit"
  | "target1_hit"
  | "stopped"
  | "open"
  | "breakeven";

export interface TradeOutcome {
  candidateId: string;
  symbol: string;
  company: string;
  side: "Long" | "Short";
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  highestGainPercent: number;
  lowestDrawdownPercent: number;
  currentStatus: TradeStatus;
  tradeGrade: TradeGrade;
  currentPrice: number;
}

function num(
  metrics: Record<string, number | string | null> | undefined,
  key: string
): number | null {
  if (!metrics) return null;
  const value = metrics[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function midpointEntry(candidate: OpportunityCandidate): number {
  return (candidate.entryZone.low + candidate.entryZone.high) / 2;
}

function percentMove(from: number, to: number, side: "Long" | "Short"): number {
  if (from <= 0) return 0;
  const raw = ((to - from) / from) * 100;
  return side === "Long" ? raw : -raw;
}

function resolveStatus(
  candidate: OpportunityCandidate,
  entry: number,
  currentPrice: number,
  sessionHigh: number,
  sessionLow: number
): TradeStatus {
  const { side, stopLoss, target1, target2 } = candidate;

  if (side === "Long") {
    if (sessionLow <= stopLoss) return "stopped";
    if (sessionHigh >= target2) return "target2_hit";
    if (sessionHigh >= target1) return "target1_hit";
    if (Math.abs(currentPrice - entry) / entry < 0.003) return "breakeven";
    return "open";
  }

  if (sessionHigh >= stopLoss) return "stopped";
  if (sessionLow <= target2) return "target2_hit";
  if (sessionLow <= target1) return "target1_hit";
  if (Math.abs(currentPrice - entry) / entry < 0.003) return "breakeven";
  return "open";
}

function gradeTrade(
  status: TradeStatus,
  highestGain: number,
  lowestDrawdown: number,
  riskReward: number
): TradeGrade {
  if (status === "target2_hit" || (status === "target1_hit" && highestGain >= riskReward * 50)) {
    return "A";
  }
  if (status === "target1_hit" || (status === "open" && highestGain >= 1.5)) {
    return "B";
  }
  if (status === "open" || status === "breakeven" || (status === "stopped" && highestGain >= 0.8)) {
    return "C";
  }
  if (lowestDrawdown <= -2 && highestGain < 0.5) return "D";
  return "C";
}

export function computeTradeOutcome(candidate: OpportunityCandidate): TradeOutcome {
  const metrics = candidate.scanMetrics;
  const entry = midpointEntry(candidate);
  const currentPrice = num(metrics, "cmp") ?? entry;
  const sessionHigh = num(metrics, "high") ?? currentPrice;
  const sessionLow = num(metrics, "low") ?? currentPrice;

  const favorablePrice = candidate.side === "Long" ? sessionHigh : sessionLow;
  const adversePrice = candidate.side === "Long" ? sessionLow : sessionHigh;

  const highestGainPercent = Math.round(percentMove(entry, favorablePrice, candidate.side) * 100) / 100;
  const lowestDrawdownPercent = Math.round(percentMove(entry, adversePrice, candidate.side) * 100) / 100;
  const currentStatus = resolveStatus(candidate, entry, currentPrice, sessionHigh, sessionLow);
  const tradeGrade = gradeTrade(
    currentStatus,
    highestGainPercent,
    lowestDrawdownPercent,
    candidate.riskReward
  );

  return {
    candidateId: candidate.id,
    symbol: candidate.symbol,
    company: candidate.company,
    side: candidate.side,
    entry: Math.round(entry * 100) / 100,
    stopLoss: candidate.stopLoss,
    target1: candidate.target1,
    target2: candidate.target2,
    highestGainPercent,
    lowestDrawdownPercent,
    currentStatus,
    tradeGrade,
    currentPrice,
  };
}

export function buildTradeOutcomes(candidates: OpportunityCandidate[]): TradeOutcome[] {
  return candidates.map(computeTradeOutcome);
}
