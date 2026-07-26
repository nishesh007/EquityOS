import type { MonteCarloConfig, MonteCarloMode } from "./types";

/** Seeded PRNG (mulberry32) — reproducible offline research. */
export function createRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function applyModeDefaults(
  mode: MonteCarloMode,
  base: MonteCarloConfig
): Partial<MonteCarloConfig> {
  switch (mode) {
    case "conservative":
      return {
        mode,
        simulationCount: Math.max(100, base.simulationCount),
        slippagePct: Math.max(0.08, base.slippagePct),
        commissionPct: Math.max(0.03, base.commissionPct),
        gapProbability: Math.max(0.1, base.gapProbability),
        volatilityMultiplier: Math.max(1.2, base.volatilityMultiplier),
      };
    case "aggressive":
      return {
        mode,
        simulationCount: Math.max(500, base.simulationCount),
        slippagePct: 0.02,
        commissionPct: 0.01,
        gapProbability: 0.04,
        volatilityMultiplier: 0.9,
      };
    case "balanced":
      return {
        mode,
        simulationCount: Math.max(250, Math.min(1000, base.simulationCount)),
        slippagePct: 0.05,
        commissionPct: 0.02,
        gapProbability: 0.08,
        volatilityMultiplier: 1,
      };
    default:
      return { mode: "custom" };
  }
}

export function validateMonteCarloConfig(
  config: MonteCarloConfig
): string | null {
  if (config.simulationCount < 10 || config.simulationCount > 5000) {
    return "Simulation count must be between 10 and 5,000.";
  }
  if (config.slippagePct < 0 || config.slippagePct > 5) {
    return "Slippage % must be between 0 and 5.";
  }
  if (config.commissionPct < 0 || config.commissionPct > 2) {
    return "Commission % must be between 0 and 2.";
  }
  if (config.gapProbability < 0 || config.gapProbability > 1) {
    return "Gap probability must be between 0 and 1.";
  }
  if (config.volatilityMultiplier <= 0 || config.volatilityMultiplier > 5) {
    return "Volatility multiplier must be between 0 and 5.";
  }
  if (config.selectedScenarios.length === 0) {
    return "Select at least one stress scenario.";
  }
  return null;
}

export function shuffleInPlace<T>(items: T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

/** Bootstrap resample with replacement. */
export function bootstrapSample<T>(
  source: readonly T[],
  size: number,
  rng: () => number
): T[] {
  if (source.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < size; i += 1) {
    out.push(source[Math.floor(rng() * source.length)]!);
  }
  return out;
}

export function boxMuller(rng: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
