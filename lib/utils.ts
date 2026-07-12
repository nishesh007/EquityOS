import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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
    if (value >= 1e7) return `₹${(value / 1e7).toFixed(2)}Cr`;
    if (value >= 1e5) return `₹${(value / 1e5).toFixed(2)}L`;
    if (value >= 1e3) return `₹${(value / 1e3).toFixed(1)}K`;
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
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPercent(value: number, showSign = true): string {
  if (!Number.isFinite(value)) return "N/A";
  const sign = showSign && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatPrice(value: number, decimals = 2): string {
  if (!isValidMarketPrice(value)) return "N/A";
  return `₹${value.toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/** Format ratio/multiple — shows N/A for invalid values. */
export function formatRatio(value: number, suffix = "x"): string {
  if (!Number.isFinite(value) || value <= 0) return "N/A";
  return `${value.toFixed(1)}${suffix}`;
}

export function formatVolume(shares: number): string {
  if (!Number.isFinite(shares) || shares < 0) return "N/A";
  if (shares >= 1e7) return `${(shares / 1e7).toFixed(2)} Cr`;
  if (shares >= 1e5) return `${(shares / 1e5).toFixed(2)} L`;
  if (shares >= 1e3) return `${(shares / 1e3).toFixed(2)} K`;
  return `${Math.round(shares)}`;
}
