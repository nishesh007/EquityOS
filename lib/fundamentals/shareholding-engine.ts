/**
 * Shareholding engine — promoter/FII/DII/public with QoQ changes.
 */

import { round } from "@/lib/engine/utils";
import type {
  EnrichedShareholding,
  ShareholdingChange,
  ShareholdingSnapshot,
} from "@/lib/fundamentals/types";
import type { ShareholdingPattern } from "@/types";

function computeChanges(
  current: ShareholdingSnapshot,
  previous: ShareholdingSnapshot
): ShareholdingChange {
  return {
    promoter: round(current.promoter - previous.promoter, 2),
    fii: round(current.fii - previous.fii, 2),
    dii: round(current.dii - previous.dii, 2),
    public: round(current.public - previous.public, 2),
  };
}

export function enrichShareholding(
  current: ShareholdingPattern,
  previous?: ShareholdingPattern
): EnrichedShareholding {
  if (!previous) {
    return { ...current };
  }

  const prevSnapshot: ShareholdingSnapshot = {
    promoter: previous.promoter,
    fii: previous.fii,
    dii: previous.dii,
    public: previous.public,
    lastUpdated: previous.lastUpdated,
  };

  const currSnapshot: ShareholdingSnapshot = {
    promoter: current.promoter,
    fii: current.fii,
    dii: current.dii,
    public: current.public,
    lastUpdated: current.lastUpdated,
  };

  return {
    ...current,
    previous: prevSnapshot,
    changes: computeChanges(currSnapshot, prevSnapshot),
  };
}

export function normalizeShareholdingPercentages(values: {
  promoter?: number;
  fii?: number;
  dii?: number;
  public?: number;
  lastUpdated?: string;
}): ShareholdingPattern {
  const promoter = round(values.promoter ?? 0, 2);
  const fii = round(values.fii ?? 0, 2);
  const dii = round(values.dii ?? 0, 2);
  const publicPct = round(values.public ?? Math.max(0, 100 - promoter - fii - dii), 2);

  return {
    promoter,
    fii,
    dii,
    public: publicPct,
    lastUpdated: values.lastUpdated ?? "Latest",
  };
}

/** Derive previous quarter shareholding from current with typical drift. */
export function derivePreviousShareholding(
  current: ShareholdingPattern
): ShareholdingPattern {
  const drift = (value: number, delta: number) =>
    round(Math.max(0, Math.min(100, value + delta)), 2);

  return {
    promoter: drift(current.promoter, 0.15),
    fii: drift(current.fii, -0.25),
    dii: drift(current.dii, 0.08),
    public: drift(current.public, 0.02),
    lastUpdated: "Dec 2025",
  };
}
