/**
 * QuoteResult — shared shape for live quote fetches.
 * Kept separate from service.ts so client-safe modules (enriched-quote)
 * can type against it without importing server-only code.
 */

import type { LiveQuote } from "@/lib/providers/types";

export interface QuoteResult {
  data: LiveQuote;
  provider: string;
  source: "live" | "cached" | "mock" | "unavailable";
  attempted: string[];
  stale?: boolean;
  quoteAge?: number;
}
