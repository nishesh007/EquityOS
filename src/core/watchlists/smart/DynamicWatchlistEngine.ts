/**
 * Dynamic Watchlist Engine — rule-driven collections (Sprint 10B.R2).
 */

import { createWatchlistRecord, updateWatchlistRecord } from "../WatchlistRegistry";
import type { WatchlistRecord } from "../WatchlistModels";
import {
  createRule,
  createRuleGroup,
  countRulesInTree,
  filterCandidatesByRule,
} from "./WatchlistRuleEngine";
import {
  DYNAMIC_TEMPLATE_LABELS,
  SMART_WATCHLIST_EMPTY,
  emptyDynamicWatchlist,
  safeSmartText,
  type DynamicWatchlistDefinition,
  type DynamicWatchlistRunResult,
  type DynamicWatchlistTemplateId,
  type SmartWatchlistCandidate,
  type WatchlistRuleGroup,
} from "./SmartWatchlistModels";

const dynamicWatchlists = new Map<string, DynamicWatchlistDefinition>();
let dynamicSeq = 0;
let lastRun: DynamicWatchlistRunResult | null = null;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function templateRoot(
  templateId: DynamicWatchlistTemplateId
): WatchlistRuleGroup {
  switch (templateId) {
    case "top_conviction":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        label: DYNAMIC_TEMPLATE_LABELS[templateId],
        children: [
          createRule({
            id: `${templateId}-conviction`,
            field: "ai_conviction",
            operator: "gte",
            value: 75,
            label: "High AI Conviction",
          }),
        ],
      });
    case "upcoming_earnings":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-earnings`,
            field: "days_to_earnings",
            operator: "lte",
            value: 14,
            label: "Earnings within 14 days",
          }),
        ],
      });
    case "high_trust":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-trust`,
            field: "trust_score",
            operator: "gte",
            value: 70,
          }),
        ],
      });
    case "low_risk":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-risk`,
            field: "risk_score",
            operator: "lte",
            value: 30,
          }),
        ],
      });
    case "momentum":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-mom`,
            field: "momentum",
            operator: "gte",
            value: 60,
          }),
        ],
      });
    case "value":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-pe`,
            field: "pe",
            operator: "lte",
            value: 20,
          }),
          createRule({
            id: `${templateId}-roe`,
            field: "roe",
            operator: "gte",
            value: 15,
          }),
        ],
      });
    case "growth":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-sales`,
            field: "sales_growth",
            operator: "gte",
            value: 15,
          }),
        ],
      });
    case "dividend":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-div`,
            field: "dividend_yield",
            operator: "gte",
            value: 2,
          }),
        ],
      });
    case "turnaround":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-profit`,
            field: "profit_growth",
            operator: "lt",
            value: 0,
          }),
          createRule({
            id: `${templateId}-conv`,
            field: "ai_conviction",
            operator: "gte",
            value: 55,
          }),
        ],
      });
    case "fifty_two_week_high":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-high`,
            field: "near_52w_high",
            operator: "gte",
            value: 95,
          }),
        ],
      });
    case "fifty_two_week_low":
      return createRuleGroup({
        id: `${templateId}-root`,
        logic: "and",
        children: [
          createRule({
            id: `${templateId}-low`,
            field: "near_52w_low",
            operator: "lte",
            value: 105,
          }),
        ],
      });
    default:
      return createRuleGroup({ id: "empty-root", logic: "and", children: [] });
  }
}

export function createDynamicWatchlist(input: {
  templateId?: DynamicWatchlistTemplateId | null;
  name?: string | null;
  description?: string | null;
  root?: WatchlistRuleGroup | null;
  tags?: string[] | null;
  priority?: number | null;
  now?: Date | null;
}): DynamicWatchlistDefinition {
  dynamicSeq += 1;
  const templateId = input.templateId ?? "top_conviction";
  const now = stamp(input.now);
  const id = `dynamic-${templateId}-${dynamicSeq}`;
  const root = input.root ?? templateRoot(templateId);

  const def: DynamicWatchlistDefinition = {
    id,
    templateId,
    name: safeSmartText(input.name, DYNAMIC_TEMPLATE_LABELS[templateId]),
    description: safeSmartText(
      input.description,
      `Dynamic watchlist driven by ${DYNAMIC_TEMPLATE_LABELS[templateId]} rules`
    ),
    root,
    tags: Array.isArray(input.tags) ? input.tags : ["dynamic", templateId],
    priority: input.priority ?? 60,
    createdAt: now,
    updatedAt: now,
    empty: false,
    emptyMessage: SMART_WATCHLIST_EMPTY.noMatches,
  };

  dynamicWatchlists.set(id, def);
  return def;
}

export function getDynamicWatchlist(id: string): DynamicWatchlistDefinition | null {
  return dynamicWatchlists.get(safeSmartText(id, "")) ?? null;
}

export function listDynamicWatchlists(): DynamicWatchlistDefinition[] {
  return Array.from(dynamicWatchlists.values()).sort(
    (a, b) => b.priority - a.priority
  );
}

export function runDynamicWatchlist(input: {
  watchlistId: string;
  candidates: readonly SmartWatchlistCandidate[];
  syncRegistry?: boolean;
  now?: Date | null;
}): DynamicWatchlistRunResult {
  const def = getDynamicWatchlist(input.watchlistId);
  if (!def || def.empty) {
    return {
      watchlistId: input.watchlistId,
      templateId: "custom",
      matches: [],
      matchCount: 0,
      rulesEvaluated: 0,
      empty: true,
      emptyMessage: SMART_WATCHLIST_EMPTY.noDynamicRules,
      ranAt: stamp(input.now),
    };
  }

  const matches = filterCandidatesByRule(def.root, input.candidates);
  const symbols = matches.map((m) => m.ticker.toUpperCase());

  if (input.syncRegistry) {
    const recordId = `dynamic-${def.id}`;
    const existing = createWatchlistRecord({
      id: recordId,
      kind: "custom",
      name: def.name,
      description: def.description,
      tags: def.tags,
      priority: def.priority,
      symbols,
      now: input.now,
    });
    updateWatchlistRecord(existing.id, { symbols, now: input.now });
  }

  const result: DynamicWatchlistRunResult = {
    watchlistId: def.id,
    templateId: def.templateId,
    matches,
    matchCount: matches.length,
    rulesEvaluated: countRulesInTree(def.root),
    empty: matches.length === 0,
    emptyMessage:
      matches.length === 0
        ? SMART_WATCHLIST_EMPTY.noMatches
        : SMART_WATCHLIST_EMPTY.awaitingAiAnalysis,
    ranAt: stamp(input.now),
  };

  lastRun = result;
  dynamicWatchlists.set(def.id, {
    ...def,
    updatedAt: stamp(input.now),
  });

  return result;
}

export function getLastDynamicRun(): DynamicWatchlistRunResult | null {
  return lastRun;
}

export function syncDynamicToRegistry(
  def: DynamicWatchlistDefinition,
  symbols: string[],
  now?: Date | null
): WatchlistRecord {
  return createWatchlistRecord({
    id: `dynamic-${def.id}`,
    kind: "custom",
    name: def.name,
    description: def.description,
    tags: [...def.tags, "dynamic-sync"],
    priority: def.priority,
    symbols,
    now,
  });
}

export function resetDynamicWatchlists(): void {
  dynamicWatchlists.clear();
  dynamicSeq = 0;
  lastRun = null;
}

export class DynamicWatchlistEngine {
  createDynamicWatchlist = createDynamicWatchlist;
  runDynamicWatchlist = runDynamicWatchlist;
  listDynamicWatchlists = listDynamicWatchlists;
  getLastRun = getLastDynamicRun;
  reset = resetDynamicWatchlists;
}
