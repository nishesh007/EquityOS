/**
 * Sprint 9F.3 — Institutional horizon definitions.
 *
 * These envelopes validate that a constructed trade belongs to its horizon.
 * They are NOT trade-construction templates (targets are still ATR/structure).
 */

import type { HorizonId } from "@/lib/recommendations/horizons/types";

/** Holding envelope in trading days (fractional for session horizons). */
export interface HorizonHoldingEnvelope {
  /** Inclusive minimum mid holding (trading days). */
  daysMin: number;
  /** Inclusive maximum mid holding (trading days). */
  daysMax: number;
  /** Human description. */
  label: string;
}

/**
 * Institutional holding definitions (Part 2).
 * 1 trading month ≈ 21 sessions.
 */
export const HORIZON_HOLDING_ENVELOPES: Record<HorizonId, HorizonHoldingEnvelope> = {
  scalping: {
    daysMin: 5 / 375, // ~5 minutes
    daysMax: 30 / 375, // ~30 minutes
    label: "5–30 Minutes",
  },
  intraday: {
    daysMin: 30 / 375,
    daysMax: 1, // up to market close (~1 session)
    label: "30 Minutes – market close",
  },
  btst: {
    daysMin: 1,
    daysMax: 3,
    label: "1–3 Trading Days",
  },
  swing: {
    daysMin: 5,
    daysMax: 20,
    label: "5–20 Trading Days",
  },
  short_term: {
    daysMin: 21, // ~1 month
    daysMax: 63, // ~3 months
    label: "1–3 Months",
  },
  medium_term: {
    daysMin: 63, // ~3 months
    daysMax: 252, // ~12 months
    label: "3–12 Months",
  },
  long_term: {
    daysMin: 252, // 12 months
    daysMax: 756, // 36 months
    label: "12–36 Months",
  },
};

/**
 * Primary-target move envelopes (% of entry) consistent with horizon.
 * Used to reject horizon leakage (e.g. Long Term +5% chart scalp).
 * Valuation-tagged long-term may use the soft floor.
 */
export interface HorizonReturnEnvelope {
  /** Minimum acceptable primary target % (T1 distance). */
  primaryTargetMinPct: number;
  /** Maximum acceptable primary target % before extraordinary-event review. */
  primaryTargetMaxPct: number;
  /** Minimum probability-weighted expectancy %. */
  expectedReturnMinPct: number;
  /** Maximum probability-weighted expectancy %. */
  expectedReturnMaxPct: number;
}

export const HORIZON_RETURN_ENVELOPES: Record<HorizonId, HorizonReturnEnvelope> = {
  scalping: {
    primaryTargetMinPct: 0.2,
    primaryTargetMaxPct: 2.5,
    expectedReturnMinPct: 0.2,
    expectedReturnMaxPct: 2.5,
  },
  intraday: {
    primaryTargetMinPct: 0.4,
    primaryTargetMaxPct: 5,
    expectedReturnMinPct: 0.4,
    expectedReturnMaxPct: 5,
  },
  btst: {
    primaryTargetMinPct: 0.6,
    primaryTargetMaxPct: 8,
    expectedReturnMinPct: 0.6,
    expectedReturnMaxPct: 8,
  },
  swing: {
    primaryTargetMinPct: 2.5,
    primaryTargetMaxPct: 18,
    expectedReturnMinPct: 2.5,
    expectedReturnMaxPct: 18,
  },
  short_term: {
    primaryTargetMinPct: 6,
    primaryTargetMaxPct: 40,
    expectedReturnMinPct: 6,
    expectedReturnMaxPct: 40,
  },
  medium_term: {
    primaryTargetMinPct: 10,
    primaryTargetMaxPct: 55,
    expectedReturnMinPct: 10,
    expectedReturnMaxPct: 55,
  },
  long_term: {
    primaryTargetMinPct: 15,
    primaryTargetMaxPct: 120,
    expectedReturnMinPct: 15,
    expectedReturnMaxPct: 120,
  },
};

/** Minimum Recommendation Quality Score to publish. */
export const MIN_RECOMMENDATION_QUALITY = 55;
