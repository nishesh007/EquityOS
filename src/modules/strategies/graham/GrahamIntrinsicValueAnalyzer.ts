/**
 * Graham Intrinsic Value Analyzer — Sprint 11B.3V.
 * Graham Number, book value, normalized earnings, conservative fair value.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { GrahamConfig } from "./GrahamConstants";
import type {
  GrahamCurrentSnapshot,
  GrahamIntrinsicValueAnalysis,
  GrahamYearlyFinancials,
} from "./GrahamTypes";
import { average, sortFinancialHistory } from "./GrahamUtils";

function grahamNumber(
  eps: number,
  bookValue: number,
  multiplier: number
): number {
  if (!(eps > 0) || !(bookValue > 0) || !(multiplier > 0)) return 0;
  return Math.sqrt(multiplier * eps * bookValue);
}

function normalizedEps(history: readonly GrahamYearlyFinancials[]): number {
  const sorted = sortFinancialHistory(history);
  const eps = sorted.map((y) => y.eps).filter((v) => Number.isFinite(v));
  if (eps.length === 0) return 0;
  const recent = eps.slice(-5);
  const positive = recent.filter((v) => v > 0);
  if (positive.length === 0) return average(recent);
  return average(positive);
}

export function analyzeIntrinsicValue(
  current: GrahamCurrentSnapshot,
  history: readonly GrahamYearlyFinancials[],
  config: GrahamConfig
): GrahamIntrinsicValueAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const sorted = sortFinancialHistory(history);
  const latestEps =
    sorted.length > 0 ? sorted[sorted.length - 1]!.eps : normalizedEps(history);
  const book =
    current.tangibleBookValue > 0
      ? current.tangibleBookValue
      : current.bookValue;

  const gNumber = round(
    grahamNumber(latestEps, book, config.grahamNumberMultiplier),
    4
  );
  const bookBasedValue = round(book > 0 ? book : 0, 4);
  const normEps = normalizedEps(history);
  const normalizedEarningsValue = round(
    normEps > 0 ? normEps * config.normalizedEarningsMultiple : 0,
    4
  );

  const estimate =
    current.intrinsicValueEstimate > 0 &&
    Number.isFinite(current.intrinsicValueEstimate)
      ? current.intrinsicValueEstimate
      : 0;

  const weights = {
    estimate: estimate > 0 ? config.intrinsicEstimateWeight : 0,
    graham: gNumber > 0 ? config.grahamNumberWeight : 0,
    book: bookBasedValue > 0 ? config.bookValueWeight : 0,
    earnings: normalizedEarningsValue > 0 ? config.normalizedEarningsWeight : 0,
  };
  const weightSum =
    weights.estimate + weights.graham + weights.book + weights.earnings;

  let intrinsicValue = current.currentPrice;
  if (weightSum > 0) {
    intrinsicValue =
      ((estimate > 0 ? estimate : 0) * weights.estimate +
        gNumber * weights.graham +
        bookBasedValue * weights.book +
        normalizedEarningsValue * weights.earnings) /
      weightSum;
  }

  const components = [gNumber, bookBasedValue, normalizedEarningsValue, estimate]
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const conservativeFairValue =
    components.length > 0
      ? round(components[0]!, 4)
      : round(intrinsicValue, 4);

  intrinsicValue = round(intrinsicValue, 4);

  const confidence = clamp(
    round(
      (components.length / 4) * 70 +
        (gNumber > 0 ? 15 : 0) +
        (estimate > 0 ? 15 : 0),
      1
    ),
    0,
    100
  );

  const score = clamp(
    round(confidence * 0.6 + (intrinsicValue > current.currentPrice ? 40 : 20), 1),
    config.scoreFloor,
    config.scoreCeiling
  );

  if (gNumber > 0) {
    reasons.push(`Graham Number estimated at ${gNumber}.`);
  }
  if (!(gNumber > 0) && !(estimate > 0)) {
    warnings.push("Limited intrinsic value inputs.");
  }

  return {
    score,
    intrinsicValue,
    grahamNumber: gNumber,
    bookBasedValue,
    normalizedEarningsValue,
    conservativeFairValue,
    confidence,
    reasons,
    warnings,
  };
}
