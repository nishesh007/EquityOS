"use client";

import { useEffect, useState } from "react";

const DEFAULT_DEBOUNCE_MS = 150;

/**
 * Debounced search query for Event Intelligence toolbar / filters.
 */
export function useEventSearch(
  initialQuery = "",
  debounceMs = DEFAULT_DEBOUNCE_MS
) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [query, debounceMs]);

  function clear() {
    setQuery("");
    setDebouncedQuery("");
  }

  return {
    query,
    debouncedQuery,
    setQuery,
    clear,
  };
}
