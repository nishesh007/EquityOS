import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  formatPercentValue,
  formatRatioValue,
  roundResearch,
} from "@/lib/format/research-numbers";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True when value is a positive finite market price. */
export function isValidMarketPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** Resolve live price — never returns 0 or NaN. */
export function resolveMarketPrice(
  ...candidates: (number | null | undefined)[]
): number {
  for (const candidate of candidates) {
    if (isValidMarketPrice(candidate)) return candidate;
  }
  return 0;
}

export function formatCurrency(value: number, compact = false): string {
  if (!Number.isFinite(value)) return "N/A";
  if (compact) {
    if (value >= 1e7) return `₹${roundResearch(value / 1e7, 1)}Cr`;
    if (value >= 1e5) return `₹${roundResearch(value / 1e5, 1)}L`;
    if (value >= 1e3) return `₹${roundResearch(value / 1e3, 1)}K`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(roundResearch(value, decimals));
}

/** Percentages — max 1 decimal (institutional research standard). */
export function formatPercent(value: number, showSign = true): string {
  return formatPercentValue(value, { signed: showSign });
}

export function formatPrice(value: number, decimals = 2): string {
  if (!isValidMarketPrice(value)) return "N/A";
  const rounded = roundResearch(value, decimals);
  return `₹${rounded.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Ratio/multiple — max 2 decimals; N/A for invalid values. */
export function formatRatio(value: number, suffix = "x"): string {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  return formatRatioValue(value, suffix);
}

export function formatVolume(shares: number): string {
  if (!Number.isFinite(shares) || shares < 0) return "N/A";
  if (shares >= 1e7) return `${roundResearch(shares / 1e7, 2)} Cr`;
  if (shares >= 1e5) return `${roundResearch(shares / 1e5, 2)} L`;
  if (shares >= 1e3) return `${roundResearch(shares / 1e3, 2)} K`;
  return `${Math.round(shares)}`;
}

export {
  formatScore,
  formatPercentValue,
  formatRatioValue,
  formatPriceValue,
  formatCompactInr,
  formatByUnit,
  formatResearchMetric,
  formatScoreLabel,
  roundResearch,
  toFixedTrimmed,
} from "@/lib/format/research-numbers";
