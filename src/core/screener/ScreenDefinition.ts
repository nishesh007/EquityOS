/**
 * Institutional AI Screener — screen definitions (Sprint 9D.R1).
 * Composition layer only — no duplicated engine calculations.
 */

export const SCREEN_TYPES = [
  "Technical",
  "Fundamental",
  "Momentum",
  "Breakout",
  "Swing",
  "Growth",
  "Value",
  "Quality",
  "Income",
  "Turnaround",
  "Sector",
  "Theme",
  "Portfolio",
  "Watchlist",
  "Custom",
] as const;

export type ScreenType = (typeof SCREEN_TYPES)[number];

export const SCREEN_ORIGINS = ["built-in", "custom", "marketplace"] as const;
export type ScreenOrigin = (typeof SCREEN_ORIGINS)[number];

export type ScreenUniverseKind =
  | "nse-bse"
  | "nse"
  | "bse"
  | "portfolio"
  | "watchlist"
  | "sector"
  | "theme"
  | "custom"
  | "none";

export type ScreenSortOrder = "aiScore" | "trustScore" | "validationScore" | "confidence" | "marketCap" | "price";

export interface ScreenRule {
  id: string;
  field: string;
  operator: "gt" | "gte" | "lt" | "lte" | "eq" | "between" | "in" | "contains";
  value: number | string | Array<number | string>;
  valueTo?: number;
  weight?: number;
  description?: string;
}

export interface ScreenWeights {
  aiScore: number;
  trustScore: number;
  validationScore: number;
  confidence: number;
  opportunity: number;
}

export const DEFAULT_SCREEN_WEIGHTS: ScreenWeights = {
  aiScore: 0.3,
  trustScore: 0.2,
  validationScore: 0.2,
  confidence: 0.15,
  opportunity: 0.15,
};

export interface ScreenDefinition {
  id: string;
  name: string;
  description: string;
  category: ScreenType;
  universe: ScreenUniverseKind;
  universeSymbols?: string[];
  sector?: string;
  theme?: string;
  rules: ScreenRule[];
  weights: ScreenWeights;
  sortOrder: ScreenSortOrder;
  resultLimit: number;
  cacheTtlMs: number;
  version: string;
  origin: ScreenOrigin;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScreenDefinitionInput = Omit<
  ScreenDefinition,
  "createdAt" | "updatedAt" | "enabled" | "origin" | "weights" | "version"
> & {
  enabled?: boolean;
  origin?: ScreenOrigin;
  weights?: Partial<ScreenWeights>;
  version?: string;
  createdAt?: string;
  updatedAt?: string;
};

export function isScreenType(value: string): value is ScreenType {
  return (SCREEN_TYPES as readonly string[]).includes(value);
}

export function resolveScreenType(
  value: string | null | undefined,
  fallback: ScreenType = "Custom"
): ScreenType {
  if (value && isScreenType(value)) return value;
  return fallback;
}

export function resolveScreenWeights(
  partial?: Partial<ScreenWeights> | null
): ScreenWeights {
  return {
    aiScore: finiteOr(partial?.aiScore, DEFAULT_SCREEN_WEIGHTS.aiScore),
    trustScore: finiteOr(partial?.trustScore, DEFAULT_SCREEN_WEIGHTS.trustScore),
    validationScore: finiteOr(
      partial?.validationScore,
      DEFAULT_SCREEN_WEIGHTS.validationScore
    ),
    confidence: finiteOr(partial?.confidence, DEFAULT_SCREEN_WEIGHTS.confidence),
    opportunity: finiteOr(
      partial?.opportunity,
      DEFAULT_SCREEN_WEIGHTS.opportunity
    ),
  };
}

function finiteOr(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
