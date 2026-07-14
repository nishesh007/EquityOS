/**
 * Institutional Financial Statement Parser — public exports (Sprint 9B.2).
 */

export {
  DEFAULT_FINANCIAL_CONFIGURATION,
  resolveFinancialConfiguration,
  UNIT_TO_RAW,
} from "./FinancialConfiguration";

export type {
  FinancialStrictMode,
  FinancialStatementType,
  FinancialUnit,
  ValueQualityFlag,
  FinancialConfiguration,
  FinancialConfigurationInput,
} from "./FinancialConfiguration";

export {
  registerFinancialStatement,
  registerFinancialLine,
  registerBuiltinFinancialCatalog,
  getFinancialStatement,
  listFinancialStatements,
  getFinancialLine,
  listFinancialLines,
  resetFinancialRegistry,
} from "./FinancialRegistry";

export type {
  FinancialLineCategory,
  FinancialLineDefinition,
  FinancialStatementDefinition,
} from "./FinancialRegistry";

export { FinancialLineMapper } from "./FinancialLineMapper";
export type { CanonicalLineKey } from "./FinancialLineMapper";

export {
  FinancialNormalizer,
  parseFinancialNumber,
  normalizeFinancialYear,
  normalizeQuarter,
  normalizeUnit,
} from "./FinancialNormalizer";

export type {
  FinancialQuarter,
  FinancialPeriodMeta,
  NormalizedLineItem,
  NormalizedStatementValues,
} from "./FinancialNormalizer";

export { FinancialValidator } from "./FinancialValidator";
export type {
  FinancialValidationSeverity,
  FinancialValidationIssue,
  FinancialValidationResult,
  StatementValidationInput,
} from "./FinancialValidator";

export {
  FinancialMetricsTracker,
  computeDerivedFields,
} from "./FinancialMetrics";

export type {
  FinancialOperationalMetrics,
  DerivedFinancialFields,
} from "./FinancialMetrics";

export { IncomeStatementParser } from "./IncomeStatementParser";
export type { ParsedIncomeStatement } from "./IncomeStatementParser";

export { BalanceSheetParser } from "./BalanceSheetParser";
export type { ParsedBalanceSheet } from "./BalanceSheetParser";

export { CashFlowParser } from "./CashFlowParser";
export type { ParsedCashFlow } from "./CashFlowParser";

export {
  FinancialStatementParser,
  registerFinancialParser,
  getFinancialStatementParser,
  resetFinancialParser,
  parseIncomeStatement,
  parseBalanceSheet,
  parseCashFlow,
  parseFinancialStatements,
  validateFinancialStatements,
  getFinancialMetrics,
} from "./FinancialStatementParser";

export type {
  ParsedFinancialStatements,
  ParseStatementsInput,
  FinancialParserRegistrationResult,
} from "./FinancialStatementParser";
