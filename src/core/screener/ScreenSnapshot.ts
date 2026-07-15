/**
 * Institutional AI Screener — run snapshot (Sprint 9D.R1).
 */

import type { ScreenDefinition } from "./ScreenDefinition";
import type { ScreenMatchResult, ScreenRunResults } from "./ScreenResult";
import { SCREEN_ENGINE_EMPTY, safeScreenText } from "./ScreenModels";

export interface ScreenSnapshot {
  screenId: string;
  screenName: string;
  category: string;
  version: string;
  results: ScreenMatchResult[];
  totalMatches: number;
  symbolsScanned: number;
  scanTimeMs: number;
  cacheHit: boolean;
  empty: boolean;
  emptyMessage: string;
  generatedAt: string;
  definition: ScreenDefinition | null;
}

export function buildScreenSnapshot(input: {
  definition: ScreenDefinition | null;
  run: ScreenRunResults;
  metrics: {
    symbolsScanned: number;
    scanTimeMs: number;
    cacheHit: boolean;
  };
}): ScreenSnapshot {
  const definition = input.definition;
  const emptyMessage = input.run.empty
    ? safeScreenText(input.run.emptyMessage, SCREEN_ENGINE_EMPTY.awaitingScan)
    : "";

  return {
    screenId: safeScreenText(
      input.run.screenId || definition?.id,
      ""
    ),
    screenName: safeScreenText(
      input.run.screenName || definition?.name,
      ""
    ),
    category: safeScreenText(definition?.category, "Custom"),
    version: safeScreenText(definition?.version, "1.0.0"),
    results: input.run.results,
    totalMatches: input.run.totalMatches,
    symbolsScanned: input.metrics.symbolsScanned,
    scanTimeMs: input.metrics.scanTimeMs,
    cacheHit: input.metrics.cacheHit,
    empty: input.run.empty,
    emptyMessage,
    generatedAt: input.run.generatedAt,
    definition,
  };
}

export function emptyScreenSnapshot(
  message: string = SCREEN_ENGINE_EMPTY.awaitingScan
): ScreenSnapshot {
  return {
    screenId: "",
    screenName: "",
    category: "Custom",
    version: "1.0.0",
    results: [],
    totalMatches: 0,
    symbolsScanned: 0,
    scanTimeMs: 0,
    cacheHit: false,
    empty: true,
    emptyMessage: message,
    generatedAt: new Date().toISOString(),
    definition: null,
  };
}
