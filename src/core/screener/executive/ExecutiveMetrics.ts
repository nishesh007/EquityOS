/**
 * Executive Screener Metrics — composed from R1–R7 surfaces (Sprint 9D.R8).
 * No screening engine logic — aggregates injected / façade metrics only.
 */

import type { ScreenOperationalMetrics } from "../ScreenMetrics";
import type { SavedScreenRecord } from "../workspace/WorkspacePresentationModels";
import type { DiscoveryResult } from "../discovery/DiscoveryPresentationModels";
import type { StrategyDefinition } from "../strategy/StrategyDefinition";
import {
  formatCount,
  formatPct,
  formatScore,
  safeNumeric,
  safePct,
} from "./ExecutiveScreenerModels";

export interface ExecutiveScreenerMetricBundle {
  symbolsScanned: number;
  matches: number;
  runs: number;
  cacheHit: number;
  cacheMiss: number;
  screenCount: number;
  universeSize: number;
  universeCoverage: number;
  screenSuccessRate: number;
  institutionalScore: number;
  averageTrust: number;
  averageValidation: number;
  aiConfidence: number;
  highConvictionCount: number;
  portfolioCandidates: number;
  watchlistCandidates: number;
  opportunityCount: number;
  themeCount: number;
  strategyCount: number;
  savedScreenCount: number;
  historyCount: number;
  researchCount: number;
  labels: {
    symbolsScanned: string;
    matches: string;
    runs: string;
    universeCoverage: string;
    screenSuccessRate: string;
    institutionalScore: string;
    averageTrust: string;
    averageValidation: string;
    aiConfidence: string;
    highConvictionCount: string;
    portfolioCandidates: string;
    watchlistCandidates: string;
    opportunityCount: string;
    themeCount: string;
  };
}

export interface ExecutiveMetricsComposeInput {
  operational?: ScreenOperationalMetrics | null;
  screenCount?: number;
  universeSize?: number;
  savedScreens?: readonly SavedScreenRecord[];
  strategies?: readonly StrategyDefinition[];
  discovery?: DiscoveryResult | null;
  historyCount?: number;
  researchCount?: number;
  portfolioCandidates?: number;
  watchlistCandidates?: number;
  highConvictionCount?: number;
  averageTrust?: number;
  averageValidation?: number;
  aiConfidence?: number;
  institutionalScore?: number;
}

function avgField(
  rows: readonly SavedScreenRecord[],
  pick: (r: SavedScreenRecord) => number
): number {
  if (rows.length === 0) return 0;
  let sum = 0;
  let n = 0;
  for (const row of rows) {
    const v = pick(row);
    if (Number.isFinite(v)) {
      sum += v;
      n += 1;
    }
  }
  return n === 0 ? 0 : Math.round((sum / n) * 10) / 10;
}

export class ExecutiveMetrics {
  compute(input: ExecutiveMetricsComposeInput = {}): ExecutiveScreenerMetricBundle {
    const ops = input.operational;
    const saved = input.savedScreens ?? [];
    const strategies = input.strategies ?? [];
    const discovery = input.discovery;

    const symbolsScanned = safeNumeric(ops?.symbolsScanned ?? 0, 0);
    const matches = safeNumeric(ops?.matches ?? 0, 0);
    const runs = safeNumeric(ops?.runs ?? 0, 0);
    const cacheHit = safeNumeric(ops?.cacheHit ?? 0, 0);
    const cacheMiss = safeNumeric(ops?.cacheMiss ?? 0, 0);
    const screenCount = Math.max(0, Math.floor(input.screenCount ?? 0));
    const universeSize = Math.max(
      0,
      Math.floor(input.universeSize ?? symbolsScanned)
    );

    const universeCoverage =
      universeSize <= 0
        ? 0
        : safePct(Math.min(symbolsScanned, universeSize), universeSize);

    const screenSuccessRate =
      symbolsScanned <= 0 ? 0 : safePct(matches, symbolsScanned);

    const trustFromSaved = avgField(saved, (r) => r.trustAvg);
    const validationFromSaved = avgField(saved, (r) => r.validationAvg);
    const institutionalFromSaved = avgField(
      saved,
      (r) => r.institutionalScores.institutional
    );
    const convictionFromSaved = avgField(
      saved,
      (r) => r.institutionalScores.aiConviction
    );

    const discoveryIdeas = discovery?.ideas ?? [];
    const trustFromDiscovery =
      discoveryIdeas.length === 0
        ? 0
        : Math.round(
            (discoveryIdeas.reduce((s, i) => s + i.trust, 0) /
              discoveryIdeas.length) *
              10
          ) / 10;
    const validationFromDiscovery =
      discoveryIdeas.length === 0
        ? 0
        : Math.round(
            (discoveryIdeas.reduce((s, i) => s + i.validation, 0) /
              discoveryIdeas.length) *
              10
          ) / 10;
    const confidenceFromDiscovery =
      discoveryIdeas.length === 0
        ? 0
        : Math.round(
            (discoveryIdeas.reduce((s, i) => s + i.confidence, 0) /
              discoveryIdeas.length) *
              10
          ) / 10;
    const institutionalFromDiscovery =
      discoveryIdeas.length === 0
        ? 0
        : Math.round(
            (discoveryIdeas.reduce((s, i) => s + i.institutionalScore, 0) /
              discoveryIdeas.length) *
              10
          ) / 10;

    const averageTrust = safeNumeric(
      input.averageTrust ??
        (trustFromSaved || trustFromDiscovery || ops?.averageConfidence || 0),
      0
    );
    const averageValidation = safeNumeric(
      input.averageValidation ??
        (validationFromSaved || validationFromDiscovery || 0),
      0
    );
    const aiConfidence = safeNumeric(
      input.aiConfidence ??
        (ops?.averageConfidence ||
          confidenceFromDiscovery ||
          convictionFromSaved ||
          0),
      0
    );
    const institutionalScore = safeNumeric(
      input.institutionalScore ??
        (institutionalFromSaved ||
          institutionalFromDiscovery ||
          Math.round(
            (averageTrust + averageValidation + aiConfidence) / 3
          ) ||
          0),
      0
    );

    const opportunityCount = Math.max(
      0,
      discovery?.totalIdeas ?? discoveryIdeas.length
    );
    const themeCount = Math.max(
      0,
      discovery?.themes?.filter((t) => !t.empty).length ?? 0
    );

    const highConvictionCount = Math.max(
      0,
      Math.floor(
        input.highConvictionCount ??
          discoveryIdeas.filter((i) => i.aiConviction >= 75).length
      )
    );
    const portfolioCandidates = Math.max(
      0,
      Math.floor(
        input.portfolioCandidates ??
          discoveryIdeas.filter(
            (i) =>
              i.category === "Portfolio Candidates" ||
              i.badges.includes("Portfolio")
          ).length
      )
    );
    const watchlistCandidates = Math.max(
      0,
      Math.floor(
        input.watchlistCandidates ??
          discoveryIdeas.filter(
            (i) =>
              i.category === "Watchlist Candidates" ||
              i.badges.includes("Watchlist")
          ).length
      )
    );

    const inactive =
      runs === 0 &&
      saved.length === 0 &&
      opportunityCount === 0 &&
      strategies.length === 0;

    return {
      symbolsScanned,
      matches,
      runs,
      cacheHit,
      cacheMiss,
      screenCount,
      universeSize,
      universeCoverage,
      screenSuccessRate,
      institutionalScore,
      averageTrust,
      averageValidation,
      aiConfidence,
      highConvictionCount,
      portfolioCandidates,
      watchlistCandidates,
      opportunityCount,
      themeCount,
      strategyCount: strategies.length,
      savedScreenCount: saved.length,
      historyCount: Math.max(0, Math.floor(input.historyCount ?? 0)),
      researchCount: Math.max(0, Math.floor(input.researchCount ?? 0)),
      labels: {
        symbolsScanned: formatCount(symbolsScanned),
        matches: formatCount(matches),
        runs: formatCount(runs),
        universeCoverage: inactive ? "—" : formatPct(universeCoverage),
        screenSuccessRate: inactive ? "—" : formatPct(screenSuccessRate),
        institutionalScore: inactive ? "—" : formatScore(institutionalScore),
        averageTrust: inactive ? "—" : formatPct(averageTrust),
        averageValidation: inactive ? "—" : formatPct(averageValidation),
        aiConfidence: inactive ? "—" : formatPct(aiConfidence),
        highConvictionCount: formatCount(highConvictionCount),
        portfolioCandidates: formatCount(portfolioCandidates),
        watchlistCandidates: formatCount(watchlistCandidates),
        opportunityCount: formatCount(opportunityCount),
        themeCount: formatCount(themeCount),
      },
    };
  }
}
