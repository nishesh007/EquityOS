/**
 * Institutional Watchlist Platform — built-in definitions (Sprint 10B.R1).
 * Default, portfolio, sector, and theme watchlist seeds.
 */

import type { WatchlistKind } from "./WatchlistModels";
import { normalizeSymbols, safeWatchlistText } from "./WatchlistModels";

export interface WatchlistDefinition {
  definitionId: string;
  kind: WatchlistKind;
  label: string;
  description: string;
  color: string;
  icon: string;
  tags: string[];
  priority: number;
  symbols: string[];
  pinned: boolean;
  favorite: boolean;
  builtin: boolean;
  registeredAt: string;
}

/** Platform default symbols — aligned with services/marketData WATCHLIST_SEED. */
export const DEFAULT_WATCHLIST_SYMBOLS = normalizeSymbols([
  "BHARTIARTL",
  "SBIN",
  "LT",
  "WIPRO",
  "ADANIENT",
  "MARUTI",
]);

export const PORTFOLIO_WATCHLIST_SYMBOLS = normalizeSymbols([
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "ICICIBANK",
]);

export const SECTOR_WATCHLIST_DEFINITIONS: Array<
  Omit<WatchlistDefinition, "registeredAt">
> = [
  {
    definitionId: "sector-banking",
    kind: "sector",
    label: "Banking Sector",
    description: "Large-cap banking leaders for sector monitoring",
    color: "#0ea5e9",
    icon: "building",
    tags: ["sector", "banking"],
    priority: 80,
    symbols: normalizeSymbols(["HDFCBANK", "ICICIBANK", "SBIN", "KOTAKBANK"]),
    pinned: false,
    favorite: false,
    builtin: true,
  },
  {
    definitionId: "sector-it",
    kind: "sector",
    label: "IT Sector",
    description: "Indian IT services and software leaders",
    color: "#8b5cf6",
    icon: "cpu",
    tags: ["sector", "it"],
    priority: 75,
    symbols: normalizeSymbols(["TCS", "INFY", "WIPRO", "HCLTECH"]),
    pinned: false,
    favorite: false,
    builtin: true,
  },
];

export const THEME_WATCHLIST_DEFINITIONS: Array<
  Omit<WatchlistDefinition, "registeredAt">
> = [
  {
    definitionId: "theme-infrastructure",
    kind: "theme",
    label: "Infrastructure Theme",
    description: "Capital goods and infrastructure beneficiaries",
    color: "#f59e0b",
    icon: "hard-hat",
    tags: ["theme", "infrastructure"],
    priority: 70,
    symbols: normalizeSymbols(["LT", "ADANIPORTS", "ULTRACEMCO"]),
    pinned: false,
    favorite: true,
    builtin: true,
  },
  {
    definitionId: "theme-digital",
    kind: "theme",
    label: "Digital India Theme",
    description: "Telecom, fintech, and digital consumption plays",
    color: "#10b981",
    icon: "signal",
    tags: ["theme", "digital"],
    priority: 65,
    symbols: normalizeSymbols(["BHARTIARTL", "PAYTM", "ZOMATO"]),
    pinned: false,
    favorite: false,
    builtin: true,
  },
];

export const BUILTIN_WATCHLIST_DEFINITIONS: Array<
  Omit<WatchlistDefinition, "registeredAt">
> = [
  {
    definitionId: "default-primary",
    kind: "default",
    label: "Primary Watchlist",
    description: "Platform default institutional watchlist",
    color: "#2563eb",
    icon: "star",
    tags: ["default", "primary"],
    priority: 100,
    symbols: DEFAULT_WATCHLIST_SYMBOLS,
    pinned: true,
    favorite: true,
    builtin: true,
  },
  {
    definitionId: "portfolio-mirror",
    kind: "portfolio",
    label: "Portfolio Mirror",
    description: "Symbols mirrored from portfolio holdings",
    color: "#dc2626",
    icon: "briefcase",
    tags: ["portfolio", "holdings"],
    priority: 90,
    symbols: PORTFOLIO_WATCHLIST_SYMBOLS,
    pinned: true,
    favorite: false,
    builtin: true,
  },
  ...SECTOR_WATCHLIST_DEFINITIONS,
  ...THEME_WATCHLIST_DEFINITIONS,
];

export function definitionToRecordId(definitionId: string): string {
  return safeWatchlistText(definitionId, "").toLowerCase();
}

export function isBuiltinDefinitionId(id: string): boolean {
  const key = definitionToRecordId(id);
  return BUILTIN_WATCHLIST_DEFINITIONS.some(
    (d) => definitionToRecordId(d.definitionId) === key
  );
}
