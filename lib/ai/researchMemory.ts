/**
 * Research memory — account-scoped workspace storage for AI research history.
 * Persists to the user's workspace account in browser local storage.
 */

export const WORKSPACE_ID_KEY = "equityos:workspace:id";
export const MEMORY_STORAGE_PREFIX = "equityos:research:memory:";

export interface ResearchMemoryEntry {
  id: string;
  workspaceId: string;
  title: string;
  prompt: string;
  symbol: string | null;
  answer: string;
  tags: string[];
  favorite: boolean;
  pageContext: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ResearchMemorySearchOptions {
  query?: string;
  symbol?: string | null;
  tag?: string;
  favoritesOnly?: boolean;
  limit?: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function createId(): string {
  return `res-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function storageKey(workspaceId: string): string {
  return `${MEMORY_STORAGE_PREFIX}${workspaceId}`;
}

function readEntries(workspaceId: string): ResearchMemoryEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ResearchMemoryEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeEntries(workspaceId: string, entries: ResearchMemoryEntry[]): void {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey(workspaceId), JSON.stringify(entries));
}

export function getOrCreateWorkspaceId(): string {
  if (!isBrowser()) return "server-anonymous";

  const existing = localStorage.getItem(WORKSPACE_ID_KEY);
  if (existing) return existing;

  const workspaceId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `ws-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  localStorage.setItem(WORKSPACE_ID_KEY, workspaceId);
  return workspaceId;
}

export function deriveEntryTitle(prompt: string, symbol: string | null): string {
  const trimmed = prompt.trim();
  if (trimmed.length <= 72) return trimmed;
  if (symbol) return `${symbol}: ${trimmed.slice(0, 60)}…`;
  return `${trimmed.slice(0, 72)}…`;
}

export function deriveAutoTags(input: {
  prompt: string;
  symbol: string | null;
  pageContext: string | null;
}): string[] {
  const tags = new Set<string>();
  const lower = input.prompt.toLowerCase();

  if (input.symbol) tags.add(input.symbol);
  if (input.pageContext) tags.add(input.pageContext);

  if (lower.includes("compare") || lower.includes(" vs ")) tags.add("compare");
  if (lower.includes("valuation") || lower.includes("fair value")) tags.add("valuation");
  if (lower.includes("risk") || lower.includes("red flag")) tags.add("risk");
  if (lower.includes("earnings") || lower.includes("quarter")) tags.add("earnings");
  if (lower.includes("technical") || lower.includes("chart")) tags.add("technicals");
  if (lower.includes("explain")) tags.add("explain");

  return [...tags].slice(0, 6);
}

export function saveResearchEntry(input: {
  prompt: string;
  answer: string;
  symbol?: string | null;
  pageContext?: string | null;
  tags?: string[];
}): ResearchMemoryEntry | null {
  if (!isBrowser()) return null;

  const workspaceId = getOrCreateWorkspaceId();
  const entries = readEntries(workspaceId);
  const now = new Date().toISOString();
  const symbol = input.symbol ?? null;

  const entry: ResearchMemoryEntry = {
    id: createId(),
    workspaceId,
    title: deriveEntryTitle(input.prompt, symbol),
    prompt: input.prompt.trim(),
    symbol,
    answer: input.answer.trim(),
    tags: [...new Set([...(input.tags ?? []), ...deriveAutoTags({ prompt: input.prompt, symbol, pageContext: input.pageContext ?? null })])],
    favorite: false,
    pageContext: input.pageContext ?? null,
    createdAt: now,
    updatedAt: now,
  };

  writeEntries(workspaceId, [entry, ...entries].slice(0, 200));
  return entry;
}

export function updateResearchEntry(
  id: string,
  patch: Partial<Pick<ResearchMemoryEntry, "favorite" | "tags" | "title">>
): ResearchMemoryEntry | null {
  if (!isBrowser()) return null;

  const workspaceId = getOrCreateWorkspaceId();
  const entries = readEntries(workspaceId);
  let updated: ResearchMemoryEntry | null = null;

  const next = entries.map((entry) => {
    if (entry.id !== id) return entry;
    updated = {
      ...entry,
      ...patch,
      tags: patch.tags ?? entry.tags,
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });

  if (!updated) return null;
  writeEntries(workspaceId, next);
  return updated;
}

export function toggleResearchFavorite(id: string): ResearchMemoryEntry | null {
  if (!isBrowser()) return null;

  const workspaceId = getOrCreateWorkspaceId();
  const entries = readEntries(workspaceId);
  const target = entries.find((entry) => entry.id === id);
  if (!target) return null;

  return updateResearchEntry(id, { favorite: !target.favorite });
}

export function deleteResearchEntry(id: string): boolean {
  if (!isBrowser()) return false;

  const workspaceId = getOrCreateWorkspaceId();
  const entries = readEntries(workspaceId);
  const next = entries.filter((entry) => entry.id !== id);
  if (next.length === entries.length) return false;
  writeEntries(workspaceId, next);
  return true;
}

export function searchResearchMemory(
  options: ResearchMemorySearchOptions = {}
): ResearchMemoryEntry[] {
  if (!isBrowser()) return [];

  const workspaceId = getOrCreateWorkspaceId();
  let entries = readEntries(workspaceId);
  const query = options.query?.trim().toLowerCase();

  if (options.favoritesOnly) {
    entries = entries.filter((entry) => entry.favorite);
  }

  if (options.symbol) {
    entries = entries.filter(
      (entry) => entry.symbol?.toUpperCase() === options.symbol?.toUpperCase()
    );
  }

  if (options.tag) {
    const tag = options.tag.toLowerCase();
    entries = entries.filter((entry) =>
      entry.tags.some((item) => item.toLowerCase() === tag)
    );
  }

  if (query) {
    entries = entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.prompt.toLowerCase().includes(query) ||
        entry.answer.toLowerCase().includes(query) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  }

  entries.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return entries.slice(0, options.limit ?? 50);
}

export function getRecentResearch(limit = 10): ResearchMemoryEntry[] {
  return searchResearchMemory({ limit });
}

export function getFavoriteResearch(limit = 20): ResearchMemoryEntry[] {
  return searchResearchMemory({ favoritesOnly: true, limit });
}

export function getResearchTags(): string[] {
  if (!isBrowser()) return [];

  const workspaceId = getOrCreateWorkspaceId();
  const tags = new Set<string>();
  for (const entry of readEntries(workspaceId)) {
    for (const tag of entry.tags) tags.add(tag);
  }
  return [...tags].sort();
}

export function getResearchedSymbols(limit = 12): string[] {
  const symbols = new Set<string>();
  for (const entry of getRecentResearch(limit)) {
    if (entry.symbol) symbols.add(entry.symbol);
  }
  return [...symbols];
}
