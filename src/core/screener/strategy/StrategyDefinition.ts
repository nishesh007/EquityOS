/**
 * Institutional Strategy Screener — strategy entity (Sprint 9D.R5).
 */

import { safeScreenText } from "../ScreenModels";
import {
  createRuleGroup,
  type StrategyRuleNode,
} from "./StrategyRule";

export const STRATEGY_ORIGINS = ["built-in", "user", "shared"] as const;
export type StrategyOrigin = (typeof STRATEGY_ORIGINS)[number];

export interface StrategyDefinition {
  id: string;
  name: string;
  description: string;
  root: StrategyRuleNode;
  origin: StrategyOrigin;
  favorite: boolean;
  version: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
  tags?: string[];
}

export type StrategyDefinitionInput = Omit<
  StrategyDefinition,
  "createdAt" | "updatedAt" | "favorite" | "origin" | "version" | "root"
> & {
  root?: StrategyRuleNode;
  favorite?: boolean;
  origin?: StrategyOrigin;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
  lastRunAt?: string;
  tags?: string[];
};

function emptyRoot(): StrategyRuleNode {
  return createRuleGroup({
    id: "root",
    logic: "and",
    children: [],
    label: "Root",
  });
}

function isStrategyOrigin(value: string): value is StrategyOrigin {
  return (STRATEGY_ORIGINS as readonly string[]).includes(value);
}

export function normalizeStrategyDefinition(
  input: StrategyDefinitionInput,
  existing?: StrategyDefinition | null
): StrategyDefinition {
  const now = new Date().toISOString();
  const id = safeScreenText(input.id, "").toLowerCase();
  const name = safeScreenText(input.name, id || "Untitled Strategy");
  const originRaw = input.origin ?? existing?.origin ?? "user";
  const origin = isStrategyOrigin(originRaw) ? originRaw : "user";

  return {
    id: id || `strategy-${Date.now()}`,
    name,
    description: safeScreenText(input.description, ""),
    root: input.root ?? existing?.root ?? emptyRoot(),
    origin,
    favorite: input.favorite ?? existing?.favorite ?? false,
    version: safeScreenText(input.version ?? existing?.version, "1.0.0"),
    createdAt: input.createdAt ?? existing?.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    lastRunAt: input.lastRunAt ?? existing?.lastRunAt,
    tags: Array.isArray(input.tags)
      ? input.tags.map((t) => safeScreenText(t, "")).filter(Boolean)
      : existing?.tags
        ? [...existing.tags]
        : undefined,
  };
}
