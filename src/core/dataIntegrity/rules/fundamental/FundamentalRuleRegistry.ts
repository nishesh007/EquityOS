/**
 * Institutional Fundamental Data Validation — config, helpers, registry, public API.
 * Registers into the existing RuleEngine without modifying engine architecture.
 */

import { IntegrityConfig } from "../../IntegrityConfig";
import type {
  DatasetType,
  RuleValidationOutcome,
  ValidationContext,
} from "../../IntegrityTypes";
import { getDataIntegrityEngine } from "../../DataIntegrityEngine";
import type { RuleEngine } from "../RuleEngine";
import type { CreateRuleInput, ExecuteRulesResult } from "../RuleTypes";
import { createBalanceSheetValidationRules } from "./BalanceSheetValidationRules";
import { createIncomeStatementValidationRules } from "./IncomeStatementValidationRules";
import { createCashFlowValidationRules } from "./CashFlowValidationRules";
import { createRatioValidationRules } from "./RatioValidationRules";
import { createQuarterlyValidationRules } from "./QuarterlyValidationRules";
import { createAnnualValidationRules } from "./AnnualValidationRules";
import { createTTMValidationRules } from "./TTMValidationRules";
import { createGrowthValidationRules } from "./GrowthValidationRules";
import { createProfitabilityValidationRules } from "./ProfitabilityValidationRules";
import { createSolvencyValidationRules } from "./SolvencyValidationRules";
import { createLiquidityValidationRules } from "./LiquidityValidationRules";
import { createShareholdingValidationRules } from "./ShareholdingValidationRules";
import { createCorporateFinancialConsistencyRules } from "./CorporateFinancialConsistencyRules";
import { createFundamentalCrossValidationRules } from "./FundamentalCrossValidationRules";

export interface FundamentalValidationConfig {
  allowNegativeEquity: boolean;
  allowNegativeRevenue: boolean;
  peMin: number;
  peMax: number;
  pbMin: number;
  pbMax: number;
  pegMin: number;
  pegMax: number;
  roeMin: number;
  roeMax: number;
  roceMin: number;
  roceMax: number;
  roaMin: number;
  roaMax: number;
  debtEquityMax: number;
  currentRatioMin: number;
  currentRatioMax: number;
  quickRatioMin: number;
  interestCoverageMin: number;
  dividendYieldMin: number;
  dividendYieldMax: number;
  evEbitdaMin: number;
  evEbitdaMax: number;
  priceSalesMax: number;
  priceCashFlowMax: number;
  maxGrowthPct: number;
  minGrowthPct: number;
  maxCagrPct: number;
  marginMin: number;
  marginMax: number;
  holdingPctTolerance: number;
  revenueSpikeMultiplier: number;
  debtExplosionMultiplier: number;
  marginCollapsePts: number;
  rejectOnOutlierDetection: boolean;
  accountingIdentityTolerance: number;
  epsPatTolerancePct: number;
  cashReconciliationTolerance: number;
}

export const DEFAULT_FUNDAMENTAL_VALIDATION_CONFIG: FundamentalValidationConfig =
  {
    allowNegativeEquity: false,
    allowNegativeRevenue: false,
    peMin: -100,
    peMax: 500,
    pbMin: 0,
    pbMax: 100,
    pegMin: -50,
    pegMax: 50,
    roeMin: -200,
    roeMax: 200,
    roceMin: -200,
    roceMax: 200,
    roaMin: -200,
    roaMax: 200,
    debtEquityMax: 50,
    currentRatioMin: 0,
    currentRatioMax: 50,
    quickRatioMin: 0,
    interestCoverageMin: -100,
    dividendYieldMin: 0,
    dividendYieldMax: 100,
    evEbitdaMin: -50,
    evEbitdaMax: 500,
    priceSalesMax: 500,
    priceCashFlowMax: 500,
    maxGrowthPct: 5000,
    minGrowthPct: -100,
    maxCagrPct: 200,
    marginMin: -200,
    marginMax: 100,
    holdingPctTolerance: 0.5,
    revenueSpikeMultiplier: 5,
    debtExplosionMultiplier: 5,
    marginCollapsePts: 40,
    rejectOnOutlierDetection: false,
    accountingIdentityTolerance: 1e-2,
    epsPatTolerancePct: 5,
    cashReconciliationTolerance: 1,
  };

export type FundamentalValidationConfigInput =
  Partial<FundamentalValidationConfig>;

export function resolveFundamentalConfig(
  input?: FundamentalValidationConfigInput
): FundamentalValidationConfig {
  return { ...DEFAULT_FUNDAMENTAL_VALIDATION_CONFIG, ...input };
}

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function fundFail(input: {
  field: string;
  message: string;
  recommendation: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
}): RuleValidationOutcome {
  return {
    passed: false,
    message: `[${input.field}] ${input.message} Recommendation: ${input.recommendation}`,
    field: input.field,
    path: input.path,
    expected: input.expected,
    actual: input.actual,
  };
}

export function fundPass(): RuleValidationOutcome {
  return { passed: true };
}

export function readNumber(
  obj: Record<string, unknown>,
  keys: string[]
): number | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number") return v;
    if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
      return Number(v);
    }
  }
  return undefined;
}

export function readString(
  obj: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim() !== "") return v.trim();
  }
  return undefined;
}

/** Prefer nested statement sections when present. */
export function section(
  data: unknown,
  keys: string[]
): Record<string, unknown> {
  if (!isPlainObject(data)) return {};
  for (const key of keys) {
    if (isPlainObject(data[key])) return data[key] as Record<string, unknown>;
  }
  return data;
}

export function asPeriods(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(isPlainObject) as Record<string, unknown>[];
  }
  if (!isPlainObject(data)) return [];
  for (const key of [
    "periods",
    "quarters",
    "annuals",
    "statements",
    "history",
    "data",
  ] as const) {
    if (Array.isArray(data[key])) {
      return (data[key] as unknown[]).filter(isPlainObject) as Record<
        string,
        unknown
      >[];
    }
  }
  return [data];
}

export function configFromContext(
  ctx: ValidationContext
): FundamentalValidationConfig {
  const fromMeta = ctx.metadata?.fundamentalConfig;
  if (fromMeta && typeof fromMeta === "object") {
    return resolveFundamentalConfig(
      fromMeta as FundamentalValidationConfigInput
    );
  }
  return getActiveFundamentalConfig();
}

export interface FundamentalValidationMetrics {
  companiesValidated: number;
  statementsValidated: number;
  ratioFailures: number;
  accountingAnomalies: number;
  growthAnomalies: number;
  cashFlowErrors: number;
  executionTime: number;
  averageExecutionTime: number;
}

const metricsState: FundamentalValidationMetrics = {
  companiesValidated: 0,
  statementsValidated: 0,
  ratioFailures: 0,
  accountingAnomalies: 0,
  growthAnomalies: 0,
  cashFlowErrors: 0,
  executionTime: 0,
  averageExecutionTime: 0,
};

let registered = false;
let activeConfig: FundamentalValidationConfig =
  DEFAULT_FUNDAMENTAL_VALIDATION_CONFIG;
const REGISTERED_RULE_IDS = new Set<string>();

export function getActiveFundamentalConfig(): FundamentalValidationConfig {
  return { ...activeConfig };
}

export function getFundamentalValidationMetrics(): FundamentalValidationMetrics {
  return { ...metricsState };
}

export function resetFundamentalValidationMetrics(): void {
  metricsState.companiesValidated = 0;
  metricsState.statementsValidated = 0;
  metricsState.ratioFailures = 0;
  metricsState.accountingAnomalies = 0;
  metricsState.growthAnomalies = 0;
  metricsState.cashFlowErrors = 0;
  metricsState.executionTime = 0;
  metricsState.averageExecutionTime = 0;
}

export function resetFundamentalRuleRegistrationState(): void {
  registered = false;
  REGISTERED_RULE_IDS.clear();
  activeConfig = DEFAULT_FUNDAMENTAL_VALIDATION_CONFIG;
}

export function buildFundamentalRules(
  configInput?: FundamentalValidationConfigInput
): CreateRuleInput[] {
  const config = resolveFundamentalConfig(configInput);
  return [
    ...createBalanceSheetValidationRules(config),
    ...createIncomeStatementValidationRules(config),
    ...createCashFlowValidationRules(config),
    ...createRatioValidationRules(config),
    ...createQuarterlyValidationRules(config),
    ...createAnnualValidationRules(config),
    ...createTTMValidationRules(config),
    ...createGrowthValidationRules(config),
    ...createProfitabilityValidationRules(config),
    ...createSolvencyValidationRules(config),
    ...createLiquidityValidationRules(config),
    ...createShareholdingValidationRules(config),
    ...createCorporateFinancialConsistencyRules(config),
    ...createFundamentalCrossValidationRules(config),
  ];
}

/** Idempotent registration of all fundamental validation rules. */
export function registerFundamentalRules(options?: {
  engine?: RuleEngine;
  config?: FundamentalValidationConfigInput;
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();
  if (options?.config) {
    activeConfig = resolveFundamentalConfig(options.config);
  }

  if (registered && !options?.force) {
    return {
      registered: 0,
      skipped: REGISTERED_RULE_IDS.size,
      total: REGISTERED_RULE_IDS.size,
    };
  }

  const rules = buildFundamentalRules(activeConfig);
  let added = 0;
  let skipped = 0;

  for (const rule of rules) {
    if (REGISTERED_RULE_IDS.has(rule.id) && !options?.force) {
      skipped += 1;
      continue;
    }
    if (engine.findRule(rule.id) && !options?.force) {
      REGISTERED_RULE_IDS.add(rule.id);
      skipped += 1;
      continue;
    }
    engine.registerRule(rule);
    REGISTERED_RULE_IDS.add(rule.id);
    added += 1;
  }

  registered = true;
  return { registered: added, skipped, total: REGISTERED_RULE_IDS.size };
}

function recordMetrics(result: ExecuteRulesResult): void {
  metricsState.companiesValidated += 1;
  metricsState.statementsValidated += 1;
  metricsState.executionTime += result.executionTime;
  metricsState.averageExecutionTime =
    Math.round(
      (metricsState.executionTime / metricsState.companiesValidated) * 100
    ) / 100;

  for (const r of result.results) {
    if (r.passed || r.skipped) continue;
    if (r.ruleId.startsWith("ratio.")) metricsState.ratioFailures += 1;
    if (
      r.ruleId.startsWith("bs.") ||
      r.ruleId.startsWith("is.") ||
      r.ruleId.startsWith("cross.") ||
      r.ruleId.startsWith("corpfin.")
    ) {
      metricsState.accountingAnomalies += 1;
    }
    if (r.ruleId.startsWith("growth.") || r.ruleId.includes("outlier")) {
      metricsState.growthAnomalies += 1;
    }
    if (r.ruleId.startsWith("cf.")) metricsState.cashFlowErrors += 1;
  }
}

async function runFundamentalValidation(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    rulePrefix?: string | string[];
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  registerFundamentalRules({ engine: options?.engine });
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();

  const prefixes = Array.isArray(options?.rulePrefix)
    ? options!.rulePrefix!
    : options?.rulePrefix
      ? [options.rulePrefix]
      : [
          "bs.",
          "is.",
          "cf.",
          "ratio.",
          "qtr.",
          "annual.",
          "ttm.",
          "growth.",
          "profit.",
          "solvency.",
          "liquidity.",
          "holding.",
          "corpfin.",
          "cross.",
          "outlier.",
        ];

  const ruleIds = engine
    .listRules({ enabled: true })
    .filter((r) => prefixes.some((p) => r.id.startsWith(p)))
    .map((r) => r.id);

  const result = await engine.executeRules({
    data,
    datasetType: options?.datasetType ?? "FUNDAMENTAL_DATA",
    dataSource: options?.dataSource ?? "fundamental",
    metadata: {
      ...options?.metadata,
      fundamentalConfig: activeConfig,
    },
    config: new IntegrityConfig({ loggingLevel: "silent" }),
    ruleIds,
  });

  recordMetrics(result);
  return result;
}

export async function validateFundamentals(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runFundamentalValidation(data, options);
}

export async function validateBalanceSheet(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runFundamentalValidation(data, {
    ...options,
    datasetType: "FINANCIAL_STATEMENT",
    rulePrefix: ["bs.", "corpfin."],
  });
}

export async function validateIncomeStatement(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runFundamentalValidation(data, {
    ...options,
    datasetType: "FINANCIAL_STATEMENT",
    rulePrefix: ["is."],
  });
}

export async function validateCashFlow(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runFundamentalValidation(data, {
    ...options,
    datasetType: "FINANCIAL_STATEMENT",
    rulePrefix: ["cf."],
  });
}

export async function validateFinancialRatios(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runFundamentalValidation(data, {
    ...options,
    rulePrefix: ["ratio.", "profit.", "solvency.", "liquidity."],
  });
}

export async function validateTTM(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runFundamentalValidation(data, {
    ...options,
    rulePrefix: ["ttm."],
  });
}

export async function validateShareholding(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runFundamentalValidation(data, {
    ...options,
    rulePrefix: ["holding."],
  });
}
