/**
 * Institutional earnings normalizer — maps raw provider payloads into
 * standardized internal financial models.
 */

import type { EarningsDatasetKind } from "./EarningsConfiguration";

export type EarningsQuarter = "Q1" | "Q2" | "Q3" | "Q4";
export type StatementBasis = "standalone" | "consolidated" | "unknown";
export type PeriodType = "quarter" | "annual";

export interface EarningsMetadata {
  company: string;
  exchange: string;
  symbol: string;
  isin: string;
  sector: string;
  industry: string;
  currency: string;
  financialYear: string;
  quarter?: EarningsQuarter;
  source: string;
  lastUpdated: string;
  version: string;
}

/** Standardized normalized financial line items. */
export interface NormalizedFinancialMetrics {
  revenue?: number;
  otherIncome?: number;
  ebitda?: number;
  ebit?: number;
  pbt?: number;
  pat?: number;
  eps?: number;
  dilutedEps?: number;
  operatingCashFlow?: number;
  freeCashFlow?: number;
  debt?: number;
  cash?: number;
  netWorth?: number;
  bookValue?: number;
  promoterHolding?: number;
  fiiHolding?: number;
  diiHolding?: number;
  publicHolding?: number;
}

export interface NormalizedPeriodRecord {
  periodKey: string;
  periodType: PeriodType;
  financialYear: string;
  quarter?: EarningsQuarter;
  statementBasis: StatementBasis;
  metrics: NormalizedFinancialMetrics;
  metadata: EarningsMetadata;
  datasetKind: EarningsDatasetKind;
  raw?: Record<string, unknown>;
}

export interface NormalizedAnnouncement {
  id: string;
  title: string;
  date: string;
  category: string;
  description: string;
  metadata: EarningsMetadata;
}

export interface NormalizedSegmentResult {
  periodKey: string;
  segmentName: string;
  revenue?: number;
  ebit?: number;
  capitalEmployed?: number;
  metadata: EarningsMetadata;
}

export interface NormalizedDividend {
  periodKey: string;
  exDate: string;
  amount: number;
  currency: string;
  metadata: EarningsMetadata;
}

export type RawEarningsInput = Record<string, unknown>;

const METRIC_ALIASES: Record<keyof NormalizedFinancialMetrics, string[]> = {
  revenue: ["revenue", "totalRevenue", "netSales", "sales", "turnover"],
  otherIncome: ["otherIncome", "other_income", "otherIncomeNet"],
  ebitda: ["ebitda", "EBITDA", "operatingProfitBeforeDA"],
  ebit: ["ebit", "EBIT", "operatingProfit", "operatingIncome"],
  pbt: ["pbt", "PBT", "profitBeforeTax", "preTaxProfit"],
  pat: ["pat", "PAT", "netProfit", "profitAfterTax", "netIncome"],
  eps: ["eps", "EPS", "earningsPerShare", "basicEps"],
  dilutedEps: ["dilutedEps", "dilutedEPS", "diluted_eps"],
  operatingCashFlow: [
    "operatingCashFlow",
    "cashFromOperations",
    "cfo",
    "operatingCF",
  ],
  freeCashFlow: ["freeCashFlow", "fcf", "free_cash_flow"],
  debt: ["debt", "totalDebt", "borrowings"],
  cash: ["cash", "cashAndEquivalents", "cashAndBank"],
  netWorth: ["netWorth", "shareholdersEquity", "totalEquity"],
  bookValue: ["bookValue", "bookValuePerShare", "bvps"],
  promoterHolding: ["promoterHolding", "promoter", "promoters"],
  fiiHolding: ["fiiHolding", "fii", "fpi"],
  diiHolding: ["diiHolding", "dii"],
  publicHolding: ["publicHolding", "public", "retail"],
};

const NON_NEGATIVE_METRICS = new Set<keyof NormalizedFinancialMetrics>([
  "revenue",
  "otherIncome",
  "debt",
  "cash",
  "netWorth",
  "bookValue",
  "promoterHolding",
  "fiiHolding",
  "diiHolding",
  "publicHolding",
]);

export class EarningsNormalizer {
  normalizePeriod(
    raw: RawEarningsInput,
    datasetKind: EarningsDatasetKind,
    defaults?: Partial<EarningsMetadata>
  ): NormalizedPeriodRecord {
    const metadata = this.normalizeMetadata(raw, defaults);
    const periodType = this.resolvePeriodType(raw, datasetKind);
    const quarter = this.normalizeQuarter(raw.quarter ?? raw.fiscalQuarter);
    const financialYear = metadata.financialYear;
    const periodKey =
      typeof raw.periodKey === "string" && raw.periodKey.trim()
        ? raw.periodKey.trim()
        : buildPeriodKey(financialYear, periodType, quarter);

    return {
      periodKey,
      periodType,
      financialYear,
      quarter: periodType === "quarter" ? quarter : undefined,
      statementBasis: this.normalizeBasis(
        raw.statementBasis ?? raw.basis ?? raw.consolidation
      ),
      metrics: this.normalizeMetrics(raw),
      metadata: {
        ...metadata,
        financialYear,
        quarter: periodType === "quarter" ? quarter : metadata.quarter,
      },
      datasetKind,
      raw,
    };
  }

  normalizeMetrics(raw: RawEarningsInput): NormalizedFinancialMetrics {
    const metrics: NormalizedFinancialMetrics = {};
    const nested =
      isPlainObject(raw.metrics) ? (raw.metrics as RawEarningsInput) : raw;

    for (const key of Object.keys(METRIC_ALIASES) as Array<
      keyof NormalizedFinancialMetrics
    >) {
      const value = this.readNumber(nested, METRIC_ALIASES[key]);
      if (value !== undefined) {
        metrics[key] = value;
      }
    }
    return metrics;
  }

  normalizeMetadata(
    raw: RawEarningsInput,
    defaults?: Partial<EarningsMetadata>
  ): EarningsMetadata {
    const now = new Date().toISOString();
    return {
      company: asString(raw.company ?? raw.companyName, defaults?.company ?? ""),
      exchange: asString(raw.exchange, defaults?.exchange ?? ""),
      symbol: asString(raw.symbol ?? raw.ticker, defaults?.symbol ?? "")
        .toUpperCase(),
      isin: asString(raw.isin, defaults?.isin ?? ""),
      sector: asString(raw.sector, defaults?.sector ?? ""),
      industry: asString(raw.industry, defaults?.industry ?? ""),
      currency: asString(
        raw.currency,
        defaults?.currency ?? "INR"
      ).toUpperCase(),
      financialYear: normalizeFinancialYear(
        raw.financialYear ?? raw.fiscalYear ?? raw.fy,
        defaults?.financialYear ?? ""
      ),
      quarter: this.normalizeQuarter(raw.quarter ?? raw.fiscalQuarter) ??
        defaults?.quarter,
      source: asString(raw.source, defaults?.source ?? "unknown"),
      lastUpdated: asString(
        raw.lastUpdated ?? raw.updatedAt,
        defaults?.lastUpdated ?? now
      ),
      version: asString(raw.version, defaults?.version ?? "1"),
    };
  }

  normalizeAnnouncement(
    raw: RawEarningsInput,
    defaults?: Partial<EarningsMetadata>
  ): NormalizedAnnouncement {
    const metadata = this.normalizeMetadata(raw, defaults);
    return {
      id: asString(raw.id ?? raw.announcementId, `ann:${metadata.symbol}:${Date.now()}`),
      title: asString(raw.title ?? raw.headline, "Untitled announcement"),
      date: asString(raw.date ?? raw.announcementDate, metadata.lastUpdated),
      category: asString(raw.category ?? raw.type, "general"),
      description: asString(raw.description ?? raw.body, ""),
      metadata,
    };
  }

  normalizeSegment(
    raw: RawEarningsInput,
    defaults?: Partial<EarningsMetadata>
  ): NormalizedSegmentResult {
    const metadata = this.normalizeMetadata(raw, defaults);
    const quarter = this.normalizeQuarter(raw.quarter);
    const periodKey =
      typeof raw.periodKey === "string" && raw.periodKey.trim()
        ? raw.periodKey.trim()
        : buildPeriodKey(metadata.financialYear, "quarter", quarter);
    return {
      periodKey,
      segmentName: asString(raw.segmentName ?? raw.segment ?? raw.name, "Unknown"),
      revenue: this.readNumber(raw, ["revenue", "sales"]),
      ebit: this.readNumber(raw, ["ebit", "operatingProfit"]),
      capitalEmployed: this.readNumber(raw, ["capitalEmployed", "capital"]),
      metadata,
    };
  }

  normalizeDividend(
    raw: RawEarningsInput,
    defaults?: Partial<EarningsMetadata>
  ): NormalizedDividend {
    const metadata = this.normalizeMetadata(raw, defaults);
    return {
      periodKey: asString(
        raw.periodKey,
        buildPeriodKey(metadata.financialYear, "annual")
      ),
      exDate: asString(raw.exDate ?? raw.date, metadata.lastUpdated),
      amount: this.readNumber(raw, ["amount", "dividend", "dividendAmount"]) ?? 0,
      currency: metadata.currency,
      metadata,
    };
  }

  isNonNegativeMetric(key: keyof NormalizedFinancialMetrics): boolean {
    return NON_NEGATIVE_METRICS.has(key);
  }

  private resolvePeriodType(
    raw: RawEarningsInput,
    datasetKind: EarningsDatasetKind
  ): PeriodType {
    if (raw.periodType === "annual" || raw.periodType === "quarter") {
      return raw.periodType;
    }
    if (
      datasetKind === "annual_results" ||
      datasetKind === "dividend_history"
    ) {
      return "annual";
    }
    if (datasetKind === "quarterly_results") return "quarter";
    if (raw.quarter || raw.fiscalQuarter) return "quarter";
    return "annual";
  }

  private normalizeQuarter(value: unknown): EarningsQuarter | undefined {
    if (typeof value !== "string") return undefined;
    const v = value.trim().toUpperCase();
    if (v === "Q1" || v === "1" || v === "QUARTER1") return "Q1";
    if (v === "Q2" || v === "2" || v === "QUARTER2") return "Q2";
    if (v === "Q3" || v === "3" || v === "QUARTER3") return "Q3";
    if (v === "Q4" || v === "4" || v === "QUARTER4") return "Q4";
    return undefined;
  }

  private normalizeBasis(value: unknown): StatementBasis {
    if (typeof value !== "string") return "unknown";
    const v = value.trim().toLowerCase();
    if (v.includes("stand")) return "standalone";
    if (v.includes("consol")) return "consolidated";
    return "unknown";
  }

  private readNumber(
    raw: RawEarningsInput,
    aliases: string[]
  ): number | undefined {
    for (const alias of aliases) {
      if (!(alias in raw)) continue;
      const n = coerceNumber(raw[alias]);
      if (n !== undefined) return n;
    }
    return undefined;
  }
}

export function buildPeriodKey(
  financialYear: string,
  periodType: PeriodType,
  quarter?: EarningsQuarter
): string {
  const fy = financialYear || "FYUNK";
  if (periodType === "quarter" && quarter) return `${fy}-${quarter}`;
  return fy;
}

export function normalizeFinancialYear(value: unknown, fallback = ""): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `FY${value}`;
  }
  if (typeof value !== "string" || !value.trim()) return fallback;
  const v = value.trim().toUpperCase();
  if (/^FY\d{4}$/.test(v)) return v;
  if (/^\d{4}$/.test(v)) return `FY${v}`;
  if (/^\d{4}-\d{2}$/.test(v)) return `FY${v.slice(0, 4)}`;
  if (/^FY\d{4}-\d{2}$/.test(v)) return `FY${v.slice(2, 6)}`;
  return v.startsWith("FY") ? v : `FY${v}`;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, "").replace(/%/g, "").trim();
    if (!cleaned) return undefined;
    const n = Number(cleaned);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
