/**
 * Institutional Technical Indicator Validation — config, helpers, registry, public API.
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
import { createRSIValidationRules } from "./RSIValidationRules";
import { createMACDValidationRules } from "./MACDValidationRules";
import { createMovingAverageValidationRules } from "./MovingAverageValidationRules";
import { createBollingerBandValidationRules } from "./BollingerBandValidationRules";
import { createATRValidationRules } from "./ATRValidationRules";
import { createADXValidationRules } from "./ADXValidationRules";
import { createSupertrendValidationRules } from "./SupertrendValidationRules";
import { createVWAPValidationRules } from "./VWAPValidationRules";
import { createIchimokuValidationRules } from "./IchimokuValidationRules";
import { createMomentumValidationRules } from "./MomentumValidationRules";
import { createVolumeIndicatorValidationRules } from "./VolumeIndicatorValidationRules";
import { createOscillatorValidationRules } from "./OscillatorValidationRules";
import { createIndicatorConsistencyRules } from "./IndicatorConsistencyRules";
import { createIndicatorCrossValidationRules } from "./IndicatorCrossValidationRules";

export interface TechnicalValidationConfig {
  rsiMin: number;
  rsiMax: number;
  rsiExtremeLow: number;
  rsiExtremeHigh: number;
  rsiMaxJump: number;
  rsiMinPeriod: number;
  macdHistogramTolerance: number;
  maMinValue: number;
  maMaxRelativeDivergencePct: number;
  atrMin: number;
  atrSpikeMultiplier: number;
  adxMin: number;
  adxMax: number;
  williamsMin: number;
  williamsMax: number;
  stochasticMin: number;
  stochasticMax: number;
  mfiMin: number;
  mfiMax: number;
  cciAbsWarn: number;
  frozenRepeatCount: number;
  supportedTimeframesMinutes: number[];
  vwapMaxDeviationFromPricePct: number;
  bollingerMinWidth: number;
  crossRsiStochDisagreement: number;
  rejectOnCriticalOnly: boolean;
}

export const DEFAULT_TECHNICAL_VALIDATION_CONFIG: TechnicalValidationConfig = {
  rsiMin: 0,
  rsiMax: 100,
  rsiExtremeLow: 5,
  rsiExtremeHigh: 95,
  rsiMaxJump: 40,
  rsiMinPeriod: 2,
  macdHistogramTolerance: 1e-6,
  maMinValue: 0,
  maMaxRelativeDivergencePct: 25,
  atrMin: 0,
  atrSpikeMultiplier: 15,
  adxMin: 0,
  adxMax: 100,
  williamsMin: -100,
  williamsMax: 0,
  stochasticMin: 0,
  stochasticMax: 100,
  mfiMin: 0,
  mfiMax: 100,
  cciAbsWarn: 300,
  frozenRepeatCount: 8,
  supportedTimeframesMinutes: [
    1, 3, 5, 10, 15, 30, 60, 120, 240, 1440, 10080, 43200,
  ],
  vwapMaxDeviationFromPricePct: 20,
  bollingerMinWidth: 0,
  crossRsiStochDisagreement: 40,
  rejectOnCriticalOnly: true,
};

export type TechnicalValidationConfigInput = Partial<TechnicalValidationConfig>;

export function resolveTechnicalConfig(
  input?: TechnicalValidationConfigInput
): TechnicalValidationConfig {
  return { ...DEFAULT_TECHNICAL_VALIDATION_CONFIG, ...input };
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function techFail(input: {
  indicator: string;
  message: string;
  recommendation: string;
  field?: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
}): RuleValidationOutcome {
  return {
    passed: false,
    message: `[${input.indicator}] ${input.message} Recommendation: ${input.recommendation}`,
    field: input.field ?? input.indicator,
    path: input.path,
    expected: input.expected,
    actual: input.actual,
  };
}

export function techPass(): RuleValidationOutcome {
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

/** Flatten nested indicator payloads: { values }, { indicators }, or root. */
export function indicatorSource(data: unknown): Record<string, unknown> {
  if (!isPlainObject(data)) return {};
  if (isPlainObject(data.values)) return data.values as Record<string, unknown>;
  if (isPlainObject(data.indicators)) {
    return data.indicators as Record<string, unknown>;
  }
  return data;
}

export function asSeries(data: unknown, key?: string): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter(isPlainObject) as Record<string, unknown>[];
  }
  if (!isPlainObject(data)) return [];
  if (key && Array.isArray(data[key])) {
    return (data[key] as unknown[]).filter(isPlainObject) as Record<
      string,
      unknown
    >[];
  }
  for (const k of ["series", "values", "data", "points", "history"] as const) {
    if (Array.isArray(data[k])) {
      const arr = data[k] as unknown[];
      if (arr.every((x) => typeof x === "number")) {
        return (arr as number[]).map((v) => ({ value: v }));
      }
      return arr.filter(isPlainObject) as Record<string, unknown>[];
    }
  }
  return [data];
}

export function readIndicatorNumber(
  data: unknown,
  keys: string[]
): number | undefined {
  const src = indicatorSource(data);
  const direct = readNumber(src, keys);
  if (direct !== undefined) return direct;
  if (isPlainObject(data)) {
    return readNumber(data, keys);
  }
  return undefined;
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function detectFrozenValues(
  values: number[],
  repeatCount: number
): boolean {
  if (values.length < repeatCount) return false;
  const slice = values.slice(-repeatCount);
  return slice.every((v) => v === slice[0]);
}

export function maxJump(values: number[]): number {
  let max = 0;
  for (let i = 1; i < values.length; i++) {
    max = Math.max(max, Math.abs(values[i] - values[i - 1]));
  }
  return max;
}

export function configFromContext(
  ctx: ValidationContext
): TechnicalValidationConfig {
  const fromMeta = ctx.metadata?.technicalConfig;
  if (fromMeta && typeof fromMeta === "object") {
    return resolveTechnicalConfig(fromMeta as TechnicalValidationConfigInput);
  }
  return getActiveTechnicalConfig();
}

export interface TechnicalValidationMetrics {
  indicatorsValidated: number;
  failedIndicators: number;
  warnings: number;
  criticalFailures: number;
  averageRuntime: number;
  totalRuntime: number;
  perIndicator: Record<
    string,
    { runs: number; failures: number; warnings: number }
  >;
}

const metricsState: TechnicalValidationMetrics = {
  indicatorsValidated: 0,
  failedIndicators: 0,
  warnings: 0,
  criticalFailures: 0,
  averageRuntime: 0,
  totalRuntime: 0,
  perIndicator: {},
};

let registered = false;
let activeConfig: TechnicalValidationConfig = DEFAULT_TECHNICAL_VALIDATION_CONFIG;
const REGISTERED_RULE_IDS = new Set<string>();

export function getActiveTechnicalConfig(): TechnicalValidationConfig {
  return { ...activeConfig };
}

export function getTechnicalValidationMetrics(): TechnicalValidationMetrics {
  return {
    ...metricsState,
    perIndicator: { ...metricsState.perIndicator },
  };
}

export function resetTechnicalValidationMetrics(): void {
  metricsState.indicatorsValidated = 0;
  metricsState.failedIndicators = 0;
  metricsState.warnings = 0;
  metricsState.criticalFailures = 0;
  metricsState.averageRuntime = 0;
  metricsState.totalRuntime = 0;
  metricsState.perIndicator = {};
}

export function resetTechnicalRuleRegistrationState(): void {
  registered = false;
  REGISTERED_RULE_IDS.clear();
  activeConfig = DEFAULT_TECHNICAL_VALIDATION_CONFIG;
}

export function buildTechnicalRules(
  configInput?: TechnicalValidationConfigInput
): CreateRuleInput[] {
  const config = resolveTechnicalConfig(configInput);
  return [
    ...createRSIValidationRules(config),
    ...createMACDValidationRules(config),
    ...createMovingAverageValidationRules(config),
    ...createBollingerBandValidationRules(config),
    ...createATRValidationRules(config),
    ...createADXValidationRules(config),
    ...createSupertrendValidationRules(config),
    ...createVWAPValidationRules(config),
    ...createIchimokuValidationRules(config),
    ...createMomentumValidationRules(config),
    ...createVolumeIndicatorValidationRules(config),
    ...createOscillatorValidationRules(config),
    ...createIndicatorConsistencyRules(config),
    ...createIndicatorCrossValidationRules(config),
  ];
}

/** Idempotent registration of all technical indicator validation rules. */
export function registerTechnicalRules(options?: {
  engine?: RuleEngine;
  config?: TechnicalValidationConfigInput;
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();
  if (options?.config) {
    activeConfig = resolveTechnicalConfig(options.config);
  }

  if (registered && !options?.force) {
    return {
      registered: 0,
      skipped: REGISTERED_RULE_IDS.size,
      total: REGISTERED_RULE_IDS.size,
    };
  }

  const rules = buildTechnicalRules(activeConfig);
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
  metricsState.indicatorsValidated += 1;
  metricsState.totalRuntime += result.executionTime;
  metricsState.averageRuntime =
    Math.round(
      (metricsState.totalRuntime / metricsState.indicatorsValidated) * 100
    ) / 100;

  const failed = result.results.filter((r) => !r.passed && !r.skipped);
  if (failed.length > 0) metricsState.failedIndicators += 1;

  for (const r of failed) {
    const indicator = r.ruleId.split(".")[0] ?? "unknown";
    const bucket = metricsState.perIndicator[indicator] ?? {
      runs: 0,
      failures: 0,
      warnings: 0,
    };
    bucket.runs += 1;
    bucket.failures += 1;
    if (r.scoreImpact > 0 && r.scoreImpact < 10) {
      bucket.warnings += 1;
      metricsState.warnings += 1;
    }
    if (r.scoreImpact >= 40) {
      metricsState.criticalFailures += 1;
    }
    metricsState.perIndicator[indicator] = bucket;
  }
}

async function runTechnicalValidation(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    rulePrefix?: string | string[];
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  registerTechnicalRules({ engine: options?.engine });
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();

  const prefixes = Array.isArray(options?.rulePrefix)
    ? options!.rulePrefix!
    : options?.rulePrefix
      ? [options.rulePrefix]
      : [
          "rsi.",
          "macd.",
          "ma.",
          "bb.",
          "atr.",
          "adx.",
          "supertrend.",
          "vwap.",
          "ichimoku.",
          "momentum.",
          "volind.",
          "osc.",
          "ind.",
          "cross.",
        ];

  const ruleIds = engine
    .listRules({ enabled: true })
    .filter((r) => prefixes.some((p) => r.id.startsWith(p)))
    .map((r) => r.id);

  const result = await engine.executeRules({
    data,
    datasetType: options?.datasetType ?? "TECHNICAL_INDICATOR",
    dataSource: options?.dataSource ?? "technical",
    metadata: {
      ...options?.metadata,
      technicalConfig: activeConfig,
    },
    config: new IntegrityConfig({ loggingLevel: "silent" }),
    ruleIds,
  });

  recordMetrics(result);
  return result;
}

export async function validateTechnicalIndicators(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTechnicalValidation(data, options);
}

export async function validateRSI(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTechnicalValidation(data, { ...options, rulePrefix: ["rsi."] });
}

export async function validateMACD(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTechnicalValidation(data, { ...options, rulePrefix: ["macd."] });
}

export async function validateMovingAverages(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTechnicalValidation(data, { ...options, rulePrefix: ["ma."] });
}

export async function validateBollingerBands(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTechnicalValidation(data, { ...options, rulePrefix: ["bb."] });
}

export async function validateADX(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTechnicalValidation(data, { ...options, rulePrefix: ["adx."] });
}

export async function validateATR(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTechnicalValidation(data, { ...options, rulePrefix: ["atr."] });
}

export async function validateVWAP(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTechnicalValidation(data, { ...options, rulePrefix: ["vwap."] });
}

export async function validateIchimoku(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTechnicalValidation(data, {
    ...options,
    rulePrefix: ["ichimoku."],
  });
}
