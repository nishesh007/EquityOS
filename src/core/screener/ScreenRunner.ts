/**
 * Institutional AI Screener — runner / orchestration (Sprint 9D.R1).
 *
 * Pipeline: Universe → Filters → Existing AI Engines → Validation → Trust → Ranking → Results
 * Composition only — no duplicated Opportunity / Earnings / Research / Market calculations.
 */

import type { ScreenDefinition, ScreenRule, ScreenSortOrder } from "./ScreenDefinition";
import { ScreenCache } from "./ScreenCache";
import { ScreenMetricsTracker } from "./ScreenMetrics";
import {
  SCREEN_ENGINE_EMPTY,
  safeScreenNumber,
  safeScreenText,
  type ResolvedScreenScores,
  type ScreenEngineScores,
  type ScreenRunOptions,
  type ScreenUniverseCandidate,
} from "./ScreenModels";
import {
  emptyScreenRunResults,
  normalizeScreenMatch,
  type ScreenMatchResult,
  type ScreenRunResults,
} from "./ScreenResult";
import { getScreen, isScreenEnabled, registerBuiltinScreens } from "./ScreenRegistry";
import {
  buildScreenSnapshot,
  emptyScreenSnapshot,
  type ScreenSnapshot,
} from "./ScreenSnapshot";

export interface ScreenRunnerDeps {
  cache?: ScreenCache;
  metrics?: ScreenMetricsTracker;
  /**
   * Optional hooks to existing engines. Defaults are no-op / passthrough —
   * callers inject Opportunity / Trust / Validation / Research scores via options.engineScores.
   */
  resolveEngineScores?: (
    candidates: ScreenUniverseCandidate[],
    definition: ScreenDefinition
  ) => ScreenEngineScores[];
}

export class ScreenRunner {
  private readonly cache: ScreenCache;
  private readonly metrics: ScreenMetricsTracker;
  private readonly lastResults = new Map<string, ScreenRunResults>();
  private readonly lastSnapshots = new Map<string, ScreenSnapshot>();
  private readonly resolveEngineScores?: ScreenRunnerDeps["resolveEngineScores"];

  constructor(deps?: ScreenRunnerDeps) {
    this.cache = deps?.cache ?? new ScreenCache();
    this.metrics = deps?.metrics ?? new ScreenMetricsTracker();
    this.resolveEngineScores = deps?.resolveEngineScores;
    registerBuiltinScreens();
  }

  getCache(): ScreenCache {
    return this.cache;
  }

  getMetricsTracker(): ScreenMetricsTracker {
    return this.metrics;
  }

  resetOperationalState(): void {
    this.cache.clear();
    this.metrics.reset();
    this.lastResults.clear();
    this.lastSnapshots.clear();
  }

  runScreen(screenId: string, options: ScreenRunOptions = {}): ScreenSnapshot {
    const started = Date.now();
    registerBuiltinScreens();

    const definition = getScreen(screenId);
    if (!definition || !isScreenEnabled(screenId)) {
      const empty = emptyScreenRunResults(
        screenId,
        definition?.name ?? "",
        SCREEN_ENGINE_EMPTY.awaitingScan
      );
      const snapshot = buildScreenSnapshot({
        definition,
        run: empty,
        metrics: { symbolsScanned: 0, scanTimeMs: 0, cacheHit: false },
      });
      this.lastResults.set(screenId, empty);
      this.lastSnapshots.set(screenId, snapshot);
      return snapshot;
    }

    if (definition.universe === "none") {
      const empty = emptyScreenRunResults(
        definition.id,
        definition.name,
        SCREEN_ENGINE_EMPTY.noUniverseSelected
      );
      this.metrics.recordScan({
        symbolsScanned: 0,
        matches: 0,
        scanTimeMs: Date.now() - started,
        fromCache: false,
        averageConfidence: 0,
      });
      const snapshot = buildScreenSnapshot({
        definition,
        run: empty,
        metrics: {
          symbolsScanned: 0,
          scanTimeMs: Date.now() - started,
          cacheHit: false,
        },
      });
      this.lastResults.set(definition.id, empty);
      this.lastSnapshots.set(definition.id, snapshot);
      return snapshot;
    }

    if (!options.force) {
      const cached = this.cache.get(definition.id, definition.version);
      if (cached) {
        const cachedView = { ...cached, fromCache: true };
        this.metrics.recordScan({
          symbolsScanned: 0,
          matches: cachedView.totalMatches,
          scanTimeMs: Date.now() - started,
          fromCache: true,
          averageConfidence: averageConfidence(cachedView.results),
        });
        const snapshot = buildScreenSnapshot({
          definition,
          run: cachedView,
          metrics: {
            symbolsScanned: 0,
            scanTimeMs: Date.now() - started,
            cacheHit: true,
          },
        });
        this.lastResults.set(definition.id, cachedView);
        this.lastSnapshots.set(definition.id, snapshot);
        return snapshot;
      }
    }

    const universe = resolveUniverse(definition, options.universe);
    if (universe.length === 0) {
      const empty = emptyScreenRunResults(
        definition.id,
        definition.name,
        SCREEN_ENGINE_EMPTY.noUniverseSelected
      );
      this.metrics.recordScan({
        symbolsScanned: 0,
        matches: 0,
        scanTimeMs: Date.now() - started,
        fromCache: false,
      });
      const snapshot = buildScreenSnapshot({
        definition,
        run: empty,
        metrics: {
          symbolsScanned: 0,
          scanTimeMs: Date.now() - started,
          cacheHit: false,
        },
      });
      this.lastResults.set(definition.id, empty);
      this.lastSnapshots.set(definition.id, snapshot);
      return snapshot;
    }

    // Compose scores from existing engines (injected or resolver hook)
    const scoreMap = buildScoreMap(
      universe,
      definition,
      options.engineScores,
      this.resolveEngineScores
    );

    const matched: ScreenMatchResult[] = [];
    for (const candidate of universe) {
      const ticker = safeScreenText(candidate.ticker, "").toUpperCase();
      if (!ticker) continue;

      const scores = scoreMap.get(ticker) ?? emptyScores(ticker);
      const evaluated = evaluateRules(definition.rules, candidate, scores);
      if (!evaluated.passes) continue;

      const matchedRules = evaluated.matchedRules;
      matched.push(
        normalizeScreenMatch(
          {
            ticker,
            company: candidate.company,
            sector: candidate.sector,
            industry: candidate.industry,
            price: candidate.price,
            marketCap: candidate.marketCap,
            aiScore: scores.aiScore,
            trustScore: scores.trustScore,
            validationScore: scores.validationScore,
            confidence: scores.confidence,
            reasonSummary:
              scores.reasonSummary ||
              matchedRules.join("; ") ||
              `${definition.category} match`,
            matchedRules,
            rank: 0,
            screenId: definition.id,
            screenCategory: definition.category,
          },
          { screenId: definition.id, screenCategory: definition.category }
        )
      );
    }

    const ranked = rankResults(matched, definition.sortOrder, definition, scoreMap);
    const limited = ranked.slice(0, definition.resultLimit);

    const run: ScreenRunResults =
      limited.length === 0
        ? emptyScreenRunResults(
            definition.id,
            definition.name,
            SCREEN_ENGINE_EMPTY.noMatches
          )
        : {
            screenId: definition.id,
            screenName: definition.name,
            results: limited,
            totalMatches: limited.length,
            empty: false,
            emptyMessage: "",
            generatedAt: (options.now ?? new Date()).toISOString(),
            fromCache: false,
          };

    this.cache.set(definition.id, definition.version, run, {
      ttlMs: definition.cacheTtlMs,
    });

    const scanTimeMs = Date.now() - started;
    this.metrics.recordScan({
      symbolsScanned: universe.length,
      matches: run.totalMatches,
      scanTimeMs,
      fromCache: false,
      averageConfidence: averageConfidence(run.results),
    });

    const snapshot = buildScreenSnapshot({
      definition,
      run,
      metrics: {
        symbolsScanned: universe.length,
        scanTimeMs,
        cacheHit: false,
      },
    });

    this.lastResults.set(definition.id, run);
    this.lastSnapshots.set(definition.id, snapshot);
    return snapshot;
  }

  getResults(screenId?: string): ScreenRunResults {
    if (screenId) {
      return (
        this.lastResults.get(screenId) ??
        emptyScreenRunResults(screenId, "", SCREEN_ENGINE_EMPTY.awaitingScan)
      );
    }
    // Aggregate latest non-empty, else awaiting
    for (const run of this.lastResults.values()) {
      if (!run.empty) return run;
    }
    return emptyScreenRunResults("", "", SCREEN_ENGINE_EMPTY.awaitingScan);
  }

  getSnapshot(screenId?: string): ScreenSnapshot {
    if (screenId) {
      return (
        this.lastSnapshots.get(screenId) ??
        emptyScreenSnapshot(SCREEN_ENGINE_EMPTY.awaitingScan)
      );
    }
    for (const snap of this.lastSnapshots.values()) {
      if (!snap.empty) return snap;
    }
    return emptyScreenSnapshot(SCREEN_ENGINE_EMPTY.awaitingScan);
  }

  clearCache(screenId?: string): void {
    if (screenId) {
      const definition = getScreen(screenId);
      if (definition) this.cache.invalidate(definition.id, definition.version);
      else this.cache.invalidate(screenId);
      return;
    }
    this.cache.clear();
  }
}

function resolveUniverse(
  definition: ScreenDefinition,
  override?: ScreenUniverseCandidate[]
): ScreenUniverseCandidate[] {
  if (override && override.length > 0) {
    return override.filter((c) => safeScreenText(c.ticker, ""));
  }
  if (definition.universeSymbols && definition.universeSymbols.length > 0) {
    return definition.universeSymbols.map((ticker) => ({ ticker }));
  }
  // Portfolio / watchlist / sector / theme / custom / nse-bse without symbols
  // → empty until caller supplies universe (composition layer does not fetch market data).
  return [];
}

function buildScoreMap(
  universe: ScreenUniverseCandidate[],
  definition: ScreenDefinition,
  injected?: ScreenEngineScores[],
  resolver?: ScreenRunnerDeps["resolveEngineScores"]
): Map<string, ResolvedScreenScores> {
  const map = new Map<string, ResolvedScreenScores>();

  for (const candidate of universe) {
    const ticker = safeScreenText(candidate.ticker, "").toUpperCase();
    if (ticker) map.set(ticker, emptyScores(ticker));
  }

  const resolved = resolver?.(universe, definition) ?? [];
  for (const score of [...resolved, ...(injected ?? [])]) {
    const ticker = safeScreenText(score.ticker, "").toUpperCase();
    if (!ticker) continue;
    const prev = map.get(ticker) ?? emptyScores(ticker);
    map.set(ticker, {
      ticker,
      aiScore: pickFinite(score.aiScore, prev.aiScore),
      trustScore: pickFinite(score.trustScore, prev.trustScore),
      validationScore: pickFinite(score.validationScore, prev.validationScore),
      confidence: pickFinite(score.confidence, prev.confidence),
      opportunityScore: pickFinite(score.opportunityScore, prev.opportunityScore),
      reasonSummary: safeScreenText(score.reasonSummary, prev.reasonSummary),
      matchedRules: Array.isArray(score.matchedRules)
        ? score.matchedRules.map((r) => safeScreenText(r, "")).filter(Boolean)
        : prev.matchedRules,
      category: score.category ?? prev.category,
    });
  }

  return map;
}

function emptyScores(ticker: string): ResolvedScreenScores {
  return {
    ticker,
    aiScore: 0,
    trustScore: 0,
    validationScore: 0,
    confidence: 0,
    opportunityScore: 0,
    reasonSummary: "",
    matchedRules: [],
    category: null,
  };
}

function pickFinite(
  value: number | null | undefined,
  fallback: number
): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function evaluateRules(
  rules: ScreenRule[],
  candidate: ScreenUniverseCandidate,
  scores: ResolvedScreenScores
): { passes: boolean; matchedRules: string[] } {
  if (rules.length === 0) {
    return { passes: true, matchedRules: [] };
  }

  const matchedRules: string[] = [];
  for (const rule of rules) {
    const actual = resolveFieldValue(rule.field, candidate, scores);
    if (matchesRule(rule, actual)) {
      matchedRules.push(
        safeScreenText(rule.description, `${rule.field} ${rule.operator} ${String(rule.value)}`)
      );
    } else {
      return { passes: false, matchedRules };
    }
  }
  return { passes: true, matchedRules };
}

function resolveFieldValue(
  field: string,
  candidate: ScreenUniverseCandidate,
  scores: ResolvedScreenScores
): number | string | null {
  switch (field) {
    case "aiScore":
      return scores.aiScore;
    case "trustScore":
      return scores.trustScore;
    case "validationScore":
      return scores.validationScore;
    case "confidence":
      return scores.confidence;
    case "opportunityScore":
      return scores.opportunityScore;
    case "price":
      return candidate.price ?? null;
    case "marketCap":
      return candidate.marketCap ?? null;
    case "sector":
      return candidate.sector ?? null;
    case "industry":
      return candidate.industry ?? null;
    case "ticker":
      return candidate.ticker;
    default: {
      const fromMetrics = candidate.metrics?.[field];
      if (fromMetrics == null) return null;
      return fromMetrics;
    }
  }
}

function matchesRule(
  rule: ScreenRule,
  actual: number | string | null
): boolean {
  if (actual == null) return false;

  if (typeof actual === "number") {
    if (!Number.isFinite(actual)) return false;
    const value = typeof rule.value === "number" ? rule.value : Number(rule.value);
    switch (rule.operator) {
      case "gt":
        return actual > value;
      case "gte":
        return actual >= value;
      case "lt":
        return actual < value;
      case "lte":
        return actual <= value;
      case "eq":
        return actual === value;
      case "between":
        return (
          actual >= value &&
          actual <= safeScreenNumber(rule.valueTo, value)
        );
      case "in":
        return Array.isArray(rule.value)
          ? rule.value.map(Number).includes(actual)
          : actual === value;
      default:
        return false;
    }
  }

  const text = String(actual).toLowerCase();
  switch (rule.operator) {
    case "eq":
      return text === String(rule.value).toLowerCase();
    case "contains":
      return text.includes(String(rule.value).toLowerCase());
    case "in":
      return Array.isArray(rule.value)
        ? rule.value.map((v) => String(v).toLowerCase()).includes(text)
        : text === String(rule.value).toLowerCase();
    default:
      return false;
  }
}

function composeRankScore(
  definition: ScreenDefinition,
  scores: ResolvedScreenScores
): number {
  const w = definition.weights;
  return (
    scores.aiScore * w.aiScore +
    scores.trustScore * w.trustScore +
    scores.validationScore * w.validationScore +
    scores.confidence * w.confidence +
    scores.opportunityScore * w.opportunity
  );
}

function rankResults(
  matched: ScreenMatchResult[],
  sortOrder: ScreenSortOrder,
  definition: ScreenDefinition,
  scoreMap: Map<string, ResolvedScreenScores>
): ScreenMatchResult[] {
  const sorted = [...matched].sort((a, b) => {
    const scoreA = scoreMap.get(a.ticker) ?? emptyScores(a.ticker);
    const scoreB = scoreMap.get(b.ticker) ?? emptyScores(b.ticker);
    const compositeA = composeRankScore(definition, scoreA);
    const compositeB = composeRankScore(definition, scoreB);

    let primary = 0;
    switch (sortOrder) {
      case "trustScore":
        primary = b.trustScore - a.trustScore;
        break;
      case "validationScore":
        primary = b.validationScore - a.validationScore;
        break;
      case "confidence":
        primary = b.confidence - a.confidence;
        break;
      case "marketCap":
        primary = b.marketCap - a.marketCap;
        break;
      case "price":
        primary = b.price - a.price;
        break;
      case "aiScore":
      default:
        primary = b.aiScore - a.aiScore;
        break;
    }
    if (primary !== 0) return primary;
    return compositeB - compositeA;
  });

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
}

function averageConfidence(results: ScreenMatchResult[]): number {
  if (results.length === 0) return 0;
  const sum = results.reduce((acc, r) => acc + r.confidence, 0);
  return Math.round((sum / results.length) * 100) / 100;
}
