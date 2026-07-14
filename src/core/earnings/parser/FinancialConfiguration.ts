/**
 * Institutional Financial Statement Parser — configuration (Sprint 9B.2).
 */

export type FinancialStrictMode = "strict" | "relaxed";

export type FinancialStatementType =
  | "income_statement"
  | "balance_sheet"
  | "cash_flow";

export type FinancialUnit =
  | "raw"
  | "lakhs"
  | "crores"
  | "millions"
  | "billions";

export type ValueQualityFlag =
  | "MissingData"
  | "EstimatedValue"
  | "RestatedValue"
  | "DerivedValue"
  | "ReportedValue";

export interface FinancialConfiguration {
  mode: FinancialStrictMode;
  engineVersion: string;
  defaultCurrency: string;
  defaultUnit: FinancialUnit;
  decimalPrecision: number;
  balanceSheetTolerance: number;
  cashFlowTolerance: number;
  institutionalMode: boolean;
  allowPartialStatements: boolean;
  integrateEarningsDataEngine: boolean;
  integrateTrustEngine: boolean;
  integrateDataIntegrity: boolean;
  integrateValidationPlatform: boolean;
}

export const DEFAULT_FINANCIAL_CONFIGURATION: FinancialConfiguration = {
  mode: "strict",
  engineVersion: "9B.2.0",
  defaultCurrency: "INR",
  defaultUnit: "crores",
  decimalPrecision: 2,
  balanceSheetTolerance: 0.01,
  cashFlowTolerance: 0.01,
  institutionalMode: true,
  allowPartialStatements: true,
  integrateEarningsDataEngine: true,
  integrateTrustEngine: true,
  integrateDataIntegrity: true,
  integrateValidationPlatform: true,
};

export type FinancialConfigurationInput = Partial<FinancialConfiguration>;

export function resolveFinancialConfiguration(
  input?: FinancialConfigurationInput
): FinancialConfiguration {
  return {
    ...DEFAULT_FINANCIAL_CONFIGURATION,
    ...input,
  };
}

/** Multipliers to convert a unit into absolute (raw) currency units. */
export const UNIT_TO_RAW: Record<FinancialUnit, number> = {
  raw: 1,
  lakhs: 100_000,
  crores: 10_000_000,
  millions: 1_000_000,
  billions: 1_000_000_000,
};
