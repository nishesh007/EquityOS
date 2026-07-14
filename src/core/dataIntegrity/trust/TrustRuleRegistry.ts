/**
 * Trust module registry — extensible registration of validation score sources.
 * Registration is idempotent.
 */

import {
  BUILTIN_TRUST_MODULE_IDS,
  type BuiltinTrustModuleId,
  type TrustModuleId,
} from "./TrustConfiguration";

export interface TrustModuleDefinition {
  id: TrustModuleId;
  name: string;
  description?: string;
  /** Default weight contribution (merged into TrustWeightManager on register). */
  defaultWeight?: number;
  /** Extract a 0–100 score from a validated payload section. */
  extractScore?: (payload: unknown) => number | undefined;
}

export interface TrustModuleRegistrationResult {
  registered: number;
  skipped: number;
  total: number;
}

const modules = new Map<string, TrustModuleDefinition>();
let builtinsRegistered = false;

export function buildBuiltinTrustModules(): TrustModuleDefinition[] {
  const labels: Record<BuiltinTrustModuleId, string> = {
    dataIntegrity: "Data Integrity Engine",
    marketValidation: "Market Validation",
    technicalValidation: "Technical Validation",
    fundamentalValidation: "Fundamental Validation",
    recommendationValidation: "Recommendation Validation",
    tradeSetupValidation: "Trade Setup Validation",
    hallucinationDetection: "Hallucination Detection",
    historicalPerformance: "Historical Performance",
  };

  return BUILTIN_TRUST_MODULE_IDS.map((id) => ({
    id,
    name: labels[id],
    description: `Built-in trust source: ${labels[id]}`,
    extractScore: (payload: unknown) => readModuleScore(payload, id),
  }));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

/** Read a module score from nested moduleScores / scores / flat payload keys. */
export function readModuleScore(
  payload: unknown,
  moduleId: string
): number | undefined {
  if (!isPlainObject(payload)) return undefined;

  const nestedKeys = ["moduleScores", "scores", "validationScores", "trustInputs"];
  for (const key of nestedKeys) {
    if (isPlainObject(payload[key])) {
      const nested = payload[key] as Record<string, unknown>;
      const n = readNumber(nested[moduleId]);
      if (n !== undefined) return n;
    }
  }

  return readNumber(payload[moduleId]);
}

export function registerTrustModule(
  definition: TrustModuleDefinition,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (modules.has(definition.id) && !options?.force) {
    return { registered: false, skipped: true };
  }
  modules.set(definition.id, { ...definition });
  return { registered: true, skipped: false };
}

/** Idempotent registration of all built-in trust modules. */
export function registerBuiltinTrustModules(options?: {
  force?: boolean;
}): TrustModuleRegistrationResult {
  if (builtinsRegistered && !options?.force) {
    return { registered: 0, skipped: modules.size, total: modules.size };
  }

  let added = 0;
  let skipped = 0;
  for (const def of buildBuiltinTrustModules()) {
    const result = registerTrustModule(def, options);
    if (result.registered) added += 1;
    else skipped += 1;
  }
  builtinsRegistered = true;
  return { registered: added, skipped, total: modules.size };
}

export function getRegisteredTrustModules(): TrustModuleDefinition[] {
  return [...modules.values()].map((m) => ({ ...m }));
}

export function getTrustModule(
  id: TrustModuleId
): TrustModuleDefinition | undefined {
  const found = modules.get(id);
  return found ? { ...found } : undefined;
}

export function extractAllModuleScores(
  payload: unknown
): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const mod of modules.values()) {
    const extracted = mod.extractScore?.(payload);
    if (extracted !== undefined && Number.isFinite(extracted)) {
      scores[mod.id] = Math.max(0, Math.min(100, extracted));
      continue;
    }
    const fallback = readModuleScore(payload, mod.id);
    if (fallback !== undefined) {
      scores[mod.id] = Math.max(0, Math.min(100, fallback));
    }
  }
  return scores;
}

export function resetTrustModuleRegistrationState(): void {
  modules.clear();
  builtinsRegistered = false;
}
