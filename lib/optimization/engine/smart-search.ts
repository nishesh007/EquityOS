import { generateCombinations } from "./combination-generator";
import { evaluateCombination, hashCombination } from "./evaluation";
import type { ParameterState, ConstraintDefinition } from "@/lib/optimization/types";
import type {
  ParameterCombination,
  SearchMode,
  SmartSearchIntensity,
} from "./types";

const INTENSITY_FRACTION: Record<SmartSearchIntensity, number> = {
  fast: 0.12,
  balanced: 0.28,
  deep: 0.55,
};

const MODE_CAP: Record<SearchMode, number> = {
  quick: 150,
  smart: 800,
  grid: 2500,
  deep: 4000,
};

/**
 * Select combinations for Smart Search — prioritize promising regions,
 * prune weak early candidates via coarse score heuristic.
 */
export function selectSmartCombinations(
  all: readonly ParameterCombination[],
  intensity: SmartSearchIntensity
): ParameterCombination[] {
  if (all.length === 0) return [];

  const fraction = INTENSITY_FRACTION[intensity];
  const target = Math.max(
    24,
    Math.min(all.length, Math.ceil(all.length * fraction))
  );

  const scored = all.map((combo) => {
    const seed = hashCombination(combo.values);
    const shortMa = Number(combo.values.short_ma ?? 10);
    const longMa = Number(combo.values.long_ma ?? 50);
    const stop = Number(combo.values.stop_loss_pct ?? 2.5);
    const targetPct = Number(combo.values.target_pct ?? 5);
    const rr = stop > 0 ? targetPct / stop : 1;
    const spread = Math.max(0, longMa - shortMa);
    const prior =
      (spread / 100) * 0.4 +
      Math.min(rr / 3, 1.2) * 0.4 +
      ((seed % 1000) / 1000) * 0.2;
    return { combo, prior };
  });

  scored.sort((a, b) => b.prior - a.prior);

  // Keep top prior region + stratified sample of remainder for exploration.
  const eliteCount = Math.ceil(target * 0.7);
  const exploreCount = target - eliteCount;
  const elite = scored.slice(0, eliteCount).map((s) => s.combo);
  const rest = scored.slice(eliteCount);
  const step = Math.max(1, Math.floor(rest.length / Math.max(1, exploreCount)));
  const explore: ParameterCombination[] = [];
  for (let i = 0; i < rest.length && explore.length < exploreCount; i += step) {
    explore.push(rest[i]!.combo);
  }

  return [...elite, ...explore];
}

export function planSearchCombinations(input: {
  parameters: readonly ParameterState[];
  searchMode: SearchMode;
  smartIntensity: SmartSearchIntensity;
  maxCombinations?: number;
}): ParameterCombination[] {
  const modeCap = MODE_CAP[input.searchMode];
  const max = Math.min(input.maxCombinations ?? modeCap, modeCap);
  const all = generateCombinations(input.parameters, {
    maxCombinations: Math.min(max * 4, 10_000),
  });

  if (input.searchMode === "grid") {
    return all.slice(0, max);
  }

  if (input.searchMode === "quick") {
    return selectSmartCombinations(all, "fast").slice(0, Math.min(max, 150));
  }

  if (input.searchMode === "deep") {
    return selectSmartCombinations(all, "deep").slice(0, max);
  }

  // smart
  return selectSmartCombinations(all, input.smartIntensity).slice(0, max);
}

export function estimateModeRuntimeSeconds(
  combinationCount: number,
  mode: SearchMode
): number {
  const perEvalMs =
    mode === "deep" ? 4 : mode === "grid" ? 3 : mode === "smart" ? 2.5 : 2;
  return Math.max(0.5, (combinationCount * perEvalMs) / 1000);
}

/**
 * Early-prune helper used during smart runs — drop trailing weak results.
 */
export function pruneWeakResults<T extends { score: number }>(
  results: T[],
  keepFraction = 0.65
): T[] {
  if (results.length < 20) return results;
  const sorted = [...results].sort((a, b) => b.score - a.score);
  const keep = Math.max(10, Math.ceil(sorted.length * keepFraction));
  return sorted.slice(0, keep);
}

export function previewEvaluatePassRate(input: {
  combinations: readonly ParameterCombination[];
  strategyId: string;
  strategyName: string;
  parameters: readonly ParameterState[];
  constraints: readonly ConstraintDefinition[];
  sampleSize?: number;
}): number {
  const sample = input.combinations.slice(0, input.sampleSize ?? 12);
  if (sample.length === 0) return 1;
  let pass = 0;
  for (const combo of sample) {
    const r = evaluateCombination({
      combination: combo,
      strategyId: input.strategyId,
      strategyName: input.strategyName,
      parameters: input.parameters,
      constraints: input.constraints,
    });
    if (r) pass += 1;
  }
  return pass / sample.length;
}
