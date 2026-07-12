"use client";



import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { useRouter } from "next/navigation";

import { Search, Command } from "lucide-react";

import {

  preloadCompanySearch,

  resolveSearchQuery,

  searchCompanies,

  type SearchableCompany,

} from "@/lib/company-search";

import { getCompanyRoute } from "@/lib/routes";

import { cn } from "@/lib/utils";



const SEARCH_DEBOUNCE_MS = 200;



export function GlobalSearch() {

  const router = useRouter();

  const listboxId = useId();

  const inputRef = useRef<HTMLInputElement>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState("");

  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [isOpen, setIsOpen] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);

  const [isReady, setIsReady] = useState(false);



  useEffect(() => {

    preloadCompanySearch();

    setIsReady(true);

  }, []);



  useEffect(() => {

    const timer = window.setTimeout(() => {

      setDebouncedQuery(query);

    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);

  }, [query]);



  const results = useMemo(
    () => {
      if (!isReady) return [];
      const term = debouncedQuery.trim();
      if (!term) return [];
      return searchCompanies(term);
    },
    [debouncedQuery, isReady]
  );



  const navigateToCompany = useCallback(

    (company: SearchableCompany) => {

      setQuery("");

      setDebouncedQuery("");

      setIsOpen(false);

      setActiveIndex(0);

      router.push(getCompanyRoute(company.symbol));

    },

    [router]

  );



  const handleSubmit = useCallback(() => {

    const ranked = searchCompanies(debouncedQuery || query);

    const match = ranked[activeIndex] ?? ranked[0] ?? resolveSearchQuery(query);

    if (match) {

      navigateToCompany(match);

    }

  }, [activeIndex, debouncedQuery, navigateToCompany, query]);



  useEffect(() => {

    const onKeyDown = (event: KeyboardEvent) => {

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {

        event.preventDefault();

        inputRef.current?.focus();

        setIsOpen(true);

      }

    };



    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);

  }, []);



  useEffect(() => {

    const onPointerDown = (event: MouseEvent) => {

      if (!containerRef.current?.contains(event.target as Node)) {

        setIsOpen(false);

      }

    };



    document.addEventListener("mousedown", onPointerDown);

    return () => document.removeEventListener("mousedown", onPointerDown);

  }, []);



  useEffect(() => {

    setActiveIndex(0);

  }, [debouncedQuery]);



  return (

    <div ref={containerRef} className="relative flex-1">

      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />

      <input

        ref={inputRef}

        type="text"

        value={query}

        role="combobox"

        aria-expanded={isOpen && results.length > 0}

        aria-controls={listboxId}

        aria-autocomplete="list"

        placeholder="Search stocks, indices, news..."

        className={cn(

          "w-full rounded-lg border border-surface-border bg-surface-overlay py-2 pl-10 pr-20",

          "text-sm text-text-primary placeholder:text-text-faint",

          "outline-none transition-all focus:border-accent/50 focus:ring-1 focus:ring-accent/30"

        )}

        onChange={(event) => {

          setQuery(event.target.value);

          setIsOpen(true);

        }}

        onFocus={() => setIsOpen(true)}

        onKeyDown={(event) => {

          if (event.key === "ArrowDown") {

            event.preventDefault();

            if (results.length === 0) return;

            setActiveIndex((index) => (index + 1) % results.length);

            return;

          }

          if (event.key === "ArrowUp") {

            event.preventDefault();

            if (results.length === 0) return;

            setActiveIndex(

              (index) => (index - 1 + results.length) % results.length

            );

            return;

          }

          if (event.key === "Enter") {

            event.preventDefault();

            handleSubmit();

            return;

          }

          if (event.key === "Escape") {

            setIsOpen(false);

            inputRef.current?.blur();

          }

        }}

      />

      <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-surface-border bg-surface px-1.5 py-0.5">

        <Command className="h-3 w-3 text-text-faint" />

        <span className="text-[10px] text-text-faint">K</span>

      </div>



      {isOpen && debouncedQuery.trim() && (

        <div

          id={listboxId}

          role="listbox"

          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-surface-border-subtle bg-surface-raised/95 shadow-card backdrop-blur-xl"

        >

          {results.length > 0 ? (

            <ul className="max-h-72 overflow-y-auto py-1">

              {results.map((company, index) => (

                <li key={company.symbol} role="option" aria-selected={index === activeIndex}>

                  <button

                    type="button"

                    className={cn(

                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",

                      index === activeIndex

                        ? "bg-accent/10 text-text-primary"

                        : "text-text-secondary hover:bg-surface-hover/60"

                    )}

                    onMouseEnter={() => setActiveIndex(index)}

                    onClick={() => navigateToCompany(company)}

                  >

                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-surface-overlay text-[10px] font-bold text-text-secondary">

                      {company.displaySymbol.slice(0, 2)}

                    </div>

                    <div className="min-w-0 flex-1">

                      <p className="text-sm font-medium text-text-primary">

                        {company.displaySymbol}

                      </p>

                      <p className="truncate text-xs text-text-muted">

                        {company.name}

                      </p>

                    </div>

                    <span className="text-[10px] text-text-faint">

                      {company.sector}

                    </span>

                  </button>

                </li>

              ))}

            </ul>

          ) : (

            <p className="px-4 py-3 text-sm text-text-muted">

              No companies found for &ldquo;{debouncedQuery.trim()}&rdquo;

            </p>

          )}

        </div>

      )}

    </div>

  );

}


