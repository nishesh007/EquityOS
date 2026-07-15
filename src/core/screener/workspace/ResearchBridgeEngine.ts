/**
 * Institutional Screener Workspace — research deep-link bridge (Sprint 9D.R7).
 * Reuses existing routes; does not rebuild research engines.
 */

import { safeScreenText } from "../ScreenModels";
import {
  emptyResearchBridgeTarget,
  normalizeResearchBridgeTarget,
  WORKSPACE_EMPTY,
  type ResearchBridgeIntent,
  type ResearchBridgeTarget,
} from "./WorkspacePresentationModels";

export interface OpenResearchOptions {
  intent?: ResearchBridgeIntent | null;
  all?: boolean | null;
}

const INTENT_PATHS: Record<
  ResearchBridgeIntent,
  (ticker: string) => { path: string; label: string }
> = {
  "AI Research Report": (ticker) => ({
    path: `/ai/research?ticker=${encodeURIComponent(ticker)}`,
    label: `AI Research Report · ${ticker}`,
  }),
  "Company Research": (ticker) => ({
    path: `/company/${encodeURIComponent(ticker)}`,
    label: `Company Research · ${ticker}`,
  }),
  "Research History": (ticker) => ({
    path: `/ai/research?history=1&ticker=${encodeURIComponent(ticker)}`,
    label: `Research History · ${ticker}`,
  }),
  "Institutional Notes": (ticker) => ({
    path: `/company/${encodeURIComponent(ticker)}?tab=notes`,
    label: `Institutional Notes · ${ticker}`,
  }),
  "Opportunity Page": (ticker) => ({
    path: `/opportunities?ticker=${encodeURIComponent(ticker)}`,
    label: `Opportunity Page · ${ticker}`,
  }),
  "Alert History": (ticker) => ({
    path: `/results?alerts=1&ticker=${encodeURIComponent(ticker)}`,
    label: `Alert History · ${ticker}`,
  }),
  "Earnings History": (ticker) => ({
    path: `/results?earnings=1&ticker=${encodeURIComponent(ticker)}`,
    label: `Earnings History · ${ticker}`,
  }),
  "Validation Report": (ticker) => ({
    path: `/results?validation=1&ticker=${encodeURIComponent(ticker)}`,
    label: `Validation Report · ${ticker}`,
  }),
  "Trust Report": (ticker) => ({
    path: `/results?trust=1&ticker=${encodeURIComponent(ticker)}`,
    label: `Trust Report · ${ticker}`,
  }),
};

const ALL_INTENTS = Object.keys(INTENT_PATHS) as ResearchBridgeIntent[];

export function openResearch(
  ticker: string,
  options?: OpenResearchOptions
): ResearchBridgeTarget | ResearchBridgeTarget[] {
  const symbol = safeScreenText(ticker, "").toUpperCase();
  if (!symbol) {
    return emptyResearchBridgeTarget(undefined, WORKSPACE_EMPTY.awaitingFirstScan);
  }

  if (options?.all) {
    return ALL_INTENTS.map((intent) => buildTarget(symbol, intent));
  }

  const intent = options?.intent ?? "Company Research";
  return buildTarget(symbol, intent);
}

function buildTarget(
  ticker: string,
  intent: ResearchBridgeIntent
): ResearchBridgeTarget {
  const resolver = INTENT_PATHS[intent] ?? INTENT_PATHS["Company Research"];
  const resolved = resolver(ticker);
  return normalizeResearchBridgeTarget({
    ticker,
    intent,
    path: resolved.path,
    label: resolved.label,
    empty: false,
  });
}

export function listResearchBridgeIntents(): ResearchBridgeIntent[] {
  return [...ALL_INTENTS];
}

export const ResearchBridgeEngine = {
  openResearch,
  listResearchBridgeIntents,
};
