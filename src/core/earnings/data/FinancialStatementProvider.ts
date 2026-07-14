/**
 * Financial statement provider — income statement, balance sheet, cash flow,
 * financial highlights, and dividend history.
 */

import type { EarningsDatasetKind } from "./EarningsConfiguration";
import {
  EarningsNormalizer,
  type EarningsMetadata,
  type NormalizedDividend,
  type NormalizedPeriodRecord,
  type RawEarningsInput,
} from "./EarningsNormalizer";

export type FinancialStatementKind =
  | "income_statement"
  | "balance_sheet"
  | "cash_flow"
  | "financial_highlights"
  | "dividend_history"
  | "standalone_results"
  | "consolidated_results";

export interface StatementLoadResult {
  kind: FinancialStatementKind;
  records: NormalizedPeriodRecord[];
  dividends: NormalizedDividend[];
  errors: string[];
  warnings: string[];
}

export class FinancialStatementProvider {
  constructor(private readonly normalizer: EarningsNormalizer) {}

  load(
    kind: FinancialStatementKind,
    rows: RawEarningsInput[] | null | undefined,
    defaults?: Partial<EarningsMetadata>
  ): StatementLoadResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const records: NormalizedPeriodRecord[] = [];
    const dividends: NormalizedDividend[] = [];

    if (!rows || !Array.isArray(rows)) {
      errors.push(`Missing ${kind} dataset`);
      return { kind, records, dividends, errors, warnings };
    }

    for (let i = 0; i < rows.length; i += 1) {
      try {
        const row = rows[i];
        if (!row || typeof row !== "object") {
          warnings.push(`Skipping corrupt ${kind} row at index ${i}`);
          continue;
        }

        if (kind === "dividend_history") {
          dividends.push(this.normalizer.normalizeDividend(row, defaults));
          continue;
        }

        const basis =
          kind === "standalone_results"
            ? "standalone"
            : kind === "consolidated_results"
              ? "consolidated"
              : row.statementBasis;

        records.push(
          this.normalizer.normalizePeriod(
            { ...row, statementBasis: basis },
            kind as EarningsDatasetKind,
            defaults
          )
        );
      } catch (err) {
        errors.push(`Failed to load ${kind} row ${i}: ${String(err)}`);
      }
    }

    return { kind, records, dividends, errors, warnings };
  }

  loadIncomeStatement(
    rows: RawEarningsInput[] | null | undefined,
    defaults?: Partial<EarningsMetadata>
  ): StatementLoadResult {
    return this.load("income_statement", rows, defaults);
  }

  loadBalanceSheet(
    rows: RawEarningsInput[] | null | undefined,
    defaults?: Partial<EarningsMetadata>
  ): StatementLoadResult {
    return this.load("balance_sheet", rows, defaults);
  }

  loadCashFlow(
    rows: RawEarningsInput[] | null | undefined,
    defaults?: Partial<EarningsMetadata>
  ): StatementLoadResult {
    return this.load("cash_flow", rows, defaults);
  }
}
