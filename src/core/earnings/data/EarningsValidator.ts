/**
 * Institutional earnings validator — rejects malformed datasets and
 * flags continuity / consistency issues without crashing consumers.
 */

import type { EarningsConfiguration } from "./EarningsConfiguration";
import {
  type EarningsMetadata,
  type NormalizedFinancialMetrics,
  type NormalizedPeriodRecord,
  type EarningsNormalizer,
} from "./EarningsNormalizer";

export type ValidationSeverity = "error" | "warning";

export interface EarningsValidationIssue {
  code: string;
  severity: ValidationSeverity;
  message: string;
  field?: string;
  periodKey?: string;
}

export interface EarningsValidationResult {
  valid: boolean;
  rejected: boolean;
  issues: EarningsValidationIssue[];
  acceptedRecords: NormalizedPeriodRecord[];
  rejectedRecords: NormalizedPeriodRecord[];
}

const HOLDING_KEYS: Array<keyof NormalizedFinancialMetrics> = [
  "promoterHolding",
  "fiiHolding",
  "diiHolding",
  "publicHolding",
];

export class EarningsValidator {
  constructor(
    private readonly config: EarningsConfiguration,
    private readonly normalizer: EarningsNormalizer
  ) {}

  validatePeriods(
    records: NormalizedPeriodRecord[]
  ): EarningsValidationResult {
    const issues: EarningsValidationIssue[] = [];
    const accepted: NormalizedPeriodRecord[] = [];
    const rejected: NormalizedPeriodRecord[] = [];

    if (!Array.isArray(records) || records.length === 0) {
      issues.push({
        code: "MISSING_DATASET",
        severity: "error",
        message: "No period records provided",
      });
      return {
        valid: false,
        rejected: this.config.rejectMalformed,
        issues,
        acceptedRecords: [],
        rejectedRecords: [],
      };
    }

    const seen = new Map<string, NormalizedPeriodRecord>();
    let referenceCurrency: string | undefined;
    let referenceSymbol: string | undefined;

    for (const record of records) {
      const recordIssues = this.validateRecord(record);
      issues.push(...recordIssues);

      const hasFatal = recordIssues.some((i) => i.severity === "error");
      if (hasFatal && this.config.rejectMalformed) {
        rejected.push(record);
        continue;
      }

      const dupKey = `${record.datasetKind}:${record.periodKey}:${record.statementBasis}`;
      if (seen.has(dupKey)) {
        issues.push({
          code: "DUPLICATE_PERIOD",
          severity: "error",
          message: `Duplicate period ${record.periodKey}`,
          periodKey: record.periodKey,
        });
        if (this.config.rejectMalformed) {
          rejected.push(record);
          continue;
        }
      } else {
        seen.set(dupKey, record);
      }

      const currency = record.metadata.currency;
      if (!referenceCurrency) referenceCurrency = currency;
      else if (currency && referenceCurrency && currency !== referenceCurrency) {
        issues.push({
          code: "CURRENCY_INCONSISTENCY",
          severity: "error",
          message: `Currency mismatch: expected ${referenceCurrency}, got ${currency}`,
          periodKey: record.periodKey,
          field: "currency",
        });
        if (this.config.rejectMalformed) {
          rejected.push(record);
          continue;
        }
      }

      const symbol = record.metadata.symbol;
      if (!referenceSymbol) referenceSymbol = symbol;
      else if (symbol && referenceSymbol && symbol !== referenceSymbol) {
        issues.push({
          code: "SYMBOL_INCONSISTENCY",
          severity: "warning",
          message: `Symbol mismatch within dataset: ${referenceSymbol} vs ${symbol}`,
          periodKey: record.periodKey,
          field: "symbol",
        });
      }

      this.validateDateConsistency(record.metadata, issues, record.periodKey);
      accepted.push(record);
    }

    issues.push(...this.validateContinuity(accepted));

    const hasErrors = issues.some((i) => i.severity === "error");
    const rejectedAll =
      this.config.rejectMalformed && accepted.length === 0 && hasErrors;

    return {
      valid: !hasErrors || (!this.config.rejectMalformed && accepted.length > 0),
      rejected: rejectedAll || (this.config.rejectMalformed && rejected.length > 0 && accepted.length === 0),
      issues,
      acceptedRecords: accepted,
      rejectedRecords: rejected,
    };
  }

  validateRecord(record: NormalizedPeriodRecord): EarningsValidationIssue[] {
    const issues: EarningsValidationIssue[] = [];
    if (!record.periodKey) {
      issues.push({
        code: "MISSING_PERIOD",
        severity: "error",
        message: "Period key is required",
        field: "periodKey",
      });
    }
    if (!record.financialYear) {
      issues.push({
        code: "MISSING_FINANCIAL_YEAR",
        severity: "error",
        message: "Financial year is required",
        field: "financialYear",
        periodKey: record.periodKey,
      });
    }
    if (record.periodType === "quarter" && !record.quarter) {
      issues.push({
        code: "MISSING_QUARTER",
        severity: "error",
        message: "Quarter is required for quarterly records",
        field: "quarter",
        periodKey: record.periodKey,
      });
    }
    if (!record.metadata.symbol) {
      issues.push({
        code: "MISSING_SYMBOL",
        severity: this.config.mode === "strict" ? "error" : "warning",
        message: "Symbol metadata is required",
        field: "symbol",
        periodKey: record.periodKey,
      });
    }
    if (!record.metadata.currency) {
      issues.push({
        code: "MISSING_CURRENCY",
        severity: "error",
        message: "Currency is required",
        field: "currency",
        periodKey: record.periodKey,
      });
    }

    const metricKeys = Object.keys(record.metrics) as Array<
      keyof NormalizedFinancialMetrics
    >;
    if (metricKeys.length === 0 && !this.config.allowPartialStatements) {
      issues.push({
        code: "MISSING_FIELDS",
        severity: "error",
        message: "No financial metrics present",
        periodKey: record.periodKey,
      });
    }

    for (const key of metricKeys) {
      const value = record.metrics[key];
      if (value === undefined) continue;
      if (!Number.isFinite(value)) {
        issues.push({
          code: "INVALID_NUMBER",
          severity: "error",
          message: `Invalid number for ${key}`,
          field: key,
          periodKey: record.periodKey,
        });
        continue;
      }
      if (
        this.normalizer.isNonNegativeMetric(key) &&
        value < 0 &&
        !HOLDING_KEYS.includes(key)
      ) {
        issues.push({
          code: "NEGATIVE_VALUE",
          severity: "error",
          message: `Negative value not allowed for ${key}`,
          field: key,
          periodKey: record.periodKey,
        });
      }
      if (HOLDING_KEYS.includes(key) && (value < 0 || value > 100)) {
        issues.push({
          code: "INVALID_HOLDING",
          severity: "error",
          message: `Holding ${key} must be between 0 and 100`,
          field: key,
          periodKey: record.periodKey,
        });
      }
    }

    return issues;
  }

  private validateDateConsistency(
    metadata: EarningsMetadata,
    issues: EarningsValidationIssue[],
    periodKey?: string
  ): void {
    if (!metadata.lastUpdated) return;
    const ts = Date.parse(metadata.lastUpdated);
    if (Number.isNaN(ts)) {
      issues.push({
        code: "DATE_INCONSISTENCY",
        severity: "error",
        message: `Invalid lastUpdated date: ${metadata.lastUpdated}`,
        field: "lastUpdated",
        periodKey,
      });
      return;
    }
    if (ts > Date.now() + 24 * 60 * 60 * 1000) {
      issues.push({
        code: "DATE_INCONSISTENCY",
        severity: "warning",
        message: "lastUpdated is in the future",
        field: "lastUpdated",
        periodKey,
      });
    }
  }

  private validateContinuity(
    records: NormalizedPeriodRecord[]
  ): EarningsValidationIssue[] {
    const issues: EarningsValidationIssue[] = [];
    const annual = records
      .filter((r) => r.periodType === "annual")
      .map((r) => extractFyYear(r.financialYear))
      .filter((n): n is number => n !== null)
      .sort((a, b) => a - b);

    for (let i = 1; i < annual.length; i += 1) {
      if (annual[i] - annual[i - 1] > 1) {
        issues.push({
          code: "FY_CONTINUITY_GAP",
          severity: "warning",
          message: `Financial year gap between FY${annual[i - 1]} and FY${annual[i]}`,
        });
      }
    }

    const quarters = records
      .filter((r) => r.periodType === "quarter" && r.quarter)
      .map((r) => ({
        key: r.periodKey,
        rank: quarterRank(r.financialYear, r.quarter!),
      }))
      .filter((q) => q.rank !== null)
      .sort((a, b) => (a.rank as number) - (b.rank as number));

    for (let i = 1; i < quarters.length; i += 1) {
      const prev = quarters[i - 1].rank as number;
      const curr = quarters[i].rank as number;
      if (curr - prev > 1) {
        issues.push({
          code: "QUARTER_CONTINUITY_GAP",
          severity: "warning",
          message: `Quarter continuity gap between ${quarters[i - 1].key} and ${quarters[i].key}`,
          periodKey: quarters[i].key,
        });
      }
    }

    return issues;
  }
}

function extractFyYear(fy: string): number | null {
  const m = /^FY(\d{4})/.exec(fy);
  return m ? Number(m[1]) : null;
}

function quarterRank(
  financialYear: string,
  quarter: string
): number | null {
  const year = extractFyYear(financialYear);
  if (year === null) return null;
  const qMap: Record<string, number> = { Q1: 1, Q2: 2, Q3: 3, Q4: 4 };
  const q = qMap[quarter];
  if (!q) return null;
  return year * 4 + q;
}
