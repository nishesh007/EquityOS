/**
 * Institutional Market Data Validation — shared config, helpers, registry, and public API.
 * Registers rules into the existing RuleEngine without modifying its architecture.
 */

import { IntegrityConfig } from "../../IntegrityConfig";
import type { DatasetType } from "../../IntegrityTypes";
import type { RuleValidationOutcome, ValidationContext } from "../../IntegrityTypes";
import { getDataIntegrityEngine } from "../../DataIntegrityEngine";
import type { RuleEngine } from "../RuleEngine";
import type { CreateRuleInput, ExecuteRulesResult } from "../RuleTypes";
import { createPriceValidationRules } from "./PriceValidationRules";
import { createOHLCValidationRules } from "./OHLCValidationRules";
import { createVolumeValidationRules } from "./VolumeValidationRules";
import { createTimestampValidationRules } from "./TimestampValidationRules";
import { createMarketSessionValidationRules } from "./MarketSessionValidationRules";
import { createCircuitLimitRules } from "./CircuitLimitRules";
import { createCorporateActionAdjustmentRules } from "./CorporateActionAdjustmentRules";
import { createGapDetectionRules } from "./GapDetectionRules";
import { createQuoteConsistencyRules } from "./QuoteConsistencyRules";

/** Configurable thresholds — never hardcode market limits in rules. */
export interface MarketValidationConfig {
  supportedCurrencies: string[];
  knownExchanges: string[];
  minPrice: number;
  maxPrice: number;
  maxSpreadPct: number;
  minTickSize: number;
  maxTickSize: number;
  volumeSpikeMultiplier: number;
  maxOvernightGapPct: number;
  maxIntradayGapPct: number;
  flashCrashPct: number;
  extremeJumpPct: number;
  rejectOnGapDetection: boolean;
  allowWeekendCandles: boolean;
  allowZeroVolume: boolean;
  futureTimestampSkewMs: number;
  /** Supported candle intervals in minutes (0 = daily/weekly/monthly session bars). */
  supportedIntervalsMinutes: number[];
  sessionTimezones: Record<string, string>;
  nseRegularOpenMinutes: number;
  nseRegularCloseMinutes: number;
  bseRegularOpenMinutes: number;
  bseRegularCloseMinutes: number;
}

export const DEFAULT_MARKET_VALIDATION_CONFIG: MarketValidationConfig = {
  supportedCurrencies: ["INR", "USD", "EUR", "GBP", "JPY", "HKD", "SGD"],
  knownExchanges: ["NSE", "BSE", "NASDAQ", "NYSE", "AMEX", "NSE_INDEX", "BSE_INDEX"],
  minPrice: 0,
  maxPrice: 1_000_000_000,
  maxSpreadPct: 25,
  minTickSize: 0.0001,
  maxTickSize: 100,
  volumeSpikeMultiplier: 20,
  maxOvernightGapPct: 15,
  maxIntradayGapPct: 8,
  flashCrashPct: 20,
  extremeJumpPct: 35,
  rejectOnGapDetection: false,
  allowWeekendCandles: false,
  allowZeroVolume: true,
  futureTimestampSkewMs: 5 * 60 * 1000,
  supportedIntervalsMinutes: [0, 1, 3, 5, 10, 15, 30, 45, 60, 120, 240, 1440, 10080, 43200],
  sessionTimezones: {
    NSE: "Asia/Kolkata",
    BSE: "Asia/Kolkata",
  },
  nseRegularOpenMinutes: 9 * 60 + 15,
  nseRegularCloseMinutes: 15 * 60 + 30,
  bseRegularOpenMinutes: 9 * 60 + 15,
  bseRegularCloseMinutes: 15 * 60 + 30,
};

export type MarketValidationConfigInput = Partial<MarketValidationConfig>;

export function resolveMarketConfig(
  input?: MarketValidationConfigInput
): MarketValidationConfig {
  return { ...DEFAULT_MARKET_VALIDATION_CONFIG, ...input };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

export function asRows(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(isPlainObject) as Record<string, unknown>[];
  }
  if (!isPlainObject(data)) return [];
  for (const key of ["candles", "items", "data", "quotes", "bars"] as const) {
    if (Array.isArray(data[key])) {
      return (data[key] as unknown[]).filter(isPlainObject) as Record<
        string,
        unknown
      >[];
    }
  }
  return [data];
}

export function parseTimestamp(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
}

export function readTimestamp(row: Record<string, unknown>): number | null {
  return parseTimestamp(
    row.timestamp ?? row.time ?? row.date ?? row.datetime ?? row.ts
  );
}

/** Structured failure with recommendation for institutional reporting. */
export function marketFail(input: {
  message: string;
  recommendation: string;
  field?: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
}): RuleValidationOutcome {
  return {
    passed: false,
    message: `${input.message} Recommendation: ${input.recommendation}`,
    field: input.field,
    path: input.path,
    expected: input.expected,
    actual: input.actual,
  };
}

export function marketPass(): RuleValidationOutcome {
  return { passed: true };
}

export interface MarketValidationMetrics {
  marketDatasetsValidated: number;
  rejectedDatasets: number;
  warningCount: number;
  criticalFailures: number;
  gapDetections: number;
  circuitViolations: number;
  corporateActionMismatches: number;
  averageExecutionTime: number;
  totalExecutionTime: number;
}

const metricsState: MarketValidationMetrics = {
  marketDatasetsValidated: 0,
  rejectedDatasets: 0,
  warningCount: 0,
  criticalFailures: 0,
  gapDetections: 0,
  circuitViolations: 0,
  corporateActionMismatches: 0,
  averageExecutionTime: 0,
  totalExecutionTime: 0,
};

let registered = false;
let activeConfig: MarketValidationConfig = DEFAULT_MARKET_VALIDATION_CONFIG;
const REGISTERED_RULE_IDS = new Set<string>();

export function getMarketValidationMetrics(): MarketValidationMetrics {
  return { ...metricsState };
}

export function resetMarketValidationMetrics(): void {
  metricsState.marketDatasetsValidated = 0;
  metricsState.rejectedDatasets = 0;
  metricsState.warningCount = 0;
  metricsState.criticalFailures = 0;
  metricsState.gapDetections = 0;
  metricsState.circuitViolations = 0;
  metricsState.corporateActionMismatches = 0;
  metricsState.averageExecutionTime = 0;
  metricsState.totalExecutionTime = 0;
}

export function getActiveMarketConfig(): MarketValidationConfig {
  return { ...activeConfig };
}

/** Build the full market rule library for a config snapshot. */
export function buildMarketRules(
  configInput?: MarketValidationConfigInput
): CreateRuleInput[] {
  const config = resolveMarketConfig(configInput);
  return [
    ...createPriceValidationRules(config),
    ...createOHLCValidationRules(config),
    ...createVolumeValidationRules(config),
    ...createTimestampValidationRules(config),
    ...createMarketSessionValidationRules(config),
    ...createCircuitLimitRules(config),
    ...createCorporateActionAdjustmentRules(config),
    ...createGapDetectionRules(config),
    ...createQuoteConsistencyRules(config),
  ];
}

/**
 * Idempotent registration of all institutional market rules.
 * Safe to call multiple times — duplicate IDs are skipped.
 */
export function registerMarketRules(
  options?: {
    engine?: RuleEngine;
    config?: MarketValidationConfigInput;
    force?: boolean;
  }
): { registered: number; skipped: number; total: number } {
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();
  if (options?.config) {
    activeConfig = resolveMarketConfig(options.config);
  }

  if (registered && !options?.force) {
    return {
      registered: 0,
      skipped: REGISTERED_RULE_IDS.size,
      total: REGISTERED_RULE_IDS.size,
    };
  }

  const rules = buildMarketRules(activeConfig);
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

/** Test helper — clears idempotency latch without touching RuleEngine contents. */
export function resetMarketRuleRegistrationState(): void {
  registered = false;
  REGISTERED_RULE_IDS.clear();
  activeConfig = DEFAULT_MARKET_VALIDATION_CONFIG;
}

function recordMetrics(result: ExecuteRulesResult): void {
  metricsState.marketDatasetsValidated += 1;
  metricsState.totalExecutionTime += result.executionTime;
  metricsState.averageExecutionTime =
    Math.round(
      (metricsState.totalExecutionTime / metricsState.marketDatasetsValidated) *
        100
    ) / 100;

  const failed = result.results.filter((r) => !r.passed && !r.skipped);
  const warnings = failed.filter((r) => {
    const rule = r.ruleId;
    return (
      rule.includes("gap.") ||
      rule.includes("volume.spike") ||
      rule.includes("session.weekend")
    );
  });
  metricsState.warningCount += warnings.length;

  const critical = failed.filter((r) => r.scoreImpact >= 40);
  metricsState.criticalFailures += critical.length;

  if (result.failedRules.length > 0 && result.terminatedEarly) {
    metricsState.rejectedDatasets += 1;
  } else if (
    result.failedRules.some(
      (id) =>
        id.startsWith("price.") ||
        id.startsWith("ohlc.") ||
        id.startsWith("circuit.")
    ) &&
    result.results.some((r) => !r.passed && r.scoreImpact >= 10)
  ) {
    // Count as rejected when hard market errors fail
    const hardFails = result.results.filter(
      (r) =>
        !r.passed &&
        !r.skipped &&
        (r.ruleId.startsWith("price.") ||
          r.ruleId.startsWith("ohlc.") ||
          r.ruleId.startsWith("circuit.") ||
          r.ruleId.startsWith("volume.") ||
          r.ruleId.startsWith("timestamp.")) &&
        r.scoreImpact >= 10
    );
    if (hardFails.length > 0) {
      metricsState.rejectedDatasets += 1;
    }
  }

  metricsState.gapDetections += result.results.filter(
    (r) => r.ruleId.startsWith("gap.") && !r.passed && !r.skipped
  ).length;
  metricsState.circuitViolations += result.results.filter(
    (r) => r.ruleId.startsWith("circuit.") && !r.passed && !r.skipped
  ).length;
  metricsState.corporateActionMismatches += result.results.filter(
    (r) => r.ruleId.startsWith("corp.") && !r.passed && !r.skipped
  ).length;
}

async function runMarketValidation(
  data: unknown,
  datasetType: DatasetType,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    rulePrefix?: string | string[];
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  registerMarketRules({ engine: options?.engine });
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();

  const allRules = engine.listRules({ enabled: true });
  const prefixes = Array.isArray(options?.rulePrefix)
    ? options!.rulePrefix!
    : options?.rulePrefix
      ? [options.rulePrefix]
      : [
          "price.",
          "ohlc.",
          "volume.",
          "timestamp.",
          "session.",
          "circuit.",
          "corp.",
          "gap.",
          "quote.",
        ];

  const ruleIds = allRules
    .filter((r) => prefixes.some((p) => r.id.startsWith(p)))
    .map((r) => r.id);

  const result = await engine.executeRules({
    data,
    datasetType,
    dataSource: options?.dataSource ?? "market",
    metadata: {
      ...options?.metadata,
      marketConfig: activeConfig,
    },
    config: new IntegrityConfig({ loggingLevel: "silent" }),
    ruleIds,
  });

  recordMetrics(result);
  return result;
}

/** Validate any market dataset through registered market rules. */
export async function validateMarketData(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runMarketValidation(
    data,
    options?.datasetType ?? inferDatasetType(data),
    options
  );
}

export async function validateOHLC(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runMarketValidation(data, "OHLC_CANDLE", {
    ...options,
    rulePrefix: ["ohlc.", "timestamp.", "session.", "gap.", "volume."],
  });
}

export async function validateQuote(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runMarketValidation(data, "STOCK_QUOTE", {
    ...options,
    rulePrefix: ["price.", "quote.", "circuit.", "volume.", "timestamp."],
  });
}

export async function validateVolume(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runMarketValidation(data, options?.datasetType ?? "OHLC_CANDLE", {
    ...options,
    rulePrefix: ["volume."],
  });
}

export async function validateCorporateAdjustments(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runMarketValidation(data, "CORPORATE_ACTION", {
    ...options,
    rulePrefix: ["corp."],
  });
}

function inferDatasetType(data: unknown): DatasetType {
  if (Array.isArray(data)) return "OHLC_CANDLE";
  if (!isPlainObject(data)) return "STOCK_QUOTE";
  if (data.open !== undefined || data.high !== undefined) return "OHLC_CANDLE";
  if (data.ratio !== undefined || data.exDate !== undefined) {
    return "CORPORATE_ACTION";
  }
  return "STOCK_QUOTE";
}

/** Access config from validation context metadata when present. */
export function configFromContext(
  ctx: ValidationContext
): MarketValidationConfig {
  const fromMeta = ctx.metadata?.marketConfig;
  if (fromMeta && typeof fromMeta === "object") {
    return resolveMarketConfig(fromMeta as MarketValidationConfigInput);
  }
  return getActiveMarketConfig();
}
