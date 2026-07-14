/**
 * Financial statement registry — catalogs supported statement types and line items.
 * Registration is idempotent.
 */

import type { FinancialStatementType } from "./FinancialConfiguration";

export type FinancialLineCategory =
  | "income"
  | "balance_asset"
  | "balance_liability"
  | "balance_equity"
  | "cash_flow"
  | "derived";

export interface FinancialLineDefinition {
  key: string;
  label: string;
  category: FinancialLineCategory;
  statementTypes: FinancialStatementType[];
  mandatory?: boolean;
  isPercentage?: boolean;
  registeredAt: string;
}

export interface FinancialStatementDefinition {
  type: FinancialStatementType;
  label: string;
  description: string;
  registeredAt: string;
}

const statements = new Map<FinancialStatementType, FinancialStatementDefinition>();
const lines = new Map<string, FinancialLineDefinition>();
let builtinsRegistered = false;

const STATEMENT_META: Record<
  FinancialStatementType,
  { label: string; description: string }
> = {
  income_statement: {
    label: "Income Statement",
    description: "Profit and loss / income statement",
  },
  balance_sheet: {
    label: "Balance Sheet",
    description: "Assets, liabilities and equity",
  },
  cash_flow: {
    label: "Cash Flow",
    description: "Operating, investing and financing cash flows",
  },
};

const BUILTIN_LINES: Array<Omit<FinancialLineDefinition, "registeredAt">> = [
  // Income
  { key: "revenue", label: "Revenue", category: "income", statementTypes: ["income_statement"], mandatory: true },
  { key: "otherIncome", label: "Other Income", category: "income", statementTypes: ["income_statement"] },
  { key: "operatingExpenses", label: "Operating Expenses", category: "income", statementTypes: ["income_statement"] },
  { key: "ebitda", label: "EBITDA", category: "income", statementTypes: ["income_statement"] },
  { key: "depreciation", label: "Depreciation", category: "income", statementTypes: ["income_statement"] },
  { key: "ebit", label: "EBIT", category: "income", statementTypes: ["income_statement"] },
  { key: "financeCost", label: "Finance Cost", category: "income", statementTypes: ["income_statement"] },
  { key: "pbt", label: "PBT", category: "income", statementTypes: ["income_statement"] },
  { key: "tax", label: "Tax", category: "income", statementTypes: ["income_statement"] },
  { key: "pat", label: "PAT", category: "income", statementTypes: ["income_statement"], mandatory: true },
  { key: "minorityInterest", label: "Minority Interest", category: "income", statementTypes: ["income_statement"] },
  { key: "eps", label: "EPS", category: "income", statementTypes: ["income_statement"] },
  { key: "dilutedEps", label: "Diluted EPS", category: "income", statementTypes: ["income_statement"] },
  // Assets
  { key: "totalAssets", label: "Total Assets", category: "balance_asset", statementTypes: ["balance_sheet"], mandatory: true },
  { key: "currentAssets", label: "Current Assets", category: "balance_asset", statementTypes: ["balance_sheet"] },
  { key: "nonCurrentAssets", label: "Non Current Assets", category: "balance_asset", statementTypes: ["balance_sheet"] },
  { key: "cash", label: "Cash", category: "balance_asset", statementTypes: ["balance_sheet"] },
  { key: "investments", label: "Investments", category: "balance_asset", statementTypes: ["balance_sheet"] },
  { key: "inventory", label: "Inventory", category: "balance_asset", statementTypes: ["balance_sheet"] },
  { key: "receivables", label: "Receivables", category: "balance_asset", statementTypes: ["balance_sheet"] },
  { key: "fixedAssets", label: "Fixed Assets", category: "balance_asset", statementTypes: ["balance_sheet"] },
  { key: "cwip", label: "CWIP", category: "balance_asset", statementTypes: ["balance_sheet"] },
  { key: "intangibleAssets", label: "Intangible Assets", category: "balance_asset", statementTypes: ["balance_sheet"] },
  // Liabilities
  { key: "currentLiabilities", label: "Current Liabilities", category: "balance_liability", statementTypes: ["balance_sheet"] },
  { key: "nonCurrentLiabilities", label: "Non Current Liabilities", category: "balance_liability", statementTypes: ["balance_sheet"] },
  { key: "debt", label: "Debt", category: "balance_liability", statementTypes: ["balance_sheet"] },
  { key: "leaseLiabilities", label: "Lease Liabilities", category: "balance_liability", statementTypes: ["balance_sheet"] },
  { key: "tradePayables", label: "Trade Payables", category: "balance_liability", statementTypes: ["balance_sheet"] },
  { key: "totalLiabilities", label: "Total Liabilities", category: "balance_liability", statementTypes: ["balance_sheet"] },
  // Equity
  { key: "shareCapital", label: "Share Capital", category: "balance_equity", statementTypes: ["balance_sheet"] },
  { key: "reserves", label: "Reserves", category: "balance_equity", statementTypes: ["balance_sheet"] },
  { key: "netWorth", label: "Net Worth", category: "balance_equity", statementTypes: ["balance_sheet"] },
  { key: "bookValue", label: "Book Value", category: "balance_equity", statementTypes: ["balance_sheet"] },
  { key: "sharesOutstanding", label: "Shares Outstanding", category: "balance_equity", statementTypes: ["balance_sheet", "income_statement"] },
  // Cash flow
  { key: "operatingCashFlow", label: "Operating Cash Flow", category: "cash_flow", statementTypes: ["cash_flow"], mandatory: true },
  { key: "investingCashFlow", label: "Investing Cash Flow", category: "cash_flow", statementTypes: ["cash_flow"] },
  { key: "financingCashFlow", label: "Financing Cash Flow", category: "cash_flow", statementTypes: ["cash_flow"] },
  { key: "capex", label: "Capex", category: "cash_flow", statementTypes: ["cash_flow"] },
  { key: "dividendPaid", label: "Dividend", category: "cash_flow", statementTypes: ["cash_flow"] },
  { key: "freeCashFlow", label: "Free Cash Flow", category: "cash_flow", statementTypes: ["cash_flow"] },
  { key: "netCashChange", label: "Net Cash Change", category: "cash_flow", statementTypes: ["cash_flow"] },
  { key: "openingCash", label: "Opening Cash", category: "cash_flow", statementTypes: ["cash_flow"] },
  { key: "closingCash", label: "Closing Cash", category: "cash_flow", statementTypes: ["cash_flow"] },
  // Derived
  { key: "ebitdaMargin", label: "EBITDA Margin", category: "derived", statementTypes: ["income_statement"], isPercentage: true },
  { key: "operatingMargin", label: "Operating Margin", category: "derived", statementTypes: ["income_statement"], isPercentage: true },
  { key: "netMargin", label: "Net Margin", category: "derived", statementTypes: ["income_statement"], isPercentage: true },
  { key: "netDebt", label: "Net Debt", category: "derived", statementTypes: ["balance_sheet"] },
  { key: "workingCapital", label: "Working Capital", category: "derived", statementTypes: ["balance_sheet"] },
  { key: "bookValuePerShare", label: "Book Value Per Share", category: "derived", statementTypes: ["balance_sheet"] },
  { key: "enterpriseDebt", label: "Enterprise Debt", category: "derived", statementTypes: ["balance_sheet"] },
  { key: "cashConversion", label: "Cash Conversion", category: "derived", statementTypes: ["cash_flow"], isPercentage: true },
  { key: "operatingCashConversion", label: "Operating Cash Conversion", category: "derived", statementTypes: ["cash_flow"], isPercentage: true },
];

export function registerFinancialStatement(
  definition: Omit<FinancialStatementDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (statements.has(definition.type) && !options?.force) {
    return { registered: false, skipped: true };
  }
  statements.set(definition.type, {
    ...definition,
    registeredAt: definition.registeredAt ?? new Date().toISOString(),
  });
  return { registered: true, skipped: false };
}

export function registerFinancialLine(
  definition: Omit<FinancialLineDefinition, "registeredAt"> & {
    registeredAt?: string;
  },
  options?: { force?: boolean }
): { registered: boolean; skipped: boolean } {
  if (lines.has(definition.key) && !options?.force) {
    return { registered: false, skipped: true };
  }
  lines.set(definition.key, {
    ...definition,
    statementTypes: [...definition.statementTypes],
    registeredAt: definition.registeredAt ?? new Date().toISOString(),
  });
  return { registered: true, skipped: false };
}

export function registerBuiltinFinancialCatalog(options?: {
  force?: boolean;
}): { statements: number; lines: number; skipped: number } {
  if (builtinsRegistered && !options?.force) {
    return {
      statements: statements.size,
      lines: lines.size,
      skipped: statements.size + lines.size,
    };
  }

  let skipped = 0;
  for (const type of Object.keys(STATEMENT_META) as FinancialStatementType[]) {
    const meta = STATEMENT_META[type];
    const result = registerFinancialStatement(
      { type, label: meta.label, description: meta.description },
      { force: options?.force }
    );
    if (result.skipped) skipped += 1;
  }

  for (const line of BUILTIN_LINES) {
    const result = registerFinancialLine(line, { force: options?.force });
    if (result.skipped) skipped += 1;
  }

  builtinsRegistered = true;
  return { statements: statements.size, lines: lines.size, skipped };
}

export function getFinancialStatement(
  type: FinancialStatementType
): FinancialStatementDefinition | null {
  return statements.get(type) ?? null;
}

export function listFinancialStatements(): FinancialStatementDefinition[] {
  return [...statements.values()].map((s) => ({ ...s }));
}

export function getFinancialLine(key: string): FinancialLineDefinition | null {
  const line = lines.get(key);
  return line
    ? { ...line, statementTypes: [...line.statementTypes] }
    : null;
}

export function listFinancialLines(filter?: {
  category?: FinancialLineCategory;
  statementType?: FinancialStatementType;
}): FinancialLineDefinition[] {
  return [...lines.values()]
    .filter((l) => {
      if (filter?.category && l.category !== filter.category) return false;
      if (
        filter?.statementType &&
        !l.statementTypes.includes(filter.statementType)
      ) {
        return false;
      }
      return true;
    })
    .map((l) => ({ ...l, statementTypes: [...l.statementTypes] }));
}

export function resetFinancialRegistry(): void {
  statements.clear();
  lines.clear();
  builtinsRegistered = false;
}
