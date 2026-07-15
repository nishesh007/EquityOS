/**
 * Institutional AI Screener — public façade (Sprint 9D.R1).
 * Composition layer over Research, Opportunity, Validation, Trust, Earnings, Market, Alert.
 *
 * Public API: registerScreen | runScreen | getResults | getMetrics | clearCache
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
