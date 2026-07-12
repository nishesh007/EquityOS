/**
 * Sprint 9D — AI Screener metric indexer for fast range-based filtering.
 */

import type { ScreenerRow } from "@/lib/screener/types";

type IndexBucket = Map<number, Set<number>>;

export interface MetricIndex {
  /** Sorted unique numeric values → row indices */
  buckets: IndexBucket;
  /** Row index → metric value */
  values: (number | null)[];
  sortedValues: number[];
}

export class ScreenerIndexer {
  private indices = new Map<string, MetricIndex>();
  private textIndices = new Map<string, Map<string, Set<number>>>();
  private rowCount = 0;

  build(rows: ScreenerRow[], metricKeys: string[]): void {
    this.rowCount = rows.length;
    this.indices.clear();
    this.textIndices.clear();

    for (const key of metricKeys) {
      const values: (number | null)[] = [];
      const buckets: IndexBucket = new Map();
      const textBucket = new Map<string, Set<number>>();

      for (let i = 0; i < rows.length; i += 1) {
        const raw = rows[i].metrics[key];
        if (typeof raw === "string") {
          const normalized = raw.toLowerCase();
          if (!textBucket.has(normalized)) textBucket.set(normalized, new Set());
          textBucket.get(normalized)!.add(i);
          values.push(null);
        } else if (typeof raw === "number" && Number.isFinite(raw)) {
          values.push(raw);
          const rounded = Math.round(raw * 10000) / 10000;
          if (!buckets.has(rounded)) buckets.set(rounded, new Set());
          buckets.get(rounded)!.add(i);
        } else {
          values.push(null);
        }
      }

      this.indices.set(key, {
        buckets,
        values,
        sortedValues: Array.from(buckets.keys()).sort((a, b) => a - b),
      });
      if (textBucket.size > 0) {
        this.textIndices.set(key, textBucket);
      }
    }
  }

  /** Fast range query: return row indices where value >= min and <= max */
  queryRange(key: string, min: number, max: number): Set<number> {
    const index = this.indices.get(key);
    if (!index) return new Set();

    const result = new Set<number>();
    for (const value of index.sortedValues) {
      if (value < min) continue;
      if (value > max) break;
      const bucket = index.buckets.get(value);
      if (bucket) {
        for (const idx of bucket) result.add(idx);
      }
    }
    return result;
  }

  queryGreaterThan(key: string, threshold: number): Set<number> {
    const index = this.indices.get(key);
    if (!index) return new Set();

    const result = new Set<number>();
    for (const value of index.sortedValues) {
      if (value <= threshold) continue;
      const bucket = index.buckets.get(value);
      if (bucket) {
        for (const idx of bucket) result.add(idx);
      }
    }
    return result;
  }

  queryLessThan(key: string, threshold: number): Set<number> {
    const index = this.indices.get(key);
    if (!index) return new Set();

    const result = new Set<number>();
    for (const value of index.sortedValues) {
      if (value >= threshold) break;
      const bucket = index.buckets.get(value);
      if (bucket) {
        for (const idx of bucket) result.add(idx);
      }
    }
    return result;
  }

  queryTextContains(key: string, search: string): Set<number> {
    const textIndex = this.textIndices.get(key);
    if (!textIndex) return new Set();

    const normalized = search.toLowerCase();
    const result = new Set<number>();
    for (const [text, indices] of textIndex) {
      if (text.includes(normalized)) {
        for (const idx of indices) result.add(idx);
      }
    }
    return result;
  }

  getValue(key: string, rowIndex: number): number | null {
    return this.indices.get(key)?.values[rowIndex] ?? null;
  }

  getRowCount(): number {
    return this.rowCount;
  }
}

export function intersectSets(sets: Set<number>[]): Set<number> {
  if (sets.length === 0) return new Set();
  if (sets.length === 1) return new Set(sets[0]);

  let result = sets[0];
  for (let i = 1; i < sets.length; i += 1) {
    const next = new Set<number>();
    for (const idx of result) {
      if (sets[i].has(idx)) next.add(idx);
    }
    result = next;
    if (result.size === 0) break;
  }
  return result;
}

export function unionSets(sets: Set<number>[]): Set<number> {
  const result = new Set<number>();
  for (const set of sets) {
    for (const idx of set) result.add(idx);
  }
  return result;
}
