/**
 * Data transparency utilities — surfaces provider, freshness and cache age.
 */

import { CACHE_TTL } from "@/lib/cache";
import type { DataSource } from "@/lib/providers/types";
import type { DataFreshness, DataTransparency } from "@/types";

export function mapSourceToFreshness(source: DataSource): DataFreshness {
  switch (source) {
    case "live":
      return "live";
    case "cached":
      return "delayed";
    case "mock":
      return "mock";
    default:
      return "mock";
  }
}

export function formatCacheAge(fetchedAt: string, ttlMs: number = CACHE_TTL.FUNDAMENTALS): string {
  const fetched = new Date(fetchedAt).getTime();
  if (!Number.isFinite(fetched)) return "Unknown";
  const ageMs = Date.now() - fetched;
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function buildDataTransparency(options: {
  provider: string;
  source: DataSource;
  fetchedAt: string;
  dataSource?: string;
  ttlMs?: number;
}): DataTransparency {
  const freshness = mapSourceToFreshness(options.source);
  const freshnessLabel =
    freshness === "live" ? "Live" : freshness === "delayed" ? "Delayed" : "Mock";

  return {
    dataSource: options.dataSource ?? "Financial Fundamentals",
    freshness: freshness,
    provider: options.provider,
    lastUpdated: new Date(options.fetchedAt).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    cacheAge: formatCacheAge(options.fetchedAt, options.ttlMs),
  };
}

export function freshnessLabel(freshness: DataFreshness): string {
  return freshness === "live" ? "Live" : freshness === "delayed" ? "Delayed" : "Mock";
}
