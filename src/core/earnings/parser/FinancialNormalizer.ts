/**
 * Financial value normalizer — units, currency, precision, negatives, nulls.
 */

import {
  UNIT_TO_RAW,
  type FinancialConfiguration,
  type FinancialUnit,
  type ValueQualityFlag,
} from "./FinancialConfiguration";
import type { CanonicalLineKey } from "./FinancialLineMapper";

export type FinancialQuarter = "Q1" | "Q2" | "Q3" | "Q4";

export interface FinancialPeriodMeta {
  symbol: string;
  company?: string;
  exchange?: string;
  currency: string;
  financialYear: string;
  quarter?: FinancialQuarter;
  unit: FinancialUnit;
  source?: string;
  lastUpdated?: string;
  version?: string;
}

export interface NormalizedLineItem {
  key: CanonicalLineKey | string;
  value: number | null;
  rawValue: unknown;
  unit: FinancialUnit;
  currency: string;
  quality: ValueQualityFlag;
  flags: ValueQualityFlag[];
  isPercentage: boolean;
}

export interface NormalizedStatementValues {
  [key: string]: number | null | undefined;
}

const PERCENTAGE_KEYS = new Set([
  "ebitdaMargin",
  "operatingMargin",
  "netMargin",
  "cashConversion",
  "operatingCashConversion",
]);

export class FinancialNormalizer {
  constructor(private readonly config: FinancialConfiguration) {}

  normalizeValue(
    raw: unknown,
    options?: {
      unit?: FinancialUnit;
      isPercentage?: boolean;
      quality?: ValueQualityFlag;
    }
  ): { value: number | null; quality: ValueQualityFlag; flags: ValueQualityFlag[] } {
    const flags: ValueQualityFlag[] = [];
    if (raw === null || raw === undefined || raw === "") {
      flags.push("MissingData");
      return { value: null, quality: "MissingData", flags };
    }

    let quality = options?.quality ?? "ReportedValue";
    let text: string | null = null;
    let numeric: number | null = null;

    if (typeof raw === "number") {
      if (!Number.isFinite(raw)) {
        flags.push("MissingData");
        return { value: null, quality: "MissingData", flags };
      }
      numeric = raw;
    } else if (typeof raw === "string") {
      text = raw.trim();
      const lower = text.toLowerCase();
      if (/\brestated\b/.test(lower)) {
        quality = "RestatedValue";
        flags.push("RestatedValue");
      } else if (/\bestimated\b/.test(lower) || /\best\.?\b/.test(lower)) {
        quality = "EstimatedValue";
        flags.push("EstimatedValue");
      }
      numeric = parseFinancialNumber(text);
      if (numeric === null) {
        flags.push("MissingData");
        return { value: null, quality: "MissingData", flags };
      }
    } else {
      flags.push("MissingData");
      return { value: null, quality: "MissingData", flags };
    }

    if (options?.isPercentage) {
      // Accept 12.5 or "12.5%" — keep as percentage points
      flags.push(quality);
      return {
        value: round(numeric, this.config.decimalPrecision),
        quality,
        flags: uniqueFlags(flags),
      };
    }

    const unit = options?.unit ?? this.config.defaultUnit;
    const absolute = numeric * UNIT_TO_RAW[unit];
    flags.push(quality);
    return {
      value: round(absolute, this.config.decimalPrecision),
      quality,
      flags: uniqueFlags(flags),
    };
  }

  normalizeMappedValues(
    mapped: Partial<Record<CanonicalLineKey, unknown>>,
    meta: FinancialPeriodMeta
  ): {
    values: NormalizedStatementValues;
    lines: NormalizedLineItem[];
  } {
    const values: NormalizedStatementValues = {};
    const lines: NormalizedLineItem[] = [];

    for (const [key, raw] of Object.entries(mapped)) {
      const isPercentage = PERCENTAGE_KEYS.has(key);
      const normalized = this.normalizeValue(raw, {
        unit: meta.unit,
        isPercentage,
      });
      values[key] = normalized.value;
      lines.push({
        key,
        value: normalized.value,
        rawValue: raw,
        unit: meta.unit,
        currency: meta.currency,
        quality: normalized.quality,
        flags: normalized.flags,
        isPercentage,
      });
    }

    return { values, lines };
  }

  normalizeMeta(
    raw: Record<string, unknown>,
    defaults?: Partial<FinancialPeriodMeta>
  ): FinancialPeriodMeta {
    return {
      symbol: asString(raw.symbol ?? raw.ticker, defaults?.symbol ?? "").toUpperCase(),
      company: asString(raw.company ?? raw.companyName, defaults?.company ?? ""),
      exchange: asString(raw.exchange, defaults?.exchange ?? ""),
      currency: asString(
        raw.currency,
        defaults?.currency ?? this.config.defaultCurrency
      ).toUpperCase(),
      financialYear: normalizeFinancialYear(
        raw.financialYear ?? raw.fiscalYear ?? raw.fy,
        defaults?.financialYear ?? ""
      ),
      quarter: normalizeQuarter(raw.quarter ?? raw.fiscalQuarter) ?? defaults?.quarter,
      unit: normalizeUnit(raw.unit ?? raw.units, defaults?.unit ?? this.config.defaultUnit),
      source: asString(raw.source, defaults?.source ?? "unknown"),
      lastUpdated: asString(
        raw.lastUpdated ?? raw.updatedAt,
        defaults?.lastUpdated ?? new Date().toISOString()
      ),
      version: asString(raw.version, defaults?.version ?? this.config.engineVersion),
    };
  }
}

export function parseFinancialNumber(input: string): number | null {
  let text = input.trim();
  if (!text) return null;

  // Strip annotations in parentheses that are not accounting negatives
  text = text.replace(/\b(restated|estimated|est\.?)\b/gi, "").trim();

  // Accounting negative: (123.4)
  let negative = false;
  const paren = /^\((.*)\)$/.exec(text);
  if (paren) {
    negative = true;
    text = paren[1];
  }

  // Trailing / leading minus
  if (text.endsWith("-")) {
    negative = true;
    text = text.slice(0, -1);
  }
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1);
  }

  // Remove currency symbols / commas / spaces / %
  text = text
    .replace(/[₹$€£¥]/g, "")
    .replace(/,/g, "")
    .replace(/%/g, "")
    .replace(/\s+/g, "")
    .trim();

  // Unit suffixes left in value string (approximate)
  let multiplier = 1;
  if (/cr$/i.test(text) || /crore?s?$/i.test(text)) {
    multiplier = UNIT_TO_RAW.crores;
    text = text.replace(/crore?s?$/i, "").replace(/cr$/i, "");
  } else if (/lakh?s?$/i.test(text) || /lacs?$/i.test(text)) {
    multiplier = UNIT_TO_RAW.lakhs;
    text = text.replace(/lakh?s?$/i, "").replace(/lacs?$/i, "");
  } else if (/mn$|m$|million$/i.test(text)) {
    multiplier = UNIT_TO_RAW.millions;
    text = text.replace(/million$/i, "").replace(/mn$/i, "").replace(/m$/i, "");
  } else if (/bn$|b$|billion$/i.test(text)) {
    multiplier = UNIT_TO_RAW.billions;
    text = text.replace(/billion$/i, "").replace(/bn$/i, "").replace(/b$/i, "");
  }

  if (!text || text === "-" || text.toLowerCase() === "nil" || text.toLowerCase() === "na") {
    return null;
  }

  const n = Number(text);
  if (!Number.isFinite(n)) return null;
  const value = n * multiplier;
  return negative ? -Math.abs(value) : value;
}

export function normalizeFinancialYear(value: unknown, fallback = ""): string {
  if (typeof value === "number" && Number.isFinite(value)) return `FY${value}`;
  if (typeof value !== "string" || !value.trim()) return fallback;
  const v = value.trim().toUpperCase();
  if (/^FY\d{4}$/.test(v)) return v;
  if (/^\d{4}$/.test(v)) return `FY${v}`;
  if (/^\d{4}-\d{2}$/.test(v)) return `FY${v.slice(0, 4)}`;
  if (/^FY\d{4}-\d{2}$/.test(v)) return `FY${v.slice(2, 6)}`;
  return v.startsWith("FY") ? v : `FY${v}`;
}

export function normalizeQuarter(value: unknown): FinancialQuarter | undefined {
  if (typeof value !== "string" && typeof value !== "number") return undefined;
  const v = String(value).trim().toUpperCase();
  if (v === "Q1" || v === "1") return "Q1";
  if (v === "Q2" || v === "2") return "Q2";
  if (v === "Q3" || v === "3") return "Q3";
  if (v === "Q4" || v === "4") return "Q4";
  return undefined;
}

export function normalizeUnit(value: unknown, fallback: FinancialUnit): FinancialUnit {
  if (typeof value !== "string") return fallback;
  const v = value.trim().toLowerCase();
  if (v.includes("lakh") || v.includes("lac")) return "lakhs";
  if (v.includes("crore") || v === "cr") return "crores";
  if (v.includes("million") || v === "mn" || v === "m") return "millions";
  if (v.includes("billion") || v === "bn" || v === "b") return "billions";
  if (v === "raw" || v === "absolute" || v === "units") return "raw";
  return fallback;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function round(n: number, precision: number): number {
  const f = 10 ** precision;
  return Math.round(n * f) / f;
}

function uniqueFlags(flags: ValueQualityFlag[]): ValueQualityFlag[] {
  return [...new Set(flags)];
}
