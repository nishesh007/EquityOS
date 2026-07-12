export type {
  FundamentalsBundle,
  FundamentalsProvider,
  FundamentalsFailoverResult,
  FinancialRatios,
  GrowthMetrics,
  FinancialFundamentals,
  CorporateAction,
  EnrichedQuarterlyResult,
  EnrichedShareholding,
  FinancialStatements,
} from "@/lib/fundamentals/types";

export {
  fetchFundamentalsBundle,
  fetchQuarterlyBundle,
  fetchCorporateActions,
  bundleToCompanyProfile,
  buildFallbackPriceHistory,
  computeFinancialFundamentals,
  enrichCompanyFinancials,
  attachFundamentalsToProfile,
} from "@/lib/fundamentals/engine";
export {
  fetchFundamentalsWithFailover,
  getActiveFundamentalsProviders,
} from "@/lib/fundamentals/failover";

export { loadFundamentalsConfig, isFundamentalsProviderConfigured } from "@/lib/fundamentals/config";

export {
  getCompanyRegistry,
  lookupCompanyRegistry,
  listCompanyRegistrySymbols,
  resetCompanyRegistryCache,
  type CompanyRegistryEntry,
} from "@/lib/fundamentals/company-registry";
export {
  getCompanyMasterRecords,
  getCompanyMasterSnapshot,
  lookupCompanyMaster,
  resetCompanyMasterCache,
  type CompanyMasterRecord,
} from "@/lib/company-master";
export {
  FUNDAMENTALS_METRIC_REGISTRY,
  normalizeScore,
  safeMetric,
  lookupMetric,
  type FundamentalsMetricKey,
  type MetricDefinition,
} from "@/lib/fundamentals/registry";
export {
  isValidNseSymbol,
  normalizeNseSymbol,
  providerSymbolMap,
  toFmpSymbol,
  toAlphaVantageSymbol,
} from "@/lib/fundamentals/symbols";
export { getNseSymbolMeta, listNseRegistrySymbols } from "@/lib/fundamentals/nse-registry";

export {
  searchCompanies,
  resolveSearchQuery,
  preloadCompanySearch,
} from "@/lib/company-master/search";

