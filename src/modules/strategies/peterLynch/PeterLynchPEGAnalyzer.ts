/**
 * Peter Lynch PEG Analyzer — Sprint 11B.3W.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { PeterLynchConfig } from "./PeterLynchConstants";
import type {
  PeterLynchCurrentSnapshot,
  PeterLynchGrowthAnalysis,
  PeterLynchPegAnalysis,
} from "./PeterLynchTypes";
import { classifyPegBand } from "./PeterLynchUtils";

export function analyzePeg(
  current: PeterLynchCurrentSnapshot,
  growth: PeterLynchGrowthAnalysis,
  config: PeterLynchConfig
): PeterLynchPegAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const pe =
    current.pe != null && Number.isFinite(current.pe) && current.pe > 0
      ? current.pe
      : 0;
  const growthPct = Math.max(growth.epsCagr, growth.growthRate) * 100;
  const analystPct = current.analystGrowthEstimate * 100;

  const historicalPeg =
    growthPct > 0 && pe > 0 ? round(pe / growthPct, 4) : 0;
  const forwardPeg =
    analystPct > 0 && pe > 0
      ? round(pe / analystPct, 4)
      : historicalPeg;
  const providedPeg =
    current.peg != null && Number.isFinite(current.peg) && current.peg > 0
      ? current.peg
      : 0;

  const pegRatio =
    providedPeg > 0
      ? providedPeg
      : historicalPeg > 0
        ? historicalPeg
        : forwardPeg;

  const growthAdjustedPe =
    growthPct > 0
      ? round(pe / Math.max(growthPct / config.pegNormalizationBase, 0.5), 2)
      : pe;

  const band = classifyPegBand(pegRatio, config);

  let score = 30;
  if (band === "PEG < 1") score = 95;
  else if (band === "PEG 1–1.5") score = 78;
  else if (band === "PEG 1.5–2") score = 55;
  else score = 25;
  score = clamp(score, config.scoreFloor, config.scoreCeiling);

  if (band === "PEG < 1" || band === "PEG 1–1.5") {
    reasons.push(
      "PEG ratio indicates attractive growth-adjusted valuation."
    );
  }
  if (band === "PEG > 2") {
    warnings.push("PEG above configurable threshold.");
  }

  return {
    score,
    pegRatio: round(pegRatio, 4),
    forwardPeg: round(forwardPeg, 4),
    historicalPeg: round(historicalPeg, 4),
    growthAdjustedPe,
    band,
    reasons,
    warnings,
  };
}
