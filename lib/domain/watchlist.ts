/**
 * Domain contracts for watchlist data.
 */

import type { WatchlistItem } from "@/types";

export interface WatchlistDataService {
  fetchItems(): Promise<WatchlistItem[]>;
}

export type { WatchlistItem };
