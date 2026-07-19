/**
 * Sprint 10C.R7 — global command registry.
 *
 * Single catalog behind the command palette: pages, quick actions,
 * settings, help topics — plus pluggable search providers (e.g. company
 * search) so existing engines are reused, never duplicated.
 */

import { fuzzyScoreAll } from "./fuzzy";

export type CommandCategory =
  | "page"
  | "action"
  | "company"
  | "watchlist"
  | "portfolio"
  | "research"
  | "recommendation"
  | "validation"
  | "alert"
  | "calendar"
  | "news"
  | "setting"
  | "help"
  | "recent";

export const COMMAND_CATEGORY_LABELS: Readonly<Record<CommandCategory, string>> =
  Object.freeze({
    page: "Pages",
    action: "Quick Actions",
    company: "Companies",
    watchlist: "Watchlists",
    portfolio: "Portfolio",
    research: "Research",
    recommendation: "Recommendations",
    validation: "Validation",
    alert: "Alerts",
    calendar: "Calendar",
    news: "News",
    setting: "Settings",
    help: "Help",
    recent: "Recent",
  });

export interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandCategory;
  keywords?: readonly string[];
  /** Navigation target — palette pushes this route. */
  href?: string;
  /** Action id dispatched on the UI event bus (see uiBus.ts). */
  actionId?: string;
  /** Keyboard hint shown next to the command (display only). */
  shortcut?: string;
}

export interface SearchResult extends CommandItem {
  score: number;
}

/** Built-in page commands — mirror the sidebar navigation. */
const PAGE_COMMANDS: readonly CommandItem[] = Object.freeze([
  { id: "page-dashboard", title: "Dashboard", category: "page", href: "/", keywords: ["home", "terminal", "overview"], shortcut: "Ctrl+Shift+D" },
  { id: "page-research", title: "Research", category: "page", href: "/research", keywords: ["desk", "analysis", "notes"], shortcut: "Ctrl+Shift+R" },
  { id: "page-markets", title: "Markets", category: "page", href: "/markets", keywords: ["indices", "sectors"] },
  { id: "page-portfolio", title: "Portfolio", category: "page", href: "/portfolio", keywords: ["holdings", "positions", "pnl"], shortcut: "Ctrl+Shift+P" },
  { id: "page-watchlist", title: "Watchlist", category: "page", href: "/watchlist", keywords: ["tracked", "symbols"], shortcut: "Ctrl+Shift+W" },
  { id: "page-news", title: "News", category: "page", href: "/news", keywords: ["headlines", "events"] },
  { id: "page-results", title: "Results Calendar", category: "page", href: "/results", keywords: ["earnings", "calendar"] },
  { id: "page-opportunities", title: "AI Insights", category: "page", href: "/opportunities", keywords: ["recommendations", "conviction", "ideas"] },
  { id: "page-screener", title: "Screener", category: "page", href: "/screener", keywords: ["filter", "scan"] },
  { id: "page-validation", title: "Research Confidence", category: "page", href: "/validation", keywords: ["health", "modules", "integrity", "validation"] },
  { id: "page-settings", title: "Settings", category: "page", href: "/settings", keywords: ["appearance", "theme", "preferences"], shortcut: "Ctrl+," },
]);

/** Built-in quick actions — executed via the UI event bus. */
const ACTION_COMMANDS: readonly CommandItem[] = Object.freeze([
  { id: "action-open-company", title: "Open Company…", category: "action", actionId: "open-company", keywords: ["ticker", "symbol", "stock"] },
  { id: "action-open-research", title: "Open Research", category: "action", href: "/research", keywords: ["desk"] },
  { id: "action-add-watchlist", title: "Add to Watchlist", category: "action", href: "/watchlist", keywords: ["track", "follow"] },
  { id: "action-archive-recommendation", title: "Archive Recommendation", category: "action", href: "/opportunities", keywords: ["dismiss", "close"] },
  { id: "action-export-report", title: "Export Report", category: "action", actionId: "export-report", keywords: ["download", "pdf", "csv"] },
  { id: "action-compare-companies", title: "Compare Companies", category: "action", href: "/research", keywords: ["versus", "vs"] },
  { id: "action-pin-widget", title: "Pin Widget", category: "action", href: "/", keywords: ["dashboard", "workspace"] },
  { id: "action-create-workspace", title: "Create Workspace", category: "action", actionId: "create-workspace", keywords: ["profile", "layout"] },
  { id: "action-change-theme", title: "Change Theme", category: "action", actionId: "change-theme", keywords: ["dark", "light", "appearance"] },
  { id: "action-toggle-sidebar", title: "Toggle Sidebar", category: "action", actionId: "toggle-sidebar", keywords: ["collapse", "navigation"], shortcut: "Ctrl+B" },
  { id: "action-refresh-dashboard", title: "Refresh Dashboard", category: "action", actionId: "refresh-dashboard", keywords: ["reload", "update"] },
  { id: "action-shortcut-help", title: "Keyboard Shortcuts", category: "help", actionId: "show-shortcut-help", keywords: ["keys", "hotkeys", "help"], shortcut: "?" },
  { id: "action-notifications", title: "Notification Center", category: "action", actionId: "show-notifications", keywords: ["alerts", "unread", "inbox"] },
  { id: "action-help-center", title: "Help Center", category: "help", actionId: "show-help-center", keywords: ["guide", "faq", "terminology", "docs"] },
]);

const registry = new Map<string, CommandItem>(
  [...PAGE_COMMANDS, ...ACTION_COMMANDS].map((command) => [command.id, command])
);

/** Public API — register an additional palette command. */
export function registerCommand(command: CommandItem): void {
  if (registry.has(command.id)) {
    throw new Error(`Command "${command.id}" is already registered`);
  }
  registry.set(command.id, Object.freeze({ ...command }));
}

/** Public API — register a global quick action (action-category command). */
export function registerQuickAction(
  command: Omit<CommandItem, "category">
): void {
  registerCommand({ ...command, category: "action" });
}

export function listCommands(): CommandItem[] {
  return [...registry.values()];
}

export function getCommand(id: string): CommandItem | null {
  return registry.get(id) ?? null;
}

// ---------------------------------------------------------------------------
// Search providers — external domains plug in (companies, watchlists, …)
// ---------------------------------------------------------------------------

export type SearchProvider = (query: string) => CommandItem[];

const providers = new Map<string, SearchProvider>();

/** Register a named search provider consulted by searchEverything(). */
export function registerSearchProvider(
  name: string,
  provider: SearchProvider
): void {
  providers.set(name, provider);
}

export function unregisterSearchProvider(name: string): void {
  providers.delete(name);
}

/**
 * Public API — instant fuzzy search across commands and every registered
 * provider. Empty query returns the browsable catalog (pages + actions).
 */
export function searchEverything(query: string, limit = 20): SearchResult[] {
  const trimmed = query.trim();

  const commandResults: SearchResult[] = listCommands()
    .map((command) => ({
      ...command,
      score: fuzzyScoreAll(trimmed, command.title, [
        ...(command.keywords ?? []),
        COMMAND_CATEGORY_LABELS[command.category],
      ]),
    }))
    .filter((result) => result.score > 0);

  const providerResults: SearchResult[] = [];
  if (trimmed) {
    for (const provider of providers.values()) {
      try {
        for (const item of provider(trimmed)) {
          providerResults.push({ ...item, score: 88 });
        }
      } catch {
        // A failing provider must never break the palette.
      }
    }
  }

  return [...providerResults, ...commandResults]
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

/** Test hook — restore the built-in catalog. */
export function resetCommandRegistryForTests(): void {
  registry.clear();
  for (const command of [...PAGE_COMMANDS, ...ACTION_COMMANDS]) {
    registry.set(command.id, command);
  }
  providers.clear();
}
