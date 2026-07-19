/**
 * Sprint 10C.1 — global command registry.
 *
 * Single catalog behind the command palette: pages, quick actions,
 * settings, help, sectors, screens, calendar — plus pluggable search
 * providers (company search) so existing engines are reused, never duplicated.
 */

import { fuzzyScoreAll } from "./fuzzy";
import { NSE_SECTOR_CATALOG } from "./sectorCatalog";

export type CommandCategory =
  | "page"
  | "action"
  | "company"
  | "sector"
  | "watchlist"
  | "portfolio"
  | "research"
  | "recommendation"
  | "opportunity"
  | "screen"
  | "validation"
  | "alert"
  | "calendar"
  | "news"
  | "setting"
  | "help"
  | "favorite"
  | "recent";

export const COMMAND_CATEGORY_LABELS: Readonly<Record<CommandCategory, string>> =
  Object.freeze({
    page: "Pages",
    action: "Quick Actions",
    company: "Stocks",
    sector: "Sectors",
    watchlist: "Watchlist",
    portfolio: "Portfolio",
    research: "Research Reports",
    recommendation: "Recommendations",
    opportunity: "AI Opportunities",
    screen: "Saved Screens",
    validation: "Validation",
    alert: "Alerts",
    calendar: "Economic Calendar",
    news: "News",
    setting: "Settings",
    help: "Help",
    favorite: "Favorites",
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
  {
    id: "page-dashboard",
    title: "Dashboard",
    category: "page",
    href: "/",
    keywords: ["home", "terminal", "overview", "open dashboard"],
    shortcut: "Ctrl+Shift+D",
  },
  {
    id: "page-research",
    title: "Research Workspace",
    category: "page",
    href: "/research",
    keywords: ["desk", "analysis", "notes", "open research workspace"],
    shortcut: "Ctrl+Shift+R",
  },
  {
    id: "page-ai-research",
    title: "AI Research",
    category: "research",
    href: "/ai/research",
    keywords: ["reports", "ai desk", "research reports"],
  },
  {
    id: "page-markets",
    title: "Markets",
    category: "page",
    href: "/markets",
    keywords: ["indices", "sectors", "breadth", "heatmap"],
  },
  {
    id: "page-portfolio",
    title: "Portfolio",
    category: "portfolio",
    href: "/portfolio",
    keywords: ["holdings", "positions", "pnl", "open portfolio"],
    shortcut: "Ctrl+Shift+P",
  },
  {
    id: "page-watchlist",
    title: "Watchlist",
    category: "watchlist",
    href: "/watchlist",
    keywords: ["tracked", "symbols", "open watchlist"],
    shortcut: "Ctrl+Shift+W",
  },
  {
    id: "page-news",
    title: "News",
    category: "news",
    href: "/news",
    keywords: ["headlines", "events"],
  },
  {
    id: "page-results",
    title: "Results Calendar",
    category: "calendar",
    href: "/results",
    keywords: ["earnings", "calendar", "results"],
  },
  {
    id: "page-opportunities",
    title: "AI Opportunities",
    category: "opportunity",
    href: "/opportunities",
    keywords: ["recommendations", "conviction", "ideas", "ai insights"],
  },
  {
    id: "page-screener",
    title: "Screener",
    category: "screen",
    href: "/screener",
    keywords: ["filter", "scan", "saved screens", "open screener"],
  },
  {
    id: "page-validation",
    title: "Research Confidence",
    category: "validation",
    href: "/validation",
    keywords: ["health", "modules", "integrity", "validation"],
  },
  {
    id: "page-settings",
    title: "Settings",
    category: "setting",
    href: "/settings",
    keywords: ["appearance", "theme", "preferences", "open settings"],
    shortcut: "Ctrl+,",
  },
  {
    id: "page-ai",
    title: "AI Hub",
    category: "page",
    href: "/ai",
    keywords: ["assistant", "chat"],
  },
]);

/** Built-in quick actions — executed via the UI event bus or navigation. */
const ACTION_COMMANDS: readonly CommandItem[] = Object.freeze([
  {
    id: "action-open-dashboard",
    title: "Open Dashboard",
    category: "action",
    href: "/",
    keywords: ["home", "terminal"],
  },
  {
    id: "action-open-portfolio",
    title: "Open Portfolio",
    category: "action",
    href: "/portfolio",
    keywords: ["holdings", "positions"],
  },
  {
    id: "action-open-watchlist",
    title: "Open Watchlist",
    category: "action",
    href: "/watchlist",
    keywords: ["tracked"],
  },
  {
    id: "action-open-screener",
    title: "Open Screener",
    category: "action",
    href: "/screener",
    keywords: ["filter", "scan"],
  },
  {
    id: "action-open-research-workspace",
    title: "Open Research Workspace",
    category: "action",
    href: "/research",
    keywords: ["desk", "analysis"],
  },
  {
    id: "action-open-company",
    title: "Open Company…",
    category: "action",
    actionId: "open-company",
    keywords: ["ticker", "symbol", "stock", "go to company"],
  },
  {
    id: "action-go-to-company",
    title: "Go to Company",
    category: "action",
    actionId: "open-company",
    keywords: ["ticker", "symbol", "stock"],
  },
  {
    id: "action-add-watchlist",
    title: "Add to Watchlist",
    category: "action",
    href: "/watchlist",
    keywords: ["track", "follow"],
  },
  {
    id: "action-create-watchlist",
    title: "Create Watchlist",
    category: "action",
    href: "/watchlist",
    keywords: ["new", "list"],
  },
  {
    id: "action-create-research-note",
    title: "Create Research Note",
    category: "action",
    actionId: "create-research-note",
    keywords: ["note", "journal", "write"],
  },
  {
    id: "action-archive-recommendation",
    title: "Archive Recommendation",
    category: "action",
    href: "/opportunities",
    keywords: ["dismiss", "close"],
  },
  {
    id: "action-export-report",
    title: "Export Report",
    category: "action",
    actionId: "export-report",
    keywords: ["download", "pdf", "csv"],
  },
  {
    id: "action-compare-companies",
    title: "Compare Companies",
    category: "action",
    href: "/ai/compare",
    keywords: ["versus", "vs"],
  },
  {
    id: "action-pin-widget",
    title: "Pin Widget",
    category: "action",
    href: "/",
    keywords: ["dashboard", "workspace"],
  },
  {
    id: "action-create-workspace",
    title: "Create Workspace",
    category: "action",
    actionId: "create-workspace",
    keywords: ["profile", "layout"],
  },
  {
    id: "action-change-theme",
    title: "Change Theme",
    category: "action",
    actionId: "change-theme",
    keywords: ["dark", "light", "appearance", "toggle theme"],
  },
  {
    id: "action-toggle-theme",
    title: "Toggle Theme",
    category: "action",
    actionId: "change-theme",
    keywords: ["dark", "light", "appearance"],
  },
  {
    id: "action-toggle-sidebar",
    title: "Toggle Sidebar",
    category: "action",
    actionId: "toggle-sidebar",
    keywords: ["collapse", "navigation"],
    shortcut: "Ctrl+B",
  },
  {
    id: "action-refresh-dashboard",
    title: "Refresh Dashboard",
    category: "action",
    actionId: "refresh-dashboard",
    keywords: ["reload", "update"],
  },
  {
    id: "action-refresh-market",
    title: "Refresh Market Data",
    category: "action",
    actionId: "refresh-market-data",
    keywords: ["quotes", "reload", "live"],
  },
  {
    id: "action-open-settings",
    title: "Open Settings",
    category: "setting",
    href: "/settings",
    keywords: ["preferences", "appearance"],
    shortcut: "Ctrl+,",
  },
  {
    id: "action-open-economic-calendar",
    title: "Open Economic Calendar",
    category: "calendar",
    href: "/results",
    keywords: ["earnings", "events", "macro", "future"],
    subtitle: "Earnings · macro (future-ready)",
  },
  {
    id: "action-saved-screens",
    title: "Saved Screens",
    category: "screen",
    href: "/screener",
    keywords: ["presets", "filters"],
    subtitle: "Open screener presets",
  },
  {
    id: "action-shortcut-help",
    title: "Keyboard Shortcuts",
    category: "help",
    actionId: "show-shortcut-help",
    keywords: ["keys", "hotkeys", "help"],
    shortcut: "?",
  },
  {
    id: "action-notifications",
    title: "Notification Center",
    category: "action",
    actionId: "show-notifications",
    keywords: ["alerts", "unread", "inbox"],
  },
  {
    id: "action-help-center",
    title: "Help Center",
    category: "help",
    actionId: "show-help-center",
    keywords: ["guide", "faq", "terminology", "docs"],
  },
]);

const SECTOR_COMMANDS: readonly CommandItem[] = Object.freeze(
  NSE_SECTOR_CATALOG.map((sector) => ({
    id: `sector-${sector.id}`,
    title: sector.name,
    subtitle: "NSE sector",
    category: "sector" as const,
    href: `/markets?sector=${encodeURIComponent(sector.id)}`,
    keywords: [...sector.keywords, "sector"],
  }))
);

const registry = new Map<string, CommandItem>(
  [...PAGE_COMMANDS, ...ACTION_COMMANDS, ...SECTOR_COMMANDS].map((command) => [
    command.id,
    command,
  ])
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
        command.subtitle ?? "",
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

/** Example searches shown in the empty state. */
export const SEARCH_EXAMPLES: readonly string[] = Object.freeze([
  "RELIANCE",
  "Open Portfolio",
  "Banking",
  "Toggle Theme",
  "AI Opportunities",
  "Screener",
]);

/** Test hook — restore the built-in catalog. */
export function resetCommandRegistryForTests(): void {
  registry.clear();
  for (const command of [
    ...PAGE_COMMANDS,
    ...ACTION_COMMANDS,
    ...SECTOR_COMMANDS,
  ]) {
    registry.set(command.id, command);
  }
  providers.clear();
}
