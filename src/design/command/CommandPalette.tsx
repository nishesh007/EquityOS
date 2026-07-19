"use client";

/**
 * Sprint 10C.1 — Global Search & Command Palette (Ctrl/Cmd+K).
 *
 * Keyboard-first search across stocks, sectors, pages, portfolio,
 * watchlist, research, opportunities, screens, calendar, settings & help.
 * Favorites, recents, highlight, debounce, virtualized results.
 * Presentation only.
 */

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  CornerDownLeft,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Pin,
  Search,
  Settings,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { preloadCompanySearch, searchCompanies } from "@/lib/company-search";
import { getCompanyRoute } from "@/lib/routes";
import { toggleTheme } from "../theme/ThemeEngine";
import {
  getFavorites,
  getRecents,
  isFavorite,
  recordRecent,
  toggleFavorite,
  type FavoriteItem,
  type RecentKind,
} from "../productivity/recentItems";
import { highlightSearchText } from "../tables/searchHighlight";
import {
  COMMAND_CATEGORY_LABELS,
  SEARCH_EXAMPLES,
  registerSearchProvider,
  searchEverything,
  type CommandCategory,
  type SearchResult,
} from "./commandRegistry";
import { emitUiEvent, onUiEvent, type UiEventName } from "./uiBus";

const DEBOUNCE_MS = 120;
const VIRTUAL_THRESHOLD = 28;
const VIRTUAL_WINDOW = 18;

const CATEGORY_ICONS: Partial<Record<CommandCategory, typeof Search>> = {
  page: LayoutDashboard,
  action: Zap,
  company: Building2,
  sector: Sparkles,
  setting: Settings,
  help: HelpCircle,
  research: FileText,
  portfolio: Briefcase,
  watchlist: Star,
  opportunity: Sparkles,
  screen: Search,
  calendar: Calendar,
  recent: Clock,
  favorite: Pin,
};

interface PaletteEntry extends SearchResult {
  section: string;
  favoriteKind?: RecentKind;
}

function favoriteKindFor(entry: SearchResult): RecentKind {
  if (entry.category === "company") return "company";
  if (entry.category === "research" || entry.category === "opportunity") {
    return "research";
  }
  if (entry.category === "page" || entry.href) return "page";
  return "command";
}

export function CommandPalette() {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentsVersion, setRecentsVersion] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    registerSearchProvider("companies", (q) =>
      searchCompanies(q, 8).map((company) => ({
        id: `company-${company.symbol}`,
        title: company.name,
        subtitle: `${company.displaySymbol} · ${company.sector}`,
        category: "company" as const,
        href: getCompanyRoute(company.displaySymbol),
        keywords: [company.displaySymbol, company.symbol, company.sector],
      }))
    );
  }, []);

  useEffect(() => {
    return onUiEvent("open-command-palette", (detail) => {
      setQuery(typeof detail === "string" ? detail : "");
      setDebouncedQuery(typeof detail === "string" ? detail : "");
      setActiveIndex(0);
      setOpen(true);
      preloadCompanySearch();
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query);
      setActiveIndex(0);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [query]);

  const entries: PaletteEntry[] = useMemo(() => {
    const trimmed = debouncedQuery.trim();
    const favorites = getFavorites().map((item) => ({
      id: item.id,
      title: item.label,
      subtitle: "Pinned",
      category: "favorite" as const,
      href: item.href,
      score: 120,
      section: "Favorites",
      favoriteKind: item.kind,
    }));

    if (!trimmed) {
      const recentStocks = getRecents("company", 4).map((item) => ({
        id: `recent-${item.kind}-${item.id}`,
        title: item.label,
        subtitle: "Recent stock",
        category: "recent" as const,
        href: item.href,
        score: 100,
        section: "Recent Stocks",
        favoriteKind: item.kind,
      }));
      const recentPages = getRecents("page", 3).map((item) => ({
        id: `recent-${item.kind}-${item.id}`,
        title: item.label,
        subtitle: "Recent page",
        category: "recent" as const,
        href: item.href,
        score: 99,
        section: "Recent Pages",
        favoriteKind: item.kind,
      }));
      const recentResearch = getRecents("research", 3).map((item) => ({
        id: `recent-${item.kind}-${item.id}`,
        title: item.label,
        subtitle: "Recent research",
        category: "recent" as const,
        href: item.href,
        score: 98,
        section: "Recent Research",
        favoriteKind: item.kind,
      }));
      const recentCommands = getRecents("command", 3).map((item) => ({
        id: `recent-${item.kind}-${item.id}`,
        title: item.label,
        subtitle: "Recent command",
        category: "recent" as const,
        href: item.href,
        score: 97,
        section: "Recent Commands",
        favoriteKind: item.kind,
      }));
      const catalog = searchEverything("", 24).map((result) => ({
        ...result,
        section: COMMAND_CATEGORY_LABELS[result.category],
        favoriteKind: favoriteKindFor(result),
      }));
      return [
        ...favorites,
        ...recentStocks,
        ...recentPages,
        ...recentResearch,
        ...recentCommands,
        ...catalog,
      ];
    }

    const results = searchEverything(trimmed, 40).map((result) => ({
      ...result,
      section: COMMAND_CATEGORY_LABELS[result.category],
      favoriteKind: favoriteKindFor(result),
    }));

    // Pinned matches float to the top of filtered results.
    const pinnedIds = new Set(
      getFavorites().map((f) => `${f.kind}:${f.id}`)
    );
    const boosted = [...results].sort((a, b) => {
      const aPin = pinnedIds.has(`${a.favoriteKind}:${a.id}`) ? 1 : 0;
      const bPin = pinnedIds.has(`${b.favoriteKind}:${b.id}`) ? 1 : 0;
      if (aPin !== bPin) return bPin - aPin;
      return b.score - a.score;
    });
    return [...favorites.filter((f) =>
      f.title.toLowerCase().includes(trimmed.toLowerCase())
    ), ...boosted];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, open, recentsVersion]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setActiveIndex(0);
    setScrollTop(0);
  }, []);

  const pinEntry = useCallback((entry: PaletteEntry) => {
    const kind = entry.favoriteKind ?? favoriteKindFor(entry);
    const item: FavoriteItem = {
      id: entry.id,
      kind,
      label: entry.title,
      href: entry.href,
    };
    toggleFavorite(item);
    setRecentsVersion((v) => v + 1);
  }, []);

  const execute = useCallback(
    (entry: PaletteEntry) => {
      const trimmed = query.trim();
      if (trimmed) {
        recordRecent({
          id: trimmed.toLowerCase(),
          kind: "search",
          label: trimmed,
        });
      }

      const kind = entry.favoriteKind ?? favoriteKindFor(entry);
      if (entry.category === "company" && entry.href) {
        recordRecent({
          id: entry.id,
          kind: "company",
          label: `${entry.title}${entry.subtitle ? ` (${entry.subtitle})` : ""}`,
          href: entry.href,
        });
      } else if (kind === "page" && entry.href) {
        recordRecent({
          id: entry.id,
          kind: "page",
          label: entry.title,
          href: entry.href,
        });
      } else if (kind === "research" && entry.href) {
        recordRecent({
          id: entry.id,
          kind: "research",
          label: entry.title,
          href: entry.href,
        });
      } else if (entry.category === "action" || entry.actionId) {
        recordRecent({
          id: entry.id,
          kind: "command",
          label: entry.title,
          href: entry.href,
        });
      }
      setRecentsVersion((version) => version + 1);

      if (entry.actionId === "open-company") {
        setQuery("");
        setDebouncedQuery("");
        inputRef.current?.focus();
        return;
      }
      if (entry.actionId === "change-theme") {
        toggleTheme();
        close();
        return;
      }
      if (entry.actionId === "refresh-dashboard") {
        router.refresh();
        close();
        return;
      }
      if (entry.actionId === "refresh-market-data") {
        router.refresh();
        emitUiEvent("refresh-market-data");
        close();
        return;
      }
      if (entry.actionId === "create-research-note") {
        router.push("/research");
        emitUiEvent("create-research-note");
        close();
        return;
      }
      if (entry.actionId) {
        emitUiEvent(entry.actionId as UiEventName);
        close();
        return;
      }
      if (entry.href) {
        router.push(entry.href);
        close();
      }
    },
    [query, router, close]
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || (event.key === "Tab" && !event.shiftKey)) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, entries.length - 1)));
    } else if (event.key === "ArrowUp" || (event.key === "Tab" && event.shiftKey)) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = entries[activeIndex];
      if (entry) execute(entry);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "p") {
      event.preventDefault();
      const entry = entries[activeIndex];
      if (entry) pinEntry(entry);
    }
  };

  // Keep active row visible.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const useVirtual = entries.length > VIRTUAL_THRESHOLD;
  const itemHeight = 44;
  const virtualStart = useVirtual
    ? Math.max(0, Math.floor(scrollTop / itemHeight) - 2)
    : 0;
  const virtualEnd = useVirtual
    ? Math.min(entries.length, virtualStart + VIRTUAL_WINDOW)
    : entries.length;
  const visibleEntries = entries.slice(virtualStart, virtualEnd);

  if (!open) return null;

  let lastSection = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-surface/70 p-3 pt-[8vh] backdrop-blur-md animate-fade-in sm:p-4 sm:pt-[12vh]"
      onClick={close}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-surface-border bg-card shadow-overlay animate-scale-in max-h-[min(80vh,640px)]"
      >
        <div className="flex items-center gap-2 border-b border-surface-border-subtle px-3 sm:px-4">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-activedescendant={
              entries[activeIndex]
                ? `palette-option-${activeIndex}`
                : undefined
            }
            aria-label="Search stocks, pages, sectors and commands"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search stocks, sectors, pages, commands…"
            className="w-full bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden rounded border border-surface-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted sm:block">
            Esc
          </kbd>
        </div>

        <ul
          id={listboxId}
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          className="min-h-0 flex-1 overflow-y-auto p-2"
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        >
          {entries.length === 0 ? (
            <li className="px-4 py-10 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl border border-surface-border bg-surface-raised">
                <Search className="h-5 w-5 text-text-faint" />
              </div>
              <p className="text-sm font-medium text-text-primary">
                No results for “{debouncedQuery}”
              </p>
              <p className="mt-1 text-xs text-text-muted">
                Try a ticker, sector, page name, or command keyword.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {SEARCH_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      setDebouncedQuery(example);
                    }}
                    className="rounded-full border border-surface-border px-2.5 py-1 text-[11px] text-text-secondary hover:border-accent/40 hover:bg-accent/10 hover:text-accent"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </li>
          ) : (
            <>
              {useVirtual && virtualStart > 0 ? (
                <li
                  aria-hidden
                  style={{ height: virtualStart * itemHeight }}
                />
              ) : null}
              {visibleEntries.map((entry, offset) => {
                const index = virtualStart + offset;
                const Icon = CATEGORY_ICONS[entry.category] ?? ArrowRight;
                const showHeader = entry.section !== lastSection;
                lastSection = entry.section;
                const kind = entry.favoriteKind ?? favoriteKindFor(entry);
                const pinned = isFavorite(entry.id, kind);
                return (
                  <li key={`${entry.id}-${index}`}>
                    {showHeader && (
                      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        {entry.section}
                      </p>
                    )}
                    <div
                      data-palette-index={index}
                      className={cn(
                        "flex w-full items-center gap-1 rounded-lg transition-colors",
                        index === activeIndex
                          ? "bg-accent/10 text-text-primary"
                          : "text-text-secondary hover:bg-surface-hover"
                      )}
                    >
                      <button
                        type="button"
                        id={`palette-option-${index}`}
                        role="option"
                        aria-selected={index === activeIndex}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => execute(entry)}
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">
                            {highlightSearchText(entry.title, debouncedQuery)}
                          </span>
                          <span className="block truncate text-[11px] text-text-muted">
                            {entry.subtitle
                              ? highlightSearchText(
                                  entry.subtitle,
                                  debouncedQuery
                                )
                              : COMMAND_CATEGORY_LABELS[entry.category]}
                          </span>
                        </span>
                        {entry.shortcut && (
                          <kbd className="hidden rounded border border-surface-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted sm:inline">
                            {entry.shortcut}
                          </kbd>
                        )}
                        {index === activeIndex && (
                          <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label={pinned ? "Unpin" : "Pin favorite"}
                        title="Pin (Ctrl+P)"
                        onClick={(event) => {
                          event.stopPropagation();
                          pinEntry(entry);
                        }}
                        className={cn(
                          "mr-2 rounded p-1.5 transition-colors",
                          pinned
                            ? "text-accent"
                            : "text-text-faint opacity-0 hover:text-text-primary group-hover:opacity-100",
                          index === activeIndex && "opacity-100"
                        )}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
              {useVirtual && virtualEnd < entries.length ? (
                <li
                  aria-hidden
                  style={{
                    height: (entries.length - virtualEnd) * itemHeight,
                  }}
                />
              ) : null}
            </>
          )}
        </ul>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-surface-border-subtle px-3 py-2 text-[10px] text-text-muted sm:px-4">
          <span>↑↓ / Tab</span>
          <span>↵ Open</span>
          <span>Ctrl+P Pin</span>
          <span>Esc</span>
          <span className="ml-auto hidden sm:inline">
            EquityOS Command Palette
          </span>
        </div>
      </div>
    </div>
  );
}
