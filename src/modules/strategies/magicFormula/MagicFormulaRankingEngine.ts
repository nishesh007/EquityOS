/**
 * Magic Formula Ranking Engine — Sprint 11B.3X.
 * Ranks by Earnings Yield + ROC (Greenblatt composite).
 */

import { clamp, round } from "@/lib/engine/utils";
import type { MagicFormulaConfig } from "./MagicFormulaConstants";
import type {
  MagicFormulaCurrentSnapshot,
  MagicFormulaPeerSnapshot,
  MagicFormulaRankingResult,
} from "./MagicFormulaTypes";
import {
  percentileFromRank,
  rankDescending,
  scoreFromPercentile,
} from "./MagicFormulaUtils";

export function computeMagicFormulaRanking(input: {
  symbol: string;
  current: MagicFormulaCurrentSnapshot;
  earningsYield: number;
  returnOnCapital: number;
  peers?: readonly MagicFormulaPeerSnapshot[];
  config: MagicFormulaConfig;
}): MagicFormulaRankingResult {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const { current, config } = input;

  const peers = input.peers ?? [];
  const universe: MagicFormulaPeerSnapshot[] = [
    {
      symbol: input.symbol,
      earningsYield: input.earningsYield,
      returnOnCapital: input.returnOnCapital,
      sector: current.sector,
      industry: current.industry,
    },
    ...peers.filter((p) => p.symbol !== input.symbol),
  ];

  let earningsYieldRank: number;
  let rocRank: number;
  let magicFormulaRank: number;
  let compositeRank: number;
  let percentileRank: number;
  let sectorRank: number | null = null;
  let industryRank: number | null = null;
  let universeSize = universe.length;

  if (universeSize >= 2) {
    const eyRanks = rankDescending(universe.map((p) => p.earningsYield));
    const rocRanks = rankDescending(universe.map((p) => p.returnOnCapital));
    const composites = universe.map(
      (_, i) => eyRanks[i]! + rocRanks[i]!
    );
    const compositeRanks = rankDescending(
      composites.map((c) => -c)
    );
    // Lower composite sum is better → invert by ranking negative sums desc
    // Actually: lower sum of ranks is better. rankDescending on -sum gives
    // higher -sum (better) first. Good.
    const selfIndex = 0;
    earningsYieldRank = eyRanks[selfIndex]!;
    rocRank = rocRanks[selfIndex]!;
    magicFormulaRank = compositeRanks[selfIndex]!;
    compositeRank = magicFormulaRank;
    percentileRank = percentileFromRank(magicFormulaRank, universeSize);

    const sectorPeers = universe.filter(
      (p) => p.sector && p.sector === current.sector
    );
    if (sectorPeers.length >= 2) {
      const sectorComposites = sectorPeers.map((p) => {
        const uIdx = universe.findIndex((u) => u.symbol === p.symbol);
        return eyRanks[uIdx]! + rocRanks[uIdx]!;
      });
      const sectorCompositeRanks = rankDescending(
        sectorComposites.map((c) => -c)
      );
      const sectorSelf = sectorPeers.findIndex(
        (p) => p.symbol === input.symbol
      );
      if (sectorSelf >= 0) {
        sectorRank = sectorCompositeRanks[sectorSelf]!;
      }
    }

    const industryPeers = universe.filter(
      (p) => p.industry && p.industry === current.industry
    );
    if (industryPeers.length >= 2) {
      const industryComposites = industryPeers.map((p) => {
        const uIdx = universe.findIndex((u) => u.symbol === p.symbol);
        return eyRanks[uIdx]! + rocRanks[uIdx]!;
      });
      const industryCompositeRanks = rankDescending(
        industryComposites.map((c) => -c)
      );
      const industrySelf = industryPeers.findIndex(
        (p) => p.symbol === input.symbol
      );
      if (industrySelf >= 0) {
        industryRank = industryCompositeRanks[industrySelf]!;
      }
    }
  } else if (
    current.magicFormulaRank != null &&
    Number.isFinite(current.magicFormulaRank)
  ) {
    magicFormulaRank = current.magicFormulaRank;
    compositeRank =
      current.compositeRank != null && Number.isFinite(current.compositeRank)
        ? current.compositeRank
        : magicFormulaRank;
    percentileRank =
      current.percentileRank != null && Number.isFinite(current.percentileRank)
        ? clamp(current.percentileRank, 0, 1)
        : percentileFromRank(
            magicFormulaRank,
            config.defaultUniverseSize
          );
    earningsYieldRank = magicFormulaRank;
    rocRank = magicFormulaRank;
    sectorRank = current.sectorRank ?? null;
    industryRank = current.industryRank ?? null;
    universeSize = config.defaultUniverseSize;
  } else {
    // Synthetic rank from absolute EY/ROC quality when no peers/precomputed.
    const eyScore =
      input.earningsYield >= config.minEarningsYieldBuy
        ? 1
        : input.earningsYield >= config.minEarningsYieldWatch
          ? 2
          : 3;
    const rocScore =
      input.returnOnCapital >= config.minRocBuy
        ? 1
        : input.returnOnCapital >= config.minRocWatch
          ? 2
          : 3;
    magicFormulaRank = eyScore + rocScore;
    compositeRank = magicFormulaRank;
    percentileRank = clamp(magicFormulaRank / 6, 0, 1);
    earningsYieldRank = eyScore;
    rocRank = rocScore;
    universeSize = 1;
    warnings.push("Limited universe — synthetic Magic Formula rank applied.");
  }

  const score = scoreFromPercentile(percentileRank, config);

  if (percentileRank <= config.topPercentileBuy) {
    reasons.push(
      "Company ranks in the top percentile of the Magic Formula universe."
    );
  }
  if (percentileRank > config.topPercentileWatch) {
    warnings.push("Low Magic Formula rank vs universe.");
  }

  return {
    score,
    magicFormulaRank: round(magicFormulaRank, 2),
    compositeRank: round(compositeRank, 2),
    percentileRank: round(percentileRank, 4),
    sectorRank: sectorRank != null ? round(sectorRank, 2) : null,
    industryRank: industryRank != null ? round(industryRank, 2) : null,
    earningsYieldRank: round(earningsYieldRank, 2),
    rocRank: round(rocRank, 2),
    universeSize,
    reasons,
    warnings,
  };
}
