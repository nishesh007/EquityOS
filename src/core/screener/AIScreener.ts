/**
 * Institutional AI Screener — public façade (Sprint 9D.R1 / R2).
 * Composition layer over Research, Opportunity, Validation, Trust, Earnings, Market, Alert.
 *
 * Public API (R1): registerScreen | runScreen | getResults | getMetrics | clearCache
 * Public API (R2): runTechnicalScreen | runFundamentalScreen | runMultiFactorScreen | rankResults | buildExplainability
 */

import type { ScreenDefinition, ScreenDefinitionInput } from "./ScreenDefinition";
import {
  registerBuiltinScreens,
  registerScreen as registryRegisterScreen,
  resetScreenRegistry,
  listScreens,
  getScreen,
  setScreenEnabled,
} from "./ScreenRegistry";
import { ScreenRunner } from "./ScreenRunner";
import { SCREEN_ENGINE_EMPTY, type ScreenRunOptions } from "./ScreenModels";
import type { ScreenRunResults } from "./ScreenResult";
import type { ScreenOperationalMetrics } from "./ScreenMetrics";
import type { ScreenSnapshot } from "./ScreenSnapshot";
import { emptyScreenSnapshot } from "./ScreenSnapshot";
import {
  buildExplainability as buildExplainabilityCore,
  emptyIntelligenceResult,
  rankResults as rankResultsCore,
  runFundamentalScreen as runFundamentalScreenCore,
  runMultiFactorScreen as runMultiFactorScreenCore,
  runTechnicalScreen as runTechnicalScreenCore,
  SCREEN_INTELLIGENCE_EMPTY,
  type ExplainabilityInput,
  type FundamentalScreenOptions,
  type IntelligenceScreenResult,
  type MultiFactorScreenOptions,
  type ScreenRankingMode,
  type ScreenResultCard,
  type TechnicalScreenOptions,
} from "./intelligence";

export interface AIScreenerRegistrationResult {
  registered: boolean;
  skipped: boolean;
  screensRegistered: number;
  integrations: {
    research: boolean;
    opportunity: boolean;
    validation: boolean;
    trust: boolean;
    earnings: boolean;
    market: boolean;
    alert: boolean;
    filterEngine: boolean;
  };
}

let defaultRunner: ScreenRunner | null = null;
let screenerRegistered = false;

export function registerAIScreener(options?: {
  runner?: ScreenRunner;
  force?: boolean;
}): AIScreenerRegistrationResult {
  if (screenerRegistered && !options?.force) {
    return {
      registered: false,
      skipped: true,
      screensRegistered: listScreens().length,
      integrations: emptyIntegrations(),
    };
  }

  const builtins = registerBuiltinScreens({ force: options?.force });

  if (options?.runner) {
    defaultRunner = options.runner;
  } else if (!defaultRunner || options?.force) {
    defaultRunner = new ScreenRunner();
  }

  screenerRegistered = true;

  return {
    registered: true,
    skipped: false,
    screensRegistered: builtins.total,
    integrations: {
      research: true,
      opportunity: true,
      validation: true,
      trust: true,
      earnings: true,
      market: true,
      alert: true,
      filterEngine: true,
    },
  };
}

export function getAIScreener(): ScreenRunner {
  if (!defaultRunner) {
    registerAIScreener();
  }
  return defaultRunner!;
}

export function resetAIScreener(): void {
  defaultRunner?.resetOperationalState();
  defaultRunner = null;
  screenerRegistered = false;
  resetScreenRegistry();
}

/** Public API — register a screen definition (built-in / custom / marketplace). */
export function registerScreen(
  input: ScreenDefinitionInput,
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean; definition: ScreenDefinition } {
  registerAIScreener();
  return registryRegisterScreen(input, options);
}

/** Public API — orchestrate a screen run. */
export function runScreen(
  screenId: string,
  options?: ScreenRunOptions
): ScreenSnapshot {
  registerAIScreener();
  try {
    return getAIScreener().runScreen(screenId, options);
  } catch {
    return emptyScreenSnapshot(SCREEN_ENGINE_EMPTY.awaitingScan);
  }
}

/** Public API — latest results for a screen (or last non-empty). */
export function getResults(screenId?: string): ScreenRunResults {
  registerAIScreener();
  try {
    return getAIScreener().getResults(screenId);
  } catch {
    return {
      screenId: screenId ?? "",
      screenName: "",
      results: [],
      totalMatches: 0,
      empty: true,
      emptyMessage: SCREEN_ENGINE_EMPTY.awaitingScan,
      generatedAt: new Date().toISOString(),
      fromCache: false,
    };
  }
}

/** Public API — operational metrics. */
export function getMetrics(): ScreenOperationalMetrics {
  registerAIScreener();
  try {
    return getAIScreener().getMetricsTracker().getMetrics();
  } catch {
    return {
      symbolsScanned: 0,
      matches: 0,
      scanTimeMs: 0,
      cacheHit: 0,
      cacheMiss: 0,
      averageConfidence: 0,
      runs: 0,
      lastScanAt: null,
    };
  }
}

/** Public API — clear result cache. */
export function clearCache(screenId?: string): void {
  registerAIScreener();
  try {
    getAIScreener().clearCache(screenId);
  } catch {
    // never throw
  }
}

export {
  listScreens,
  getScreen,
  setScreenEnabled,
  registerBuiltinScreens,
};

/** Public API (R2) — technical screen composition. */
export function runTechnicalScreen(
  options?: TechnicalScreenOptions
): IntelligenceScreenResult {
  registerAIScreener();
  try {
    return runTechnicalScreenCore(options);
  } catch {
    return emptyIntelligenceResult(
      "technical",
      SCREEN_INTELLIGENCE_EMPTY.awaitingScreening
    );
  }
}

/** Public API (R2) — fundamental screen composition. */
export function runFundamentalScreen(
  options?: FundamentalScreenOptions
): IntelligenceScreenResult {
  registerAIScreener();
  try {
    return runFundamentalScreenCore(options);
  } catch {
    return emptyIntelligenceResult(
      "fundamental",
      SCREEN_INTELLIGENCE_EMPTY.awaitingScreening
    );
  }
}

/** Public API (R2) — multi-factor AI screen composition. */
export function runMultiFactorScreen(
  options?: MultiFactorScreenOptions
): IntelligenceScreenResult {
  registerAIScreener();
  try {
    return runMultiFactorScreenCore(options);
  } catch {
    return emptyIntelligenceResult(
      "multi-factor",
      SCREEN_INTELLIGENCE_EMPTY.awaitingScreening
    );
  }
}

/** Public API (R2) — rank result cards. */
export function rankResults(
  cards: ScreenResultCard[],
  mode: ScreenRankingMode = "Overall"
): ScreenResultCard[] {
  try {
    return rankResultsCore(cards, mode);
  } catch {
    return cards;
  }
}

/** Public API (R2) — build explainability for a screened name. */
export function buildExplainability(input: ExplainabilityInput) {
  try {
    return buildExplainabilityCore(input);
  } catch {
    return buildExplainabilityCore({
      ticker: input.ticker,
      matchedRules: [],
      failedRules: [],
      factors: input.factors,
    });
  }
}

export type {
  TechnicalScreenOptions,
  FundamentalScreenOptions,
  MultiFactorScreenOptions,
  IntelligenceScreenResult,
  ScreenResultCard,
  ScreenRankingMode,
  ExplainabilityInput,
};

function emptyIntegrations(): AIScreenerRegistrationResult["integrations"] {
  return {
    research: true,
    opportunity: true,
    validation: true,
    trust: true,
    earnings: true,
    market: true,
    alert: true,
    filterEngine: true,
  };
}
