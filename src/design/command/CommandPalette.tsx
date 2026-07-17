"use client";

/**
 * Sprint 10C.R7 — global command palette (Ctrl+K).
 *
 * Instant fuzzy search across pages, quick actions, settings, help and
 * companies (via the existing company-search engine — no duplication).
 * Full keyboard navigation, recents and quick actions.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Briefcase,
  Building2,
  Clock,
  CornerDownLeft,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Search,
  Settings,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { preloadCompanySearch, searchCompanies } from "@/lib/company-search";
import { getCompanyRoute } from "@/lib/routes";
import { toggleTheme } from "../theme/ThemeEngine";
import { getRecents, recordRecent } from "../productivity/recentItems";
import {
  COMMAND_CATEGORY_LABELS,
  registerSearchProvider,
  searchEverything,
  type CommandCategory,
  type SearchResult,
} from "./commandRegistry";
import { emitUiEvent, onUiEvent, type UiEventName } from "./uiBus";

const CATEGORY_ICONS: Partial<Record<CommandCategory, typeof Search>> = {
  page: LayoutDashboard,
  action: Zap,
  company: Building2,
  setting: Settings,
  help: HelpCircle,
  research: FileText,
  portfolio: Briefcase,
  recent: Clock,
};

interface PaletteEntry extends SearchResult {
  /** Section header the entry renders under. */
  section: string;
}

export function CommandPalette() {
  const router = useRouter();
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentsVersion, setRecentsVersion] = useState(0);

  // Register the company search provider once (reuses lib/company-search).
  useEffect(() => {
    registerSearchProvider("companies", (q) =>
      searchCompanies(q, 5).map((company) => ({
        id: `company-${company.symbol}`,
        title: company.name,
        subtitle: company.displaySymbol,
        category: "company" as const,
        href: getCompanyRoute(company.displaySymbol),
      }))
    );
  }, []);

  // Open via public API / Ctrl+K (TerminalExperience emits the event).
  useEffect(() => {
    return onUiEvent("open-command-palette", (detail) => {
      setQuery(typeof detail === "string" ? detail : "");
      setActiveIndex(0);
      setOpen(true);
      preloadCompanySearch();
    });
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const entries: PaletteEntry[] = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      const recents: PaletteEntry[] = getRecents(undefined, 5).map((item) => ({
        id: `recent-${item.kind}-${item.id}`,
        title: item.label,
        subtitle: item.kind === "search" ? "Recent search" : undefined,
        category: "recent" as const,
        href: item.href,
        score: 100,
        section: "Recent",
      }));
      const catalog = searchEverything("", 30).map((result) => ({
        ...result,
        section: COMMAND_CATEGORY_LABELS[result.category],
      }));
      return [...recents, ...catalog];
    }
    return searchEverything(trimmed, 20).map((result) => ({
      ...result,
      section: COMMAND_CATEGORY_LABELS[result.category],
    }));
    // recentsVersion invalidates the memo after an execution records a recent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, recentsVersion]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  const execute = useCallback(
    (entry: PaletteEntry) => {
      const trimmed = query.trim();
      if (trimmed) {
        recordRecent({ id: trimmed.toLowerCase(), kind: "search", label: trimmed });
      }
      if (entry.category === "company" && entry.href) {
        recordRecent({
          id: entry.id,
          kind: "company",
          label: `${entry.title} (${entry.subtitle ?? ""})`.trim(),
          href: entry.href,
        });
      }
      setRecentsVersion((version) => version + 1);

      if (entry.actionId === "open-company") {
        setQuery("");
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
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, entries.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = entries[activeIndex];
      if (entry) execute(entry);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  };

  if (!open) return null;

  let lastSection = "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-surface/70 p-4 pt-[12vh] backdrop-blur-sm animate-fade-in"
      onClick={close}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-surface-border bg-card shadow-overlay animate-scale-in"
      >
        <div className="flex items-center gap-2 border-b border-surface-border-subtle px-4">
          <Search className="h-4 w-4 shrink-0 text-text-muted" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded="true"
            aria-controls={listboxId}
            aria-label="Search pages, companies and actions"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search pages, companies, actions…"
            className="w-full bg-transparent py-3.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="hidden rounded border border-surface-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted sm:block">
            Esc
          </kbd>
        </div>

        <ul
          id={listboxId}
          role="listbox"
          aria-label="Search results"
          className="max-h-[50vh] overflow-y-auto p-2"
        >
          {entries.length === 0 && (
            <li className="px-3 py-8 text-center text-xs text-text-muted">
              No results for “{query}”. Try a ticker, page or action name.
            </li>
          )}
          {entries.map((entry, index) => {
            const Icon = CATEGORY_ICONS[entry.category] ?? ArrowRight;
            const showHeader = entry.section !== lastSection;
            lastSection = entry.section;
            return (
              <li key={`${entry.id}-${index}`}>
                {showHeader && (
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    {entry.section}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => execute(entry)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors",
                    index === activeIndex
                      ? "bg-accent/10 text-text-primary"
                      : "text-text-secondary hover:bg-surface-hover"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{entry.title}</span>
                    {entry.subtitle && (
                      <span className="block truncate text-[11px] text-text-muted">
                        {entry.subtitle}
                      </span>
                    )}
                  </span>
                  {entry.shortcut && (
                    <kbd className="rounded border border-surface-border bg-surface px-1.5 py-0.5 text-[10px] text-text-muted">
                      {entry.shortcut}
                    </kbd>
                  )}
                  {index === activeIndex && (
                    <CornerDownLeft className="h-3.5 w-3.5 text-text-muted" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-4 border-t border-surface-border-subtle px-4 py-2 text-[10px] text-text-muted">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
          <span className="ml-auto">EquityOS Command Palette</span>
        </div>
      </div>
    </div>
  );
}
