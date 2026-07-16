/**
 * Smart Watchlist Engine — orchestrator (Sprint 10B.R2).
 * Dynamic collections, AI organization, recommendations.
 */

import {
  SMART_WATCHLIST_EMPTY,
  emptySmartWatchlistView,
  type DynamicWatchlistDefinition,
  type DynamicWatchlistRunResult,
  type DynamicWatchlistTemplateId,
  type GroupingDimension,
  type SmartWatchlistCandidate,
  type SmartWatchlistView,
  type WatchlistGroupingView,
  type WatchlistLeafRule,
  type WatchlistRecommendationsView,
  type WatchlistRuleGroup,
} from "./SmartWatchlistModels";
import {
  createDynamicWatchlist,
  getLastDynamicRun,
  listDynamicWatchlists,
  resetDynamicWatchlists,
  runDynamicWatchlist,
} from "./DynamicWatchlistEngine";
import {
  createRule,
  createRuleGroup,
  resetWatchlistRules,
} from "./WatchlistRuleEngine";
import {
  groupWatchlist,
  autoGroupAllDimensions,
} from "./WatchlistGroupingEngine";
import {
  detectDuplicateTags,
  getCompanyTags,
  listTaggedCompanies,
  resetWatchlistTags,
  tagCompanies,
  type CompanyTag,
} from "./WatchlistTagEngine";
import {
  detectDuplicateWatchlists,
  getRecommendations,
} from "./WatchlistRecommendationEngine";

let engineInstance: SmartWatchlistEngine | null = null;

export class SmartWatchlistEngine {
  createDynamicWatchlist = createDynamicWatchlist;
  createRule = createRule;
  createRuleGroup = createRuleGroup;
  runDynamicWatchlist = runDynamicWatchlist;
  getRecommendations = getRecommendations;
  groupWatchlist = groupWatchlist;
  tagCompanies = tagCompanies;

  ensureBuiltinDynamicWatchlists(now?: Date | null): DynamicWatchlistDefinition[] {
    const templates: DynamicWatchlistTemplateId[] = [
      "top_conviction",
      "high_trust",
      "momentum",
      "upcoming_earnings",
    ];
    const existing = listDynamicWatchlists();
    if (existing.length >= templates.length) return existing;

    return templates.map((templateId) =>
      createDynamicWatchlist({ templateId, now })
    );
  }

  organize(input: {
    candidates: readonly SmartWatchlistCandidate[];
    dimension?: GroupingDimension;
  }): {
    tags: CompanyTag[];
    grouping: WatchlistGroupingView;
    duplicateTags: string[];
    duplicateWatchlists: ReturnType<typeof detectDuplicateWatchlists>;
  } {
    const tags = tagCompanies(input.candidates);
    const grouping = groupWatchlist({
      candidates: input.candidates,
      dimension: input.dimension ?? "sector",
    });
    return {
      tags,
      grouping,
      duplicateTags: detectDuplicateTags(input.candidates),
      duplicateWatchlists: detectDuplicateWatchlists(),
    };
  }

  getSmartView(input?: {
    candidates?: readonly SmartWatchlistCandidate[];
    watchlistSymbols?: readonly string[];
    portfolioSymbols?: readonly string[];
    dimension?: GroupingDimension;
    now?: Date | null;
  }): SmartWatchlistView {
    const candidates = input?.candidates ?? [];
    const dynamic = listDynamicWatchlists();
    const organization =
      candidates.length > 0
        ? this.organize({
            candidates,
            dimension: input?.dimension,
          })
        : null;

    const recommendations =
      candidates.length > 0
        ? getRecommendations({
            candidates,
            watchlistSymbols: input?.watchlistSymbols,
            portfolioSymbols: input?.portfolioSymbols,
          })
        : {
            toAdd: [],
            toRemove: [],
            toMonitor: [],
            trending: [],
            aiSuggestions: [],
            suggestedWatchlists: [],
            duplicates: [],
            empty: true,
            emptyMessage: SMART_WATCHLIST_EMPTY.noSuggestions,
          };

    const empty =
      dynamic.length === 0 &&
      candidates.length === 0 &&
      recommendations.empty;

    return {
      dynamic,
      lastRun: getLastDynamicRun(),
      tags: organization?.tags ?? listTaggedCompanies(),
      grouping: organization?.grouping ?? null,
      recommendations,
      empty,
      emptyMessage: empty
        ? SMART_WATCHLIST_EMPTY.awaitingAiAnalysis
        : SMART_WATCHLIST_EMPTY.noMatches,
    };
  }

  autoGroupAll(
    candidates: readonly SmartWatchlistCandidate[]
  ): WatchlistGroupingView[] {
    return autoGroupAllDimensions(candidates);
  }
}

export function getSmartWatchlistEngine(): SmartWatchlistEngine {
  if (!engineInstance) engineInstance = new SmartWatchlistEngine();
  return engineInstance;
}

export function resetSmartWatchlistEngine(): void {
  resetDynamicWatchlists();
  resetWatchlistRules();
  resetWatchlistTags();
  engineInstance = null;
}

export function createDynamicWatchlistApi(
  input: Parameters<typeof createDynamicWatchlist>[0]
): DynamicWatchlistDefinition {
  return getSmartWatchlistEngine().createDynamicWatchlist(input);
}

export function createRuleApi(
  input: Omit<WatchlistLeafRule, "kind">
): WatchlistLeafRule {
  return getSmartWatchlistEngine().createRule(input);
}

export function runDynamicWatchlistApi(
  input: Parameters<typeof runDynamicWatchlist>[0]
): DynamicWatchlistRunResult {
  return getSmartWatchlistEngine().runDynamicWatchlist(input);
}

export function getRecommendationsApi(
  input: Parameters<typeof getRecommendations>[0]
): WatchlistRecommendationsView {
  return getSmartWatchlistEngine().getRecommendations(input);
}

export function groupWatchlistApi(
  input: Parameters<typeof groupWatchlist>[0]
): WatchlistGroupingView {
  return getSmartWatchlistEngine().groupWatchlist(input);
}

export function tagCompaniesApi(
  candidates: readonly SmartWatchlistCandidate[]
): CompanyTag[] {
  return getSmartWatchlistEngine().tagCompanies(candidates);
}

export function getSmartWatchlistView(
  input?: Parameters<SmartWatchlistEngine["getSmartView"]>[0]
): SmartWatchlistView {
  return getSmartWatchlistEngine().getSmartView(input);
}

export function getCompanySmartTags(ticker: string): CompanyTag | null {
  return getCompanyTags(ticker);
}

export const SPRINT_10B_R2_FROZEN = true;

export function isSprint10BR2Frozen(): boolean {
  return SPRINT_10B_R2_FROZEN;
}

export interface SmartWatchlistHealth {
  ready: boolean;
  dynamicCount: number;
  ruleCount: number;
  lastMatchCount: number;
  tagCount: number;
  recommendationCount: number;
  groupingReady: boolean;
  emptyMessage: string;
  sprint10BR2Frozen: boolean;
}

export function getSmartWatchlistHealth(input?: {
  candidates?: readonly SmartWatchlistCandidate[];
}): SmartWatchlistHealth {
  const engine = getSmartWatchlistEngine();
  const dynamic = listDynamicWatchlists();
  const view = engine.getSmartView({ candidates: input?.candidates });
  const recCount =
    view.recommendations.toAdd.length +
    view.recommendations.toMonitor.length +
    view.recommendations.aiSuggestions.length;

  return {
    ready: dynamic.length > 0 || (input?.candidates?.length ?? 0) > 0,
    dynamicCount: dynamic.length,
    ruleCount: listDynamicWatchlists().reduce(
      (sum, d) => sum + (d.root.children?.length ?? 0),
      0
    ),
    lastMatchCount: view.lastRun?.matchCount ?? 0,
    tagCount: view.tags.length,
    recommendationCount: recCount,
    groupingReady: view.grouping != null && !view.grouping.empty,
    emptyMessage: view.empty
      ? SMART_WATCHLIST_EMPTY.awaitingAiAnalysis
      : "",
    sprint10BR2Frozen: SPRINT_10B_R2_FROZEN,
  };
}

export { emptySmartWatchlistView };
