/**
 * Institutional Earnings Data Engine — public exports (Sprint 9B.1).
 * Single source of truth for earnings-related institutional datasets.
 */

export {
  DEFAULT_EARNINGS_CONFIGURATION,
  resolveEarningsConfiguration,
  ALL_EARNINGS_DATASET_KINDS,
} from "./EarningsConfiguration";

export type {
  EarningsStrictMode,
  EarningsDatasetKind,
  EarningsConfiguration,
  EarningsConfigurationInput,
} from "./EarningsConfiguration";

export {
  registerEarningsDataset,
  registerBuiltinEarningsDatasets,
  getEarningsDataset,
  listEarningsDatasets,
  resetEarningsRegistry,
} from "./EarningsRegistry";

export type { EarningsDatasetDefinition } from "./EarningsRegistry";

export {
  EarningsNormalizer,
  buildPeriodKey,
  normalizeFinancialYear,
} from "./EarningsNormalizer";

export type {
  EarningsQuarter,
  StatementBasis,
  PeriodType,
  EarningsMetadata,
  NormalizedFinancialMetrics,
  NormalizedPeriodRecord,
  NormalizedAnnouncement,
  NormalizedSegmentResult,
  NormalizedDividend,
  RawEarningsInput,
} from "./EarningsNormalizer";

export { EarningsValidator } from "./EarningsValidator";
export type {
  ValidationSeverity,
  EarningsValidationIssue,
  EarningsValidationResult,
} from "./EarningsValidator";

export { EarningsAggregator } from "./EarningsAggregator";
export type {
  AggregationView,
  AggregatedEarningsView,
} from "./EarningsAggregator";

export { EarningsMetricsTracker } from "./EarningsMetrics";
export type { EarningsOperationalMetrics } from "./EarningsMetrics";

export { QuarterlyResultsProvider } from "./QuarterlyResultsProvider";
export type { QuarterlyLoadResult } from "./QuarterlyResultsProvider";

export { AnnualResultsProvider } from "./AnnualResultsProvider";
export type { AnnualLoadResult } from "./AnnualResultsProvider";

export { FinancialStatementProvider } from "./FinancialStatementProvider";
export type {
  FinancialStatementKind,
  StatementLoadResult,
} from "./FinancialStatementProvider";

export { CorporateAnnouncementProvider } from "./CorporateAnnouncementProvider";
export type { AnnouncementLoadResult } from "./CorporateAnnouncementProvider";

export { ShareholdingProvider } from "./ShareholdingProvider";
export type { ShareholdingLoadResult } from "./ShareholdingProvider";

export { SegmentResultsProvider } from "./SegmentResultsProvider";
export type { SegmentLoadResult } from "./SegmentResultsProvider";

export {
  EarningsDataEngine,
  registerEarningsData,
  getEarningsDataEngine,
  resetEarningsDataEngine,
  getQuarterlyResults,
  getAnnualResults,
  getIncomeStatement,
  getBalanceSheet,
  getCashFlow,
  getShareholding,
  getSegmentResults,
  getCorporateAnnouncements,
  getFinancialHistory,
} from "./EarningsDataEngine";

export type {
  EarningsCompanyBundle,
  IngestEarningsInput,
  EarningsQueryOptions,
  EarningsRegistrationResult,
} from "./EarningsDataEngine";
