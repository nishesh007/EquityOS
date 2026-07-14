/**
 * Institutional Fundamental Data Validation — public exports.
 */

export {
  DEFAULT_FUNDAMENTAL_VALIDATION_CONFIG,
  resolveFundamentalConfig,
  buildFundamentalRules,
  registerFundamentalRules,
  resetFundamentalRuleRegistrationState,
  getFundamentalValidationMetrics,
  resetFundamentalValidationMetrics,
  getActiveFundamentalConfig,
  validateFundamentals,
  validateBalanceSheet,
  validateIncomeStatement,
  validateCashFlow,
  validateFinancialRatios,
  validateTTM,
  validateShareholding,
  configFromContext,
  fundFail,
  fundPass,
  isPlainObject,
  readNumber,
  readString,
  section,
  asPeriods,
} from "./FundamentalRuleRegistry";

export type {
  FundamentalValidationConfig,
  FundamentalValidationConfigInput,
  FundamentalValidationMetrics,
} from "./FundamentalRuleRegistry";

export { createBalanceSheetValidationRules } from "./BalanceSheetValidationRules";
export { createIncomeStatementValidationRules } from "./IncomeStatementValidationRules";
export { createCashFlowValidationRules } from "./CashFlowValidationRules";
export { createRatioValidationRules } from "./RatioValidationRules";
export { createQuarterlyValidationRules } from "./QuarterlyValidationRules";
export { createAnnualValidationRules } from "./AnnualValidationRules";
export { createTTMValidationRules } from "./TTMValidationRules";
export { createGrowthValidationRules } from "./GrowthValidationRules";
export { createProfitabilityValidationRules } from "./ProfitabilityValidationRules";
export { createSolvencyValidationRules } from "./SolvencyValidationRules";
export { createLiquidityValidationRules } from "./LiquidityValidationRules";
export { createShareholdingValidationRules } from "./ShareholdingValidationRules";
export { createCorporateFinancialConsistencyRules } from "./CorporateFinancialConsistencyRules";
export { createFundamentalCrossValidationRules } from "./FundamentalCrossValidationRules";
