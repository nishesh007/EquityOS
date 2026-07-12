/**
 * Sprint 9D — AI Screener filter query parser and builder utilities.
 */

import type {
  FilterCondition,
  FilterGroup,
  FilterLogic,
  FilterOperator,
  ScreenerQuery,
} from "@/lib/screener/types";
import { lookupFilter } from "@/lib/screener/registry";

let idCounter = 0;

export function createId(prefix = "f"): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Date.now().toString(36)}`;
}

export function createEmptyGroup(logic: FilterLogic = "and"): FilterGroup {
  return {
    id: createId("group"),
    logic,
    conditions: [],
    groups: [],
  };
}

export function createCondition(
  filterKey: string,
  operator: FilterOperator,
  value: number | string,
  valueTo?: number
): FilterCondition {
  lookupFilter(filterKey);
  return {
    id: createId("cond"),
    filterKey,
    operator,
    value,
    valueTo,
  };
}

export function createQuery(root?: FilterGroup): ScreenerQuery {
  return {
    root: root ?? createEmptyGroup("and"),
    limit: 100,
    sortBy: "market_cap",
    sortDirection: "desc",
  };
}

export function addCondition(
  group: FilterGroup,
  condition: FilterCondition
): FilterGroup {
  return {
    ...group,
    conditions: [...group.conditions, condition],
  };
}

export function addNestedGroup(
  parent: FilterGroup,
  nested: FilterGroup
): FilterGroup {
  return {
    ...parent,
    groups: [...parent.groups, nested],
  };
}

export function removeCondition(group: FilterGroup, conditionId: string): FilterGroup {
  return {
    ...group,
    conditions: group.conditions.filter((c) => c.id !== conditionId),
    groups: group.groups.map((g) => removeCondition(g, conditionId)),
  };
}

export function updateCondition(
  group: FilterGroup,
  conditionId: string,
  updates: Partial<Omit<FilterCondition, "id">>
): FilterGroup {
  return {
    ...group,
    conditions: group.conditions.map((c) =>
      c.id === conditionId ? { ...c, ...updates } : c
    ),
    groups: group.groups.map((g) => updateCondition(g, conditionId, updates)),
  };
}

export function parseQueryJson(json: string): ScreenerQuery {
  const parsed = JSON.parse(json) as ScreenerQuery;
  validateQuery(parsed);
  return parsed;
}

export function validateQuery(query: ScreenerQuery): void {
  if (!query.root) throw new Error("Query must have a root filter group");
  validateGroup(query.root);
}

function validateGroup(group: FilterGroup): void {
  for (const condition of group.conditions) {
    lookupFilter(condition.filterKey);
  }
  for (const nested of group.groups) {
    validateGroup(nested);
  }
}

export function serializeQuery(query: ScreenerQuery): string {
  return JSON.stringify(query);
}

export function cloneQuery(query: ScreenerQuery): ScreenerQuery {
  return JSON.parse(serializeQuery(query)) as ScreenerQuery;
}

function buildPreset(
  conditions: Array<[string, FilterOperator, number | string, number?]>
): ScreenerQuery {
  let group = createEmptyGroup("and");
  for (const [key, op, value, valueTo] of conditions) {
    group = addCondition(group, createCondition(key, op, value, valueTo));
  }
  return createQuery(group);
}

/** Preset templates for common screens */
export const SCREENER_PRESETS: Array<{
  id: string;
  name: string;
  description: string;
  query: ScreenerQuery;
}> = [
  {
    id: "quality_growth",
    name: "Quality Growth",
    description: "High ROE, strong revenue growth, reasonable valuation",
    query: buildPreset([
      ["roe", "gte", 15],
      ["revenue_growth", "gte", 10],
      ["pe", "lte", 40],
    ]),
  },
  {
    id: "value_picks",
    name: "Value Picks",
    description: "Low P/E with positive margins and low debt",
    query: buildPreset([
      ["pe", "lte", 20],
      ["debt_equity", "lte", 1],
      ["net_margin", "gte", 5],
    ]),
  },
  {
    id: "momentum_leaders",
    name: "Momentum Leaders",
    description: "Strong price momentum with high relative strength",
    query: buildPreset([
      ["change_percent", "gte", 2],
      ["relative_strength", "gte", 60],
    ]),
  },
  {
    id: "large_cap_quality",
    name: "Large Cap Quality",
    description: "Large caps with high quality and AI scores",
    query: buildPreset([
      ["market_cap", "gte", 10000],
      ["quality_score", "gte", 70],
    ]),
  },
];
