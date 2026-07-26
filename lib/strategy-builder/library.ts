/**
 * Strategy library CRUD + localStorage persistence.
 */

import { evaluateStrategyBundle } from "./evaluate";
import { createStrategyFromParts } from "./generator";
import type {
  BuiltStrategy,
  LibraryFilterState,
  StrategyBuildingBlocks,
  StrategyRules,
} from "./types";
import { createStrategyId, nowIso } from "./utils";

export const LIBRARY_STORAGE_KEY = "equityos.research.strategy-builder.library.v1";

interface LibraryPayload {
  version: 1;
  library: BuiltStrategy[];
}

export function saveLibrary(library: BuiltStrategy[]): { ok: boolean; error?: string } {
  if (typeof window === "undefined") return { ok: true };
  try {
    const payload: LibraryPayload = { version: 1, library };
    window.localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to persist strategy library (storage full or blocked)." };
  }
}

export function loadLibrary(): BuiltStrategy[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Partial<LibraryPayload>;
    if (!Array.isArray(parsed.library)) return [];
    return parsed.library.filter(
      (s): s is BuiltStrategy =>
        Boolean(s && typeof s.id === "string" && typeof s.name === "string")
    );
  } catch {
    return [];
  }
}

export function isDuplicateName(
  library: readonly BuiltStrategy[],
  name: string,
  excludeId?: string
): boolean {
  const n = name.trim().toLowerCase();
  return library.some(
    (s) => !s.archived && s.id !== excludeId && s.name.trim().toLowerCase() === n
  );
}

export function saveToLibrary(
  library: BuiltStrategy[],
  strategy: BuiltStrategy
): { library: BuiltStrategy[]; error?: string; strategy: BuiltStrategy } {
  if (isDuplicateName(library, strategy.name, strategy.id)) {
    return {
      library,
      strategy,
      error: `A strategy named "${strategy.name}" already exists.`,
    };
  }
  const nextStrategy: BuiltStrategy = {
    ...strategy,
    source: strategy.source === "generated" ? "library" : strategy.source,
    updatedAt: nowIso(),
  };
  const existing = library.findIndex((s) => s.id === nextStrategy.id);
  const next =
    existing >= 0
      ? library.map((s, i) => (i === existing ? nextStrategy : s))
      : [nextStrategy, ...library];
  const persist = saveLibrary(next);
  if (!persist.ok) return { library, strategy, error: persist.error };
  return { library: next, strategy: nextStrategy };
}

export function duplicateStrategy(
  library: BuiltStrategy[],
  strategy: BuiltStrategy
): { library: BuiltStrategy[]; strategy: BuiltStrategy; error?: string } {
  let name = `${strategy.name} (Copy)`;
  let n = 2;
  while (isDuplicateName(library, name)) {
    name = `${strategy.name} (Copy ${n})`;
    n += 1;
  }
  const copy = evaluateStrategyBundle({
    ...strategy,
    id: createStrategyId("copy"),
    name,
    favorite: false,
    archived: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    source: "duplicated",
    tags: [...strategy.tags],
    blocks: {
      ...strategy.blocks,
      technicalIndicators: [...strategy.blocks.technicalIndicators],
      fundamentalFilters: [...strategy.blocks.fundamentalFilters],
      valuationFilters: [...strategy.blocks.valuationFilters],
      volumeFilters: [...strategy.blocks.volumeFilters],
      momentumFilters: [...strategy.blocks.momentumFilters],
      riskRules: [...strategy.blocks.riskRules],
      exitRules: [...strategy.blocks.exitRules],
    },
    rules: {
      ...strategy.rules,
      entry: [...strategy.rules.entry],
      exit: [...strategy.rules.exit],
      riskRules: [...strategy.rules.riskRules],
      marketFilters: [...strategy.rules.marketFilters],
      sectorFilters: [...strategy.rules.sectorFilters],
      liquidityFilters: [...strategy.rules.liquidityFilters],
    },
  });
  return saveToLibrary(library, copy);
}

export function renameStrategy(
  library: BuiltStrategy[],
  id: string,
  name: string
): { library: BuiltStrategy[]; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { library, error: "Name cannot be empty." };
  if (isDuplicateName(library, trimmed, id)) {
    return { library, error: `A strategy named "${trimmed}" already exists.` };
  }
  const next = library.map((s) =>
    s.id === id ? { ...s, name: trimmed, updatedAt: nowIso() } : s
  );
  const persist = saveLibrary(next);
  if (!persist.ok) return { library, error: persist.error };
  return { library: next };
}

export function archiveStrategy(
  library: BuiltStrategy[],
  id: string,
  archived = true
): BuiltStrategy[] {
  const next = library.map((s) =>
    s.id === id ? { ...s, archived, updatedAt: nowIso() } : s
  );
  saveLibrary(next);
  return next;
}

export function deleteStrategy(
  library: BuiltStrategy[],
  id: string
): BuiltStrategy[] {
  const next = library.filter((s) => s.id !== id);
  saveLibrary(next);
  return next;
}

export function toggleFavorite(
  library: BuiltStrategy[],
  id: string
): BuiltStrategy[] {
  const next = library.map((s) =>
    s.id === id ? { ...s, favorite: !s.favorite, updatedAt: nowIso() } : s
  );
  saveLibrary(next);
  return next;
}

export function setStrategyTags(
  library: BuiltStrategy[],
  id: string,
  tags: string[]
): BuiltStrategy[] {
  const cleaned = Array.from(
    new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))
  );
  const next = library.map((s) =>
    s.id === id ? { ...s, tags: cleaned, updatedAt: nowIso() } : s
  );
  saveLibrary(next);
  return next;
}

export function updateStrategyRules(
  library: BuiltStrategy[],
  id: string,
  patch: { blocks?: StrategyBuildingBlocks; rules?: StrategyRules; name?: string }
): { library: BuiltStrategy[]; strategy?: BuiltStrategy; error?: string } {
  const current = library.find((s) => s.id === id);
  if (!current) return { library, error: "Strategy not found." };
  if (patch.name && isDuplicateName(library, patch.name, id)) {
    return { library, error: `A strategy named "${patch.name}" already exists.` };
  }
  const refreshed = evaluateStrategyBundle({
    ...current,
    name: patch.name?.trim() || current.name,
    blocks: patch.blocks ?? current.blocks,
    rules: patch.rules ?? current.rules,
    updatedAt: nowIso(),
  });
  const next = library.map((s) => (s.id === id ? refreshed : s));
  const persist = saveLibrary(next);
  if (!persist.ok) return { library, error: persist.error };
  return { library: next, strategy: refreshed };
}

export function filterLibrary(
  library: readonly BuiltStrategy[],
  filters: LibraryFilterState
): BuiltStrategy[] {
  const q = filters.query.trim().toLowerCase();
  return library.filter((s) => {
    if (!filters.includeArchived && s.archived) return false;
    if (filters.favoritesOnly && !s.favorite) return false;
    if (filters.tag && !s.tags.includes(filters.tag)) return false;
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some((t) => t.includes(q))
    );
  });
}

export function strategyFromTemplateEdit(
  templateId: string,
  name: string,
  blocks: StrategyBuildingBlocks,
  rules: StrategyRules,
  tags: string[]
): BuiltStrategy {
  return createStrategyFromParts({
    name,
    templateId,
    blocks,
    rules,
    tags,
    source: "template",
  });
}
