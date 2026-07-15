/**
 * Institutional Strategy Screener — in-memory library (Sprint 9D.R5).
 */

import { safeScreenText } from "../ScreenModels";
import {
  normalizeStrategyDefinition,
  type StrategyDefinition,
  type StrategyDefinitionInput,
} from "./StrategyDefinition";

const strategies = new Map<string, StrategyDefinition>();
const templates = new Map<string, StrategyDefinition>();
const favorites = new Set<string>();
const recentIds: string[] = [];
const MAX_RECENT = 20;

function touchRecent(id: string): void {
  const idx = recentIds.indexOf(id);
  if (idx >= 0) recentIds.splice(idx, 1);
  recentIds.unshift(id);
  if (recentIds.length > MAX_RECENT) recentIds.length = MAX_RECENT;
}

export function createStrategy(
  input: StrategyDefinitionInput,
  options?: { force?: boolean }
): { created: boolean; skipped: boolean; definition: StrategyDefinition } {
  const id = safeScreenText(input.id, "").toLowerCase();
  if (!id) {
    throw new Error("Strategy id is required");
  }

  const existing = strategies.get(id);
  if (existing && !options?.force) {
    return { created: false, skipped: true, definition: existing };
  }

  const definition = normalizeStrategyDefinition(
    { ...input, id, origin: input.origin ?? "user" },
    existing
  );
  strategies.set(id, definition);
  if (definition.favorite) favorites.add(id);
  else favorites.delete(id);
  touchRecent(id);
  return { created: true, skipped: false, definition };
}

export function updateStrategy(
  id: string,
  patch: Partial<StrategyDefinitionInput>
): StrategyDefinition | null {
  const key = safeScreenText(id, "").toLowerCase();
  const existing = strategies.get(key);
  if (!existing) return null;

  const definition = normalizeStrategyDefinition(
    {
      ...existing,
      ...patch,
      id: key,
      root: patch.root ?? existing.root,
      createdAt: existing.createdAt,
    },
    existing
  );
  strategies.set(key, definition);
  if (definition.favorite) favorites.add(key);
  else favorites.delete(key);
  touchRecent(key);
  return definition;
}

export function deleteStrategy(id: string): boolean {
  const key = safeScreenText(id, "").toLowerCase();
  const removed = strategies.delete(key);
  favorites.delete(key);
  const idx = recentIds.indexOf(key);
  if (idx >= 0) recentIds.splice(idx, 1);
  return removed;
}

export function cloneStrategy(
  id: string,
  overrides?: Partial<StrategyDefinitionInput>
): StrategyDefinition | null {
  const source = getStrategy(id);
  if (!source) return null;

  const newId = safeScreenText(
    overrides?.id,
    `${source.id}-copy-${Date.now()}`
  ).toLowerCase();

  const result = createStrategy(
    {
      ...source,
      ...overrides,
      id: newId,
      name: safeScreenText(
        overrides?.name,
        `${source.name} (Copy)`
      ),
      origin: overrides?.origin ?? "user",
      favorite: overrides?.favorite ?? false,
      lastRunAt: undefined,
      root: overrides?.root ?? structuredClone(source.root),
    },
    { force: true }
  );
  return result.definition;
}

export function getStrategy(id: string): StrategyDefinition | null {
  const key = safeScreenText(id, "").toLowerCase();
  return strategies.get(key) ?? null;
}

export function listStrategies(options?: {
  origin?: StrategyDefinition["origin"];
  favoriteOnly?: boolean;
  recentOnly?: boolean;
}): StrategyDefinition[] {
  let list = [...strategies.values()];
  if (options?.origin) {
    list = list.filter((s) => s.origin === options.origin);
  }
  if (options?.favoriteOnly) {
    list = list.filter((s) => favorites.has(s.id) || s.favorite);
  }
  if (options?.recentOnly) {
    const order = new Map(recentIds.map((id, i) => [id, i]));
    list = list
      .filter((s) => order.has(s.id))
      .sort((a, b) => (order.get(a.id)! - order.get(b.id)!));
    return list;
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function renameStrategy(
  id: string,
  name: string
): StrategyDefinition | null {
  return updateStrategy(id, { name: safeScreenText(name, "") });
}

export function setStrategyFavorite(
  id: string,
  favorite: boolean
): StrategyDefinition | null {
  return updateStrategy(id, { favorite });
}

export function markStrategyRun(id: string, at?: string): StrategyDefinition | null {
  const key = safeScreenText(id, "").toLowerCase();
  const existing = strategies.get(key);
  if (!existing) return null;
  const lastRunAt = at ?? new Date().toISOString();
  const updated = { ...existing, lastRunAt, updatedAt: existing.updatedAt };
  strategies.set(key, updated);
  touchRecent(key);
  return updated;
}

export function saveTemplate(
  input: StrategyDefinitionInput,
  options?: { force?: boolean }
): { saved: boolean; skipped: boolean; definition: StrategyDefinition } {
  const id = safeScreenText(input.id, "").toLowerCase();
  if (!id) {
    throw new Error("Template id is required");
  }

  const existing = templates.get(id);
  if (existing && !options?.force) {
    return { saved: false, skipped: true, definition: existing };
  }

  const definition = normalizeStrategyDefinition(
    {
      ...input,
      id,
      origin: input.origin ?? "user",
      favorite: false,
    },
    existing
  );
  templates.set(id, definition);
  return { saved: true, skipped: false, definition };
}

export function listTemplates(options?: {
  origin?: StrategyDefinition["origin"];
}): StrategyDefinition[] {
  let list = [...templates.values()];
  if (options?.origin) {
    list = list.filter((t) => t.origin === options.origin);
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export function getTemplate(id: string): StrategyDefinition | null {
  const key = safeScreenText(id, "").toLowerCase();
  return templates.get(key) ?? null;
}

export function deleteTemplate(id: string): boolean {
  const key = safeScreenText(id, "").toLowerCase();
  return templates.delete(key);
}

export function getRecentStrategyIds(): string[] {
  return [...recentIds];
}

export function getFavoriteStrategyIds(): string[] {
  return [...favorites];
}

export function resetStrategyLibrary(): void {
  strategies.clear();
  templates.clear();
  favorites.clear();
  recentIds.length = 0;
}
