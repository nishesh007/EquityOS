/**
 * Financial statement validator — structural checks with warnings, never crashes.
 */

import type { FinancialConfiguration } from "./FinancialConfiguration";
import type {
  FinancialPeriodMeta,
  NormalizedStatementValues,
} from "./FinancialNormalizer";

export type FinancialValidationSeverity = "error" | "warning";

export interface FinancialValidationIssue {
  code: string;
  severity: FinancialValidationSeverity;
  message: string;
  field?: string;
  statementType?: string;
}

export interface FinancialValidationResult {
  valid: boolean;
  issues: FinancialValidationIssue[];
  confidenceScore: number;
}

export interface StatementValidationInput {
  statementType: "income_statement" | "balance_sheet" | "cash_flow";
  values: NormalizedStatementValues;
  meta: FinancialPeriodMeta;
  lineLabels?: string[];
}

export class FinancialValidator {
  constructor(private readonly config: FinancialConfiguration) {}

  validateStatements(
    inputs: StatementValidationInput[]
  ): FinancialValidationResult {
    const issues: FinancialValidationIssue[] = [];
    if (!inputs.length) {
      issues.push({
        code: "MISSING_STATEMENTS",
        severity: "error",
        message: "No financial statements provided",
      });
      return { valid: false, issues, confidenceScore: 0 };
    }

    let referenceCurrency: string | undefined;
    let referenceFy: string | undefined;
    let referenceQuarter: string | undefined;

    for (const input of inputs) {
      issues.push(...this.validateStatement(input));

      if (!referenceCurrency) referenceCurrency = input.meta.currency;
      else if (
        input.meta.currency &&
        referenceCurrency &&
        input.meta.currency !== referenceCurrency
      ) {
        issues.push({
          code: "CURRENCY_MISMATCH",
          severity: "error",
          message: `Currency mismatch: ${referenceCurrency} vs ${input.meta.currency}`,
          field: "currency",
          statementType: input.statementType,
        });
      }

      if (!referenceFy) referenceFy = input.meta.financialYear;
      else if (
        input.meta.financialYear &&
        referenceFy &&
        input.meta.financialYear !== referenceFy
      ) {
        issues.push({
          code: "FY_MISMATCH",
          severity: "error",
          message: `Financial year mismatch: ${referenceFy} vs ${input.meta.financialYear}`,
          field: "financialYear",
          statementType: input.statementType,
        });
      }

      if (input.meta.quarter) {
        if (!referenceQuarter) referenceQuarter = input.meta.quarter;
        else if (referenceQuarter !== input.meta.quarter) {
          issues.push({
            code: "QUARTER_MISMATCH",
            severity: "error",
            message: `Quarter mismatch: ${referenceQuarter} vs ${input.meta.quarter}`,
            field: "quarter",
            statementType: input.statementType,
          });
        }
      }

      if (input.lineLabels) {
        const seen = new Set<string>();
        for (const label of input.lineLabels) {
          const key = label.trim().toLowerCase();
          if (seen.has(key)) {
            issues.push({
              code: "DUPLICATE_ROW",
              severity: "warning",
              message: `Duplicate row: ${label}`,
              field: label,
              statementType: input.statementType,
            });
          }
          seen.add(key);
        }
      }
    }

    // Cross-statement PAT consistency when income + cash flow present
    const income = inputs.find((i) => i.statementType === "income_statement");
    const cash = inputs.find((i) => i.statementType === "cash_flow");
    if (
      income &&
      cash &&
      isNum(income.values.pat) &&
      isNum(cash.values.pat) &&
      Math.abs((income.values.pat as number) - (cash.values.pat as number)) >
        this.config.cashFlowTolerance
    ) {
      issues.push({
        code: "PAT_INCONSISTENCY",
        severity: "warning",
        message: "PAT differs between income statement and cash-flow payload",
        field: "pat",
      });
    }

    const errors = issues.filter((i) => i.severity === "error").length;
    const warnings = issues.filter((i) => i.severity === "warning").length;
    const confidenceScore = Math.max(
      0,
      Math.min(100, 100 - errors * 15 - warnings * 5)
    );

    return {
      valid: errors === 0,
      issues,
      confidenceScore,
    };
  }

  validateStatement(input: StatementValidationInput): FinancialValidationIssue[] {
    const issues: FinancialValidationIssue[] = [];
    const { values, meta, statementType } = input;

    if (!meta.symbol) {
      issues.push({
        code: "MISSING_SYMBOL",
        severity: this.config.mode === "strict" ? "error" : "warning",
        message: "Symbol is required",
        field: "symbol",
        statementType,
      });
    }
    if (!meta.currency) {
      issues.push({
        code: "MISSING_CURRENCY",
        severity: "error",
        message: "Currency is required",
        field: "currency",
        statementType,
      });
    }
    if (!meta.financialYear) {
      issues.push({
        code: "MISSING_FY",
        severity: "error",
        message: "Financial year is required",
        field: "financialYear",
        statementType,
      });
    }

    for (const [key, value] of Object.entries(values)) {
      if (value === undefined || value === null) continue;
      if (!Number.isFinite(value)) {
        issues.push({
          code: "MALFORMED_VALUE",
          severity: "error",
          message: `Malformed value for ${key}`,
          field: key,
          statementType,
        });
      }
    }

    if (statementType === "income_statement") {
      if (!isNum(values.revenue) && !this.config.allowPartialStatements) {
        issues.push({
          code: "MISSING_MANDATORY",
          severity: "error",
          message: "Revenue is mandatory",
          field: "revenue",
          statementType,
        });
      }
      if (!isNum(values.pat) && !this.config.allowPartialStatements) {
        issues.push({
          code: "MISSING_MANDATORY",
          severity: "error",
          message: "PAT is mandatory",
          field: "pat",
          statementType,
        });
      }
      if (
        isNum(values.pbt) &&
        isNum(values.tax) &&
        isNum(values.pat) &&
        Math.abs(
          (values.pbt as number) - (values.tax as number) - (values.pat as number)
        ) > Math.max(1, Math.abs(values.pbt as number) * 0.05)
      ) {
        issues.push({
          code: "PAT_INCONSISTENCY",
          severity: "warning",
          message: "PAT is inconsistent with PBT - Tax",
          field: "pat",
          statementType,
        });
      }
    }

    if (statementType === "balance_sheet") {
      const assets = values.totalAssets;
      const liabilities =
        values.totalLiabilities ??
        sumNullable(values.currentLiabilities, values.nonCurrentLiabilities);
      const equity =
        values.netWorth ?? sumNullable(values.shareCapital, values.reserves);

      if (!isNum(assets) && !this.config.allowPartialStatements) {
        issues.push({
          code: "MISSING_MANDATORY",
          severity: "error",
          message: "Total Assets is mandatory",
          field: "totalAssets",
          statementType,
        });
      }

      if (isNum(assets) && isNum(liabilities) && isNum(equity)) {
        const rhs = (liabilities as number) + (equity as number);
        const delta = Math.abs((assets as number) - rhs);
        const tol =
          Math.max(
            this.config.balanceSheetTolerance,
            Math.abs(assets as number) * this.config.balanceSheetTolerance
          );
        if (delta > tol) {
          issues.push({
            code: "BALANCE_SHEET_INEQUALITY",
            severity: "error",
            message: `Assets (${assets}) != Liabilities+Equity (${rhs})`,
            field: "totalAssets",
            statementType,
          });
        }
      }
    }

    if (statementType === "cash_flow") {
      if (!isNum(values.operatingCashFlow) && !this.config.allowPartialStatements) {
        issues.push({
          code: "MISSING_MANDATORY",
          severity: "error",
          message: "Operating cash flow is mandatory",
          field: "operatingCashFlow",
          statementType,
        });
      }

      if (
        isNum(values.operatingCashFlow) &&
        isNum(values.investingCashFlow) &&
        isNum(values.financingCashFlow) &&
        isNum(values.netCashChange)
      ) {
        const sum =
          (values.operatingCashFlow as number) +
          (values.investingCashFlow as number) +
          (values.financingCashFlow as number);
        if (
          Math.abs(sum - (values.netCashChange as number)) >
          this.config.cashFlowTolerance
        ) {
          issues.push({
            code: "CASH_FLOW_CONTINUITY",
            severity: "warning",
            message: "Operating+Investing+Financing does not equal Net Cash Change",
            field: "netCashChange",
            statementType,
          });
        }
      }

      if (
        isNum(values.openingCash) &&
        isNum(values.netCashChange) &&
        isNum(values.closingCash)
      ) {
        const expected =
          (values.openingCash as number) + (values.netCashChange as number);
        if (
          Math.abs(expected - (values.closingCash as number)) >
          this.config.cashFlowTolerance
        ) {
          issues.push({
            code: "CASH_FLOW_CONTINUITY",
            severity: "warning",
            message: "Opening cash + net change does not equal closing cash",
            field: "closingCash",
            statementType,
          });
        }
      }
    }

    return issues;
  }
}

function isNum(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function sumNullable(a: unknown, b: unknown): number | null {
  if (!isNum(a) && !isNum(b)) return null;
  return (isNum(a) ? a : 0) + (isNum(b) ? b : 0);
}
