"use client";

import { useCallback, useState } from "react";
import type { WatchlistItem } from "@/types";

export interface UseWatchlistOptions {
  initialItems: WatchlistItem[];
}

export interface UseWatchlistResult {
  items: WatchlistItem[];
  removeItem: (id: string) => void;
}

/**
 * Client-side watchlist state seeded from server-fetched items.
 * Data must be supplied via `initialItems` from fetchWatchlist() — never imported statically.
 */
export function useWatchlist({
  initialItems,
}: UseWatchlistOptions): UseWatchlistResult {
  const [items, setItems] = useState<WatchlistItem[]>(initialItems);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { items, removeItem };
}
