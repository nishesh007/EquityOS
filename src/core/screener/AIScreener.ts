/**
 * Institutional AI Screener — public façade (Sprint 9D.R1–R4).
 * Composition layer over Research, Opportunity, Validation, Trust, Earnings, Market, Alert.
 *
 * Public API (R1): registerScreen | runScreen | getResults | getMetrics | clearCache
 * Public API (R2): runTechnicalScreen | runFundamentalScreen | runMultiFactorScreen | rankResults | buildExplainability
 * Public API (R3): runEarningsScreen | runNewsScreen | runCorporateActionScreen | runManagementScreen | runEventScreen | buildEventExplainability
 * Public API (R4): runPortfolioScreen | runWatchlistScreen | runOpportunityScreen | rankInstitutionalResults | generateResearchPriority | buildInstitutionalInsights
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
  buildEventExplainability as buildEventExplainabilityCore,
  buildInstitutionalInsights as buildInstitutionalInsightsCore,
  emptyEventScreenResult,
  emptyInstitutionalScreenResult,
  emptyIntelligenceResult,
  generateResearchPriority as generateResearchPriorityCore,
  rankInstitutionalResults as rankInstitutionalResultsCore,
  rankResults as rankResultsCore,
  runCorporateActionScreen as runCorporateActionScreenCore,
  runEarningsScreen as runEarningsScreenCore,
  runEventScreen as runEventScreenCore,
  runFundamentalScreen as runFundamentalScreenCore,
  runManagementScreen as runManagementScreenCore,
  runMultiFactorScreen as runMultiFactorScreenCore,
  runNewsScreen as runNewsScreenCore,
  runOpportunityScreen as runOpportunityScreenCore,
  runPortfolioScreen as runPortfolioScreenCore,
  runTechnicalScreen as runTechnicalScreenCore,
  runWatchlistScreen as runWatchlistScreenCore,
  INSTITUTIONAL_SCREEN_EMPTY,
  SCREEN_EVENT_EMPTY,
  SCREEN_INTELLIGENCE_EMPTY,
  type CorporateActionScreenOptions,
  type EarningsScreenOptions,
  type EventCorrelationOptions,
  type EventExplainabilityInput,
  type EventScreenResult,
  type ExplainabilityInput,
  type FundamentalScreenOptions,
  type InsightBuildInput,
  type InstitutionalResultCard,
  type InstitutionalScoreFactors,
  type InstitutionalScreenResult,
  type IntelligenceScreenResult,
  type ManagementScreenOptions,
  type MultiFactorScreenOptions,
  type NewsScreenOptions,
  type OpportunityScreenOptions,
  type PortfolioScreenOptions,
  type ResearchPriorityBand,
  type ScreenRankingMode,
  type ScreenResultCard,
  type TechnicalScreenOptions,
  type WatchlistScreenOptions,
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

/** Public API (R3) — earnings event screen. */
export function runEarningsScreen(
  options?: EarningsScreenOptions
): EventScreenResult {
  registerAIScreener();
  try {
    return runEarningsScreenCore(options);
  } catch {
    return emptyEventScreenResult(
      "earnings",
      SCREEN_EVENT_EMPTY.awaitingEventScan
    );
  }
}

/** Public API (R3) — news event screen. */
export function runNewsScreen(options?: NewsScreenOptions): EventScreenResult {
  registerAIScreener();
  try {
    return runNewsScreenCore(options);
  } catch {
    return emptyEventScreenResult("news", SCREEN_EVENT_EMPTY.awaitingEventScan);
  }
}

/** Public API (R3) — corporate action screen. */
export function runCorporateActionScreen(
  options?: CorporateActionScreenOptions
): EventScreenResult {
  registerAIScreener();
  try {
    return runCorporateActionScreenCore(options);
  } catch {
    return emptyEventScreenResult(
      "corporate-action",
      SCREEN_EVENT_EMPTY.awaitingEventScan
    );
  }
}

/** Public API (R3) — management commentary screen. */
export function runManagementScreen(
  options?: ManagementScreenOptions
): EventScreenResult {
  registerAIScreener();
  try {
    return runManagementScreenCore(options);
  } catch {
    return emptyEventScreenResult(
      "management",
      SCREEN_EVENT_EMPTY.awaitingEventScan
    );
  }
}

/** Public API (R3) — correlated multi-domain event screen. */
export function runEventScreen(
  options?: EventCorrelationOptions
): EventScreenResult {
  registerAIScreener();
  try {
    return runEventScreenCore(options);
  } catch {
    return emptyEventScreenResult(
      "event",
      SCREEN_EVENT_EMPTY.awaitingEventScan
    );
  }
}

/** Public API (R3) — event explainability. */
export function buildEventExplainability(input: EventExplainabilityInput) {
  try {
    return buildEventExplainabilityCore(input);
  } catch {
    return buildEventExplainabilityCore({
      ticker: input.ticker,
      matchedRules: [],
      factors: input.factors,
    });
  }
}

/** Public API (R4) — portfolio screening. */
export function runPortfolioScreen(
  options?: PortfolioScreenOptions
): InstitutionalScreenResult {
  registerAIScreener();
  try {
    return runPortfolioScreenCore(options);
  } catch {
    return emptyInstitutionalScreenResult(
      "portfolio",
      INSTITUTIONAL_SCREEN_EMPTY.awaitingScan
    );
  }
}

/** Public API (R4) — watchlist screening. */
export function runWatchlistScreen(
  options?: WatchlistScreenOptions
): InstitutionalScreenResult {
  registerAIScreener();
  try {
    return runWatchlistScreenCore(options);
  } catch {
    return emptyInstitutionalScreenResult(
      "watchlist",
      INSTITUTIONAL_SCREEN_EMPTY.awaitingScan
    );
  }
}

/** Public API (R4) — opportunity screening. */
export function runOpportunityScreen(
  options?: OpportunityScreenOptions
): InstitutionalScreenResult {
  registerAIScreener();
  try {
    return runOpportunityScreenCore(options);
  } catch {
    return emptyInstitutionalScreenResult(
      "opportunity",
      INSTITUTIONAL_SCREEN_EMPTY.noInstitutionalOpportunities
    );
  }
}

/** Public API (R4) — rank institutional result cards. */
export function rankInstitutionalResults(
  cards: InstitutionalResultCard[]
): InstitutionalResultCard[] {
  try {
    return rankInstitutionalResultsCore(cards);
  } catch {
    return cards;
  }
}

/** Public API (R4) — research priority band. */
export function generateResearchPriority(
  factors: InstitutionalScoreFactors,
  options?: { matchedSignals?: number; hasCatalyst?: boolean }
): ResearchPriorityBand {
  try {
    return generateResearchPriorityCore(factors, options);
  } catch {
    return "Monitor";
  }
}

/** Public API (R4) — institutional insight card. */
export function buildInstitutionalInsights(input: InsightBuildInput) {
  try {
    return buildInstitutionalInsightsCore(input);
  } catch {
    return buildInstitutionalInsightsCore({
      candidate: input.candidate,
      factors: input.factors,
      matchedSignals: [],
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
  EarningsScreenOptions,
  NewsScreenOptions,
  CorporateActionScreenOptions,
  ManagementScreenOptions,
  EventCorrelationOptions,
  EventScreenResult,
  EventExplainabilityInput,
  PortfolioScreenOptions,
  WatchlistScreenOptions,
  OpportunityScreenOptions,
  InstitutionalScreenResult,
  InstitutionalResultCard,
  InstitutionalScoreFactors,
  ResearchPriorityBand,
  InsightBuildInput,
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
