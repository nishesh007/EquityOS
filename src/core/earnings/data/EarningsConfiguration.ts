/**
 * Institutional Earnings Data Engine — configuration (Sprint 9B.1).
 */

export type EarningsStrictMode = "strict" | "relaxed";

export type EarningsDatasetKind =
  | "quarterly_results"
  | "annual_results"
  | "standalone_results"
  | "consolidated_results"
  | "income_statement"
  | "balance_sheet"
  | "cash_flow"
  | "shareholding_pattern"
  | "segment_results"
  | "corporate_announcements"
  | "financial_highlights"
  | "dividend_history";

export const ALL_EARNINGS_DATASET_KINDS: readonly EarningsDatasetKind[] = [
  "quarterly_results",
  "annual_results",
  "standalone_results",
  "consolidated_results",
  "income_statement",
  "balance_sheet",
  "cash_flow",
  "shareholding_pattern",
  "segment_results",
  "corporate_announcements",
  "financial_highlights",
  "dividend_history",
] as const;

export interface EarningsConfiguration {
  mode: EarningsStrictMode;
  engineVersion: string;
  cacheTtlMs: number;
  maxCacheEntries: number;
  maxAuditEntries: number;
  institutionalMode: boolean;
  rejectMalformed: boolean;
  allowPartialStatements: boolean;
  defaultCurrency: string;
  integrateTrustEngine: boolean;
  integrateDataIntegrity: boolean;
  integrateValidationPlatform: boolean;
}

export const DEFAULT_EARNINGS_CONFIGURATION: EarningsConfiguration = {
  mode: "strict",
  engineVersion: "9B.1.0",
  cacheTtlMs: 5 * 60 * 1000,
  maxCacheEntries: 2_000,
  maxAuditEntries: 500,
  institutionalMode: true,
  rejectMalformed: true,
  allowPartialStatements: true,
  defaultCurrency: "INR",
  integrateTrustEngine: true,
  integrateDataIntegrity: true,
  integrateValidationPlatform: true,
};

export type EarningsConfigurationInput = Partial<EarningsConfiguration>;

export function resolveEarningsConfiguration(
  input?: EarningsConfigurationInput
): EarningsConfiguration {
  return {
    ...DEFAULT_EARNINGS_CONFIGURATION,
    ...input,
  };
}
