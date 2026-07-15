/**
 * Institutional Strategy Screener — presentation models (Sprint 9D.R5).
 * Empty states & cards. Never surface null / undefined / NaN.
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import type { InstitutionalResultCard } from "../intelligence/InstitutionalScreenModels";
import type { StrategyOrigin } from "./StrategyDefinition";

export const STRATEGY_EMPTY = {
  noStrategies: "No Strategies",
  noSavedTemplates: "No Saved Templates",
  noMatchingStocks: "No Matching Stocks",
  awaitingExecution: "Awaiting Execution",
} as const;

export type StrategyEmptyMessage =
  (typeof STRATEGY_EMPTY)[keyof typeof STRATEGY_EMPTY];

export interface StrategyCard {
  id: string;
  name: string;
  description: string;
  origin: StrategyOrigin;
  favorite: boolean;
  version: string;
  ruleCount: number;
  tags: string[];
  lastRunAt: string;
  empty: boolean;
  emptyMessage: StrategyEmptyMessage;
}

export interface SavedTemplateCard {
  id: string;
  name: string;
  description: string;
  origin: StrategyOrigin;
  tags: string[];
  ruleSummary: string[];
  empty: boolean;
  emptyMessage: StrategyEmptyMessage;
}

export interface StrategyExplainability {
  ticker: string;
  matched: string[];
  failed: string[];
  passed: boolean;
  summary: string;
  empty: boolean;
  emptyMessage: StrategyEmptyMessage;
}

export interface StrategyExecutionResult {
  strategyId: string;
  strategyName: string;
  cards: InstitutionalResultCard[];
  totalMatches: number;
  explainability: StrategyExplainability[];
  empty: boolean;
  emptyMessage: StrategyEmptyMessage;
  generatedAt: string;
}

export function emptyStrategyCard(
  message: StrategyEmptyMessage = STRATEGY_EMPTY.noStrategies
): StrategyCard {
  return {
    id: "",
    name: message,
    description: message,
    origin: "user",
    favorite: false,
    version: "—",
    ruleCount: 0,
    tags: [],
    lastRunAt: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function emptySavedTemplateCard(
  message: StrategyEmptyMessage = STRATEGY_EMPTY.noSavedTemplates
): SavedTemplateCard {
  return {
    id: "",
    name: message,
    description: message,
    origin: "user",
    tags: [],
    ruleSummary: [],
    empty: true,
    emptyMessage: message,
  };
}

export function emptyStrategyExplainability(
  ticker?: string | null,
  message: StrategyEmptyMessage = STRATEGY_EMPTY.awaitingExecution
): StrategyExplainability {
  return {
    ticker: safeScreenText(ticker, "—").toUpperCase(),
    matched: [],
    failed: [],
    passed: false,
    summary: message,
    empty: true,
    emptyMessage: message,
  };
}

export function emptyStrategyExecutionResult(
  message: StrategyEmptyMessage = STRATEGY_EMPTY.awaitingExecution,
  strategyId?: string | null,
  strategyName?: string | null
): StrategyExecutionResult {
  return {
    strategyId: safeScreenText(strategyId, ""),
    strategyName: safeScreenText(strategyName, message),
    cards: [],
    totalMatches: 0,
    explainability: [],
    empty: true,
    emptyMessage: message,
    generatedAt: new Date().toISOString(),
  };
}

export function normalizeStrategyCard(input: {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  origin?: StrategyOrigin | null;
  favorite?: boolean | null;
  version?: string | null;
  ruleCount?: number | null;
  tags?: string[] | null;
  lastRunAt?: string | null;
  empty?: boolean | null;
  emptyMessage?: StrategyEmptyMessage | null;
}): StrategyCard {
  const empty = input.empty === true;
  const message = input.emptyMessage ?? STRATEGY_EMPTY.noStrategies;
  return {
    id: safeScreenText(input.id, ""),
    name: safeScreenText(input.name, empty ? message : "Untitled Strategy"),
    description: safeScreenText(
      input.description,
      empty ? message : "No description"
    ),
    origin: input.origin ?? "user",
    favorite: input.favorite === true,
    version: safeScreenText(input.version, "1.0.0"),
    ruleCount: Math.max(0, Math.floor(safeScreenNumber(input.ruleCount, 0))),
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => safeScreenText(t, "")).filter(Boolean)
      : [],
    lastRunAt: safeScreenText(input.lastRunAt, "—"),
    empty,
    emptyMessage: message,
  };
}

export function normalizeSavedTemplateCard(input: {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  origin?: StrategyOrigin | null;
  tags?: string[] | null;
  ruleSummary?: string[] | null;
  empty?: boolean | null;
  emptyMessage?: StrategyEmptyMessage | null;
}): SavedTemplateCard {
  const empty = input.empty === true;
  const message = input.emptyMessage ?? STRATEGY_EMPTY.noSavedTemplates;
  return {
    id: safeScreenText(input.id, ""),
    name: safeScreenText(input.name, empty ? message : "Untitled Template"),
    description: safeScreenText(
      input.description,
      empty ? message : "No description"
    ),
    origin: input.origin ?? "user",
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => safeScreenText(t, "")).filter(Boolean)
      : [],
    ruleSummary: Array.isArray(input.ruleSummary)
      ? input.ruleSummary.map((s) => safeScreenText(s, "")).filter(Boolean)
      : [],
    empty,
    emptyMessage: message,
  };
}

export function normalizeStrategyExplainability(input: {
  ticker?: string | null;
  matched?: string[] | null;
  failed?: string[] | null;
  passed?: boolean | null;
  summary?: string | null;
  empty?: boolean | null;
  emptyMessage?: StrategyEmptyMessage | null;
}): StrategyExplainability {
  const empty = input.empty === true;
  const message = input.emptyMessage ?? STRATEGY_EMPTY.awaitingExecution;
  const matched = Array.isArray(input.matched)
    ? input.matched.map((m) => safeScreenText(m, "")).filter(Boolean)
    : [];
  const failed = Array.isArray(input.failed)
    ? input.failed.map((f) => safeScreenText(f, "")).filter(Boolean)
    : [];
  return {
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    matched,
    failed,
    passed: input.passed === true,
    summary: safeScreenText(
      input.summary,
      empty
        ? message
        : matched.length > 0
          ? matched.slice(0, 3).join(", ")
          : "No matching rules"
    ),
    empty,
    emptyMessage: message,
  };
}
