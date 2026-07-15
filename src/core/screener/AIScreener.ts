/**
 * Institutional AI Screener — public façade (Sprint 9D.R1–R7).
 * Composition layer over Research, Opportunity, Validation, Trust, Earnings, Market, Alert.
 *
 * Public API (R1): registerScreen | runScreen | getResults | getMetrics | clearCache
 * Public API (R2): runTechnicalScreen | runFundamentalScreen | runMultiFactorScreen | rankResults | buildExplainability
 * Public API (R3): runEarningsScreen | runNewsScreen | runCorporateActionScreen | runManagementScreen | runEventScreen | buildEventExplainability
 * Public API (R4): runPortfolioScreen | runWatchlistScreen | runOpportunityScreen | rankInstitutionalResults | generateResearchPriority | buildInstitutionalInsights
 * Public API (R5): createStrategy | updateStrategy | deleteStrategy | cloneStrategy | saveTemplate | runStrategy | listStrategies | listTemplates
 * Public API (R6): discoverIdeas | discoverThemes | discoverSectorRotation | rankIdeas | generateInstitutionalIdeas | buildDiscoveryInsights
 * Public API (R7): saveScreen | loadScreen | listSavedScreens | compareScreens | openResearch | getTimeline | archiveScreen | favoriteScreen
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
import {
  cloneStrategy as cloneStrategyCore,
  createStrategy as createStrategyCore,
  deleteStrategy as deleteStrategyCore,
  listStrategies as listStrategiesCore,
  listTemplates as listTemplatesCore,
  registerBuiltinTemplates,
  resetStrategyLibrary,
  resetBuiltinTemplateFlag,
  runStrategy as runStrategyCore,
  saveTemplate as saveTemplateCore,
  updateStrategy as updateStrategyCore,
  STRATEGY_EMPTY,
  emptyStrategyExecutionResult,
  type StrategyDefinition,
  type StrategyDefinitionInput,
  type StrategyExecutionResult,
  type StrategyRunOptions,
} from "./strategy";
import {
  buildDiscoveryInsights as buildDiscoveryInsightsCore,
  discoverIdeasPublic as discoverIdeasCore,
  discoverSectorRotationPublic as discoverSectorRotationCore,
  discoverThemesPublic as discoverThemesCore,
  generateInstitutionalIdeasPublic as generateInstitutionalIdeasCore,
  rankIdeasPublic as rankIdeasCore,
  DISCOVERY_EMPTY,
  emptyDiscoveryInsight,
  emptyDiscoveryResult,
  type DiscoveryCandidate,
  type DiscoveryIdeaCard,
  type DiscoveryInsight,
  type DiscoveryResult,
  type InstitutionalIdeaOptions,
  type OpportunityDiscoveryOptions,
  type SectorRotationCard,
  type ThemeCard,
} from "./discovery";
import {
  archiveScreenWorkspace,
  compareScreensWorkspace,
  emptyResearchBridgeTarget,
  emptySavedScreenRecord,
  emptyScreenComparisonResult,
  emptyScreenTimelineEntry,
  favoriteScreenWorkspace,
  getTimelineWorkspace,
  getWorkspaceView as getWorkspaceViewCore,
  listSavedScreensWorkspace,
  loadScreenWorkspace,
  openResearchWorkspace,
  pinScreenWorkspace,
  resetScreenWorkspace,
  saveScreenWorkspace,
  WORKSPACE_EMPTY,
  type ComparableSide,
  type OpenResearchOptions,
  type ResearchBridgeTarget,
  type SavedScreenRecord,
  type SaveScreenInput,
  type ScreenComparisonResult,
  type ScreenTimelineEntry,
  type TimelineSnapshot,
  type WorkspaceView,
} from "./workspace";

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
  registerBuiltinTemplates({ force: options?.force });

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
  resetStrategyLibrary();
  resetBuiltinTemplateFlag();
  resetScreenWorkspace();
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

/** Public API (R5) — create strategy (never throws). */
export function createStrategy(
  input: StrategyDefinitionInput,
  options?: { force?: boolean }
): { created: boolean; skipped: boolean; definition: StrategyDefinition | null } {
  registerAIScreener();
  try {
    return createStrategyCore(input, options);
  } catch {
    return { created: false, skipped: false, definition: null };
  }
}

/** Public API (R5) — update strategy. */
export function updateStrategy(
  id: string,
  patch: Partial<StrategyDefinitionInput>
): StrategyDefinition | null {
  registerAIScreener();
  try {
    return updateStrategyCore(id, patch);
  } catch {
    return null;
  }
}

/** Public API (R5) — delete strategy. */
export function deleteStrategy(id: string): boolean {
  registerAIScreener();
  try {
    return deleteStrategyCore(id);
  } catch {
    return false;
  }
}

/** Public API (R5) — clone strategy. */
export function cloneStrategy(
  id: string,
  overrides?: Partial<StrategyDefinitionInput>
): StrategyDefinition | null {
  registerAIScreener();
  try {
    return cloneStrategyCore(id, overrides);
  } catch {
    return null;
  }
}

/** Public API (R5) — save strategy template. */
export function saveTemplate(
  input: StrategyDefinitionInput,
  options?: { force?: boolean }
): { saved: boolean; skipped: boolean; definition: StrategyDefinition | null } {
  registerAIScreener();
  try {
    return saveTemplateCore(input, options);
  } catch {
    return { saved: false, skipped: false, definition: null };
  }
}

/** Public API (R5) — run strategy against a universe. */
export function runStrategy(
  strategyIdOrDefinition: string | StrategyDefinition,
  options: StrategyRunOptions
): StrategyExecutionResult {
  registerAIScreener();
  try {
    return runStrategyCore(strategyIdOrDefinition, options);
  } catch {
    return emptyStrategyExecutionResult(STRATEGY_EMPTY.awaitingExecution);
  }
}

/** Public API (R5) — list user / shared strategies. */
export function listStrategies(options?: {
  origin?: StrategyDefinition["origin"];
  favoriteOnly?: boolean;
  recentOnly?: boolean;
}): StrategyDefinition[] {
  registerAIScreener();
  try {
    return listStrategiesCore(options);
  } catch {
    return [];
  }
}

/** Public API (R5) — list saved / built-in templates. */
export function listTemplates(options?: {
  origin?: StrategyDefinition["origin"];
}): StrategyDefinition[] {
  registerAIScreener();
  try {
    return listTemplatesCore(options);
  } catch {
    return [];
  }
}

/** Public API (R6) — discover opportunity ideas (never throws). */
export function discoverIdeas(
  candidates: DiscoveryCandidate[],
  options?: OpportunityDiscoveryOptions
): DiscoveryResult {
  registerAIScreener();
  try {
    return discoverIdeasCore(candidates, options);
  } catch {
    return emptyDiscoveryResult(DISCOVERY_EMPTY.awaitingMarketData);
  }
}

/** Public API (R6) — discover active themes. */
export function discoverThemes(
  candidates: DiscoveryCandidate[]
): ThemeCard[] {
  registerAIScreener();
  try {
    return discoverThemesCore(candidates);
  } catch {
    return [];
  }
}

/** Public API (R6) — sector rotation discovery. */
export function discoverSectorRotation(
  candidates: DiscoveryCandidate[]
): SectorRotationCard[] {
  registerAIScreener();
  try {
    return discoverSectorRotationCore(candidates);
  } catch {
    return [];
  }
}

/** Public API (R6) — rank discovery idea cards. */
export function rankIdeas(
  cards: DiscoveryIdeaCard[]
): DiscoveryIdeaCard[] {
  registerAIScreener();
  try {
    return rankIdeasCore(cards);
  } catch {
    return Array.isArray(cards) ? cards : [];
  }
}

/** Public API (R6) — generate institutional idea cards by category. */
export function generateInstitutionalIdeas(
  candidates: DiscoveryCandidate[],
  options?: InstitutionalIdeaOptions
): DiscoveryIdeaCard[] {
  registerAIScreener();
  try {
    return generateInstitutionalIdeasCore(candidates, options);
  } catch {
    return [];
  }
}

/** Public API (R6) — discovery explainability. */
export function buildDiscoveryInsights(
  cardOrCandidate: DiscoveryIdeaCard | DiscoveryCandidate,
  options?: { matchedSignals?: string[] }
): DiscoveryInsight {
  registerAIScreener();
  try {
    return buildDiscoveryInsightsCore(cardOrCandidate, options);
  } catch {
    return emptyDiscoveryInsight(
      "ticker" in cardOrCandidate ? cardOrCandidate.ticker : "—",
      DISCOVERY_EMPTY.awaitingMarketData
    );
  }
}

/** Public API (R7) — save screen results snapshot (never throws). */
export function saveScreen(input: SaveScreenInput): SavedScreenRecord {
  registerAIScreener();
  try {
    return saveScreenWorkspace(input);
  } catch {
    return emptySavedScreenRecord(WORKSPACE_EMPTY.noSavedScreens);
  }
}

/** Public API (R7) — load a saved screen by id. */
export function loadScreen(id: string): SavedScreenRecord | null {
  registerAIScreener();
  try {
    return loadScreenWorkspace(id);
  } catch {
    return null;
  }
}

/** Public API (R7) — list saved screens. */
export function listSavedScreens(options?: {
  includeArchived?: boolean;
  pinnedOnly?: boolean;
  favoriteOnly?: boolean;
  recentOnly?: boolean;
}): SavedScreenRecord[] {
  registerAIScreener();
  try {
    return listSavedScreensWorkspace(options);
  } catch {
    return [];
  }
}

/** Public API (R7) — compare two screen sides. */
export function compareScreens(
  left: ComparableSide,
  right: ComparableSide
): ScreenComparisonResult {
  registerAIScreener();
  try {
    return compareScreensWorkspace(left, right);
  } catch {
    return emptyScreenComparisonResult(WORKSPACE_EMPTY.noComparisons);
  }
}

/** Public API (R7) — open research deep-link for a ticker. */
export function openResearch(
  ticker: string,
  options?: OpenResearchOptions
): ResearchBridgeTarget | ResearchBridgeTarget[] {
  registerAIScreener();
  try {
    return openResearchWorkspace(ticker, options);
  } catch {
    return emptyResearchBridgeTarget(ticker, WORKSPACE_EMPTY.awaitingFirstScan);
  }
}

/** Public API (R7) — institutional score timeline. */
export function getTimeline(
  target: string,
  snapshots: TimelineSnapshot[],
  options?: { screenId?: string | null }
): ScreenTimelineEntry[] {
  registerAIScreener();
  try {
    return getTimelineWorkspace(target, snapshots, options);
  } catch {
    return [emptyScreenTimelineEntry(WORKSPACE_EMPTY.awaitingFirstScan)];
  }
}

/** Public API (R7) — archive a saved screen. */
export function archiveScreen(
  id: string,
  archived = true
): SavedScreenRecord | null {
  registerAIScreener();
  try {
    return archiveScreenWorkspace(id, archived);
  } catch {
    return null;
  }
}

/** Public API (R7) — favorite a saved screen. */
export function favoriteScreen(
  id: string,
  favorite = true
): SavedScreenRecord | null {
  registerAIScreener();
  try {
    return favoriteScreenWorkspace(id, favorite);
  } catch {
    return null;
  }
}

/** Public API (R7) — pin a saved screen. */
export function pinScreen(
  id: string,
  pinned = true
): SavedScreenRecord | null {
  registerAIScreener();
  try {
    return pinScreenWorkspace(id, pinned);
  } catch {
    return null;
  }
}

/** Public API (R7) — consolidated workspace view. */
export function getWorkspaceView(): WorkspaceView {
  registerAIScreener();
  try {
    return getWorkspaceViewCore();
  } catch {
    return {
      recentScreens: [],
      pinned: [],
      favorites: [],
      savedResults: [],
      sharedTemplates: [],
      recentActivity: [],
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.awaitingFirstScan,
    };
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
  StrategyDefinition,
  StrategyDefinitionInput,
  StrategyExecutionResult,
  StrategyRunOptions,
  DiscoveryCandidate,
  DiscoveryIdeaCard,
  DiscoveryInsight,
  DiscoveryResult,
  InstitutionalIdeaOptions,
  OpportunityDiscoveryOptions,
  SectorRotationCard,
  ThemeCard,
  SavedScreenRecord,
  ScreenComparisonResult,
  ScreenTimelineEntry,
  ResearchBridgeTarget,
  WorkspaceView,
  SaveScreenInput,
  ComparableSide,
  OpenResearchOptions,
  TimelineSnapshot,
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
