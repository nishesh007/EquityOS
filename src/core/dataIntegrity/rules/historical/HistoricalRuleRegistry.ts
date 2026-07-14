/**
 * Institutional Historical Performance Validation — helpers, registry, public API.
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
import {
  DEFAULT_HISTORICAL_VALIDATION_CONFIG,
  resolveHistoricalConfig,
  resolveHistoricalScoreBand,
  type HistoricalScoreBand,
  type HistoricalValidationConfig,
  type HistoricalValidationConfigInput,
} from "./HistoricalValidationConfig";
import { createRecommendationPerformanceRules } from "./RecommendationPerformanceRules";
import { createTradePerformanceRules } from "./TradePerformanceRules";
import { createPredictionAccuracyRules } from "./PredictionAccuracyRules";
import { createHitRateValidationRules } from "./HitRateValidationRules";
import { createTargetAchievementRules } from "./TargetAchievementRules";
import { createStopLossValidationRules } from "./StopLossValidationRules";
import { createHoldingPeriodRules } from "./HoldingPeriodRules";
import { createRiskRewardPerformanceRules } from "./RiskRewardPerformanceRules";
import { createDrawdownValidationRules } from "./DrawdownValidationRules";
import { createConsistencyValidationRules } from "./ConsistencyValidationRules";
import { createModelDecayRules } from "./ModelDecayRules";
import { createPerformanceScoringRules } from "./PerformanceScoringRules";
import { createHistoricalAuditRules } from "./HistoricalAuditRules";

export {
  DEFAULT_HISTORICAL_VALIDATION_CONFIG,
  resolveHistoricalConfig,
  resolveHistoricalScoreBand,
};
export type {
  HistoricalScoreBand,
  HistoricalValidationConfig,
  HistoricalValidationConfigInput,
};

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function histFail(input: {
  field: string;
  message: string;
  recommendation: string;
  path?: string;
  expected?: unknown;
  actual?: unknown;
}): RuleValidationOutcome {
  return {
    passed: false,
    message: `[${input.field}] ${input.message} Suggested Fix: ${input.recommendation}`,
    field: input.field,
    path: input.path,
    expected: input.expected,
    actual: input.actual,
  };
}

export function histPass(): RuleValidationOutcome {
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

export function hasNonEmptyText(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) {
    return value.some((v) => hasNonEmptyText(v));
  }
  if (isPlainObject(value)) {
    return Object.values(value).some((v) => hasNonEmptyText(v));
  }
  return false;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function configFromContext(
  ctx: ValidationContext
): HistoricalValidationConfig {
  const fromMeta = ctx.metadata?.historicalConfig;
  if (fromMeta && typeof fromMeta === "object") {
    return resolveHistoricalConfig(
      fromMeta as HistoricalValidationConfigInput
    );
  }
  return getActiveHistoricalConfig();
}

/** Unified metrics blob from performance payload (flat or nested). */
export function metricsSection(
  data: Record<string, unknown>
): Record<string, unknown> {
  return section(data, [
    "metrics",
    "performance",
    "historicalMetrics",
    "stats",
  ]);
}

export function sampleSize(data: Record<string, unknown>): number {
  const m = metricsSection(data);
  const fromMetrics = readNumber({ ...data, ...m }, [
    "sampleSize",
    "totalTrades",
    "totalRecommendations",
    "n",
    "count",
  ]);
  if (fromMetrics !== undefined) return fromMetrics;
  const tradeLen = asArray(data.trades).length;
  if (tradeLen > 0) return tradeLen;
  return asArray(data.recommendations).length;
}

export function hasMinSample(
  data: Record<string, unknown>,
  config: HistoricalValidationConfig
): boolean {
  return sampleSize(data) >= config.minSampleSize;
}

export interface HistoricalComponentScores {
  predictionAccuracy: number;
  hitRate: number;
  riskManagement: number;
  consistency: number;
  drawdown: number;
  holdingDiscipline: number;
}

export interface HistoricalScoreResult {
  score: number;
  components: HistoricalComponentScores;
  band: HistoricalScoreBand;
  rejected: boolean;
  threshold: number;
}

export interface ModelDecayResult {
  decaying: boolean;
  alerts: string[];
  hitRateDrop?: number;
  accuracyDrop?: number;
  increasingLosses?: boolean;
}

export interface HistoricalAuditEntry {
  recommendationId: string | undefined;
  tradeId: string | undefined;
  validationTimestamp: string;
  performanceScore: number;
  historicalMetrics: Record<string, unknown>;
  warnings: string[];
  failedRules: string[];
  engineVersion: string;
}

export interface HistoricalValidationMetrics {
  recommendationsAnalysed: number;
  tradesAnalysed: number;
  predictionAccuracy: number;
  historicalScore: number;
  hitRate: number;
  averageReturn: number;
  averageDrawdown: number;
  validationRuntime: number;
  averageValidationRuntime: number;
  ruleFailureFrequency: Record<string, number>;
}

const metricsState: HistoricalValidationMetrics = {
  recommendationsAnalysed: 0,
  tradesAnalysed: 0,
  predictionAccuracy: 0,
  historicalScore: 0,
  hitRate: 0,
  averageReturn: 0,
  averageDrawdown: 0,
  validationRuntime: 0,
  averageValidationRuntime: 0,
  ruleFailureFrequency: {},
};

let scoreSum = 0;
let validatedRuns = 0;
let accuracySum = 0;
let accuracyCount = 0;
let hitRateSum = 0;
let hitRateCount = 0;
let returnSum = 0;
let returnCount = 0;
let drawdownSum = 0;
let drawdownCount = 0;

const auditLog: HistoricalAuditEntry[] = [];
const ENGINE_VERSION = "9F.9.0";

let registered = false;
let activeConfig: HistoricalValidationConfig =
  DEFAULT_HISTORICAL_VALIDATION_CONFIG;
const REGISTERED_RULE_IDS = new Set<string>();

export function getActiveHistoricalConfig(): HistoricalValidationConfig {
  return {
    ...activeConfig,
    scoreWeights: { ...activeConfig.scoreWeights },
    scoreBands: { ...activeConfig.scoreBands },
  };
}

export function getHistoricalValidationMetrics(): HistoricalValidationMetrics {
  return {
    ...metricsState,
    ruleFailureFrequency: { ...metricsState.ruleFailureFrequency },
  };
}

export function resetHistoricalValidationMetrics(): void {
  metricsState.recommendationsAnalysed = 0;
  metricsState.tradesAnalysed = 0;
  metricsState.predictionAccuracy = 0;
  metricsState.historicalScore = 0;
  metricsState.hitRate = 0;
  metricsState.averageReturn = 0;
  metricsState.averageDrawdown = 0;
  metricsState.validationRuntime = 0;
  metricsState.averageValidationRuntime = 0;
  metricsState.ruleFailureFrequency = {};
  scoreSum = 0;
  validatedRuns = 0;
  accuracySum = 0;
  accuracyCount = 0;
  hitRateSum = 0;
  hitRateCount = 0;
  returnSum = 0;
  returnCount = 0;
  drawdownSum = 0;
  drawdownCount = 0;
}

export function getHistoricalAuditLog(): HistoricalAuditEntry[] {
  return [...auditLog];
}

export function resetHistoricalAuditLog(): void {
  auditLog.length = 0;
}

export function resetHistoricalRuleRegistrationState(): void {
  registered = false;
  REGISTERED_RULE_IDS.clear();
  activeConfig = DEFAULT_HISTORICAL_VALIDATION_CONFIG;
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function metricOr(
  data: Record<string, unknown>,
  keys: string[],
  fallback = 0
): number {
  const m = metricsSection(data);
  return readNumber({ ...data, ...m }, keys) ?? fallback;
}

export function deriveHistoricalComponentScores(
  data: unknown,
  config: HistoricalValidationConfig = activeConfig
): HistoricalComponentScores {
  if (!isPlainObject(data)) {
    return {
      predictionAccuracy: 0,
      hitRate: 0,
      riskManagement: 0,
      consistency: 0,
      drawdown: 0,
      holdingDiscipline: 0,
    };
  }

  const m = metricsSection(data);

  const predictionAccuracy = clampScore(
    metricOr(data, [
      "predictionAccuracy",
      "directionAccuracy",
      "accuracy",
    ])
  );

  const hitRate = clampScore(
    metricOr(data, ["hitRate", "overallHitRate", "successRate"])
  );

  let riskManagement = 70;
  const avgRr = readNumber({ ...data, ...m }, [
    "averageRR",
    "actualRR",
    "avgRiskReward",
  ]);
  const avgLoss = readNumber({ ...data, ...m }, [
    "averageLoss",
    "avgLoss",
  ]);
  const falseSl = readNumber({ ...data, ...m }, [
    "falseStopOutRate",
    "falseStopouts",
  ]);
  if (avgRr !== undefined) {
    riskManagement = avgRr >= config.minRiskReward * 1.5 ? 90 : avgRr >= config.minRiskReward ? 75 : 40;
  }
  if (avgLoss !== undefined && avgLoss > config.maxAverageLoss) {
    riskManagement = Math.min(riskManagement, 35);
  }
  if (falseSl !== undefined && falseSl > config.maxFalseStopOutRate) {
    riskManagement = Math.min(riskManagement, 40);
  }
  if (data.poorRiskManagement === true) riskManagement = Math.min(riskManagement, 25);

  let consistency = clampScore(
    metricOr(data, ["consistency", "consistencyScore"], 60)
  );
  if (data.performanceDrift === true || data.abnormalDrift === true) {
    consistency = Math.min(consistency, 30);
  }

  const maxDd = readNumber({ ...data, ...m }, [
    "maximumDrawdown",
    "maxDrawdown",
    "drawdown",
  ]);
  let drawdown = 70;
  if (maxDd !== undefined) {
    if (maxDd <= config.maxDrawdown * 0.4) drawdown = 95;
    else if (maxDd <= config.maxDrawdown * 0.7) drawdown = 80;
    else if (maxDd <= config.maxDrawdown) drawdown = 65;
    else drawdown = 25;
  }
  if (data.excessiveDrawdown === true) drawdown = Math.min(drawdown, 20);

  let holdingDiscipline = 70;
  const early = readNumber({ ...data, ...m }, ["earlyExitPercent", "earlyExitRate"]);
  const late = readNumber({ ...data, ...m }, ["lateExitPercent", "lateExitRate"]);
  if (early !== undefined && early > config.maxEarlyExitRate) holdingDiscipline -= 25;
  if (late !== undefined && late > config.maxLateExitRate) holdingDiscipline -= 25;
  if (
    readNumber({ ...data, ...m }, ["averageHoldingPeriod", "avgHoldingDays"]) !==
    undefined
  ) {
    holdingDiscipline += 10;
  }
  if (data.poorHoldingDiscipline === true) holdingDiscipline = Math.min(holdingDiscipline, 25);

  return {
    predictionAccuracy,
    hitRate,
    riskManagement: clampScore(riskManagement),
    consistency: clampScore(consistency),
    drawdown: clampScore(drawdown),
    holdingDiscipline: clampScore(holdingDiscipline),
  };
}

/** Generate Historical Performance Score (0–100). */
export function calculateHistoricalScore(
  data: unknown,
  configInput?: HistoricalValidationConfigInput
): HistoricalScoreResult {
  const config = resolveHistoricalConfig(configInput ?? activeConfig);
  const components = deriveHistoricalComponentScores(data, config);
  const w = config.scoreWeights;
  const score = clampScore(
    components.predictionAccuracy * w.predictionAccuracy +
      components.hitRate * w.hitRate +
      components.riskManagement * w.riskManagement +
      components.consistency * w.consistency +
      components.drawdown * w.drawdown +
      components.holdingDiscipline * w.holdingDiscipline
  );
  return {
    score,
    components,
    band: resolveHistoricalScoreBand(score, config.scoreBands),
    rejected: score < config.minPerformanceScore,
    threshold: config.minPerformanceScore,
  };
}

/** Detect model decay from rolling / comparative metrics. */
export function detectModelDecay(
  data: unknown,
  configInput?: HistoricalValidationConfigInput
): ModelDecayResult {
  const config = resolveHistoricalConfig(configInput ?? activeConfig);
  if (!isPlainObject(data)) {
    return { decaying: false, alerts: [] };
  }
  const m = metricsSection(data);
  const alerts: string[] = [];

  const currentHit = readNumber({ ...data, ...m }, [
    "hitRate",
    "overallHitRate",
    "currentHitRate",
  ]);
  const priorHit = readNumber({ ...data, ...m }, [
    "previousHitRate",
    "priorHitRate",
    "rollingHitRatePrior",
  ]);
  let hitRateDrop: number | undefined;
  if (currentHit !== undefined && priorHit !== undefined) {
    hitRateDrop = priorHit - currentHit;
    if (hitRateDrop >= config.decayHitRateDrop) {
      alerts.push(`Hit rate dropped ${hitRateDrop.toFixed(1)}pp`);
    }
  }

  const currentAcc = readNumber({ ...data, ...m }, [
    "predictionAccuracy",
    "accuracy",
    "currentAccuracy",
  ]);
  const priorAcc = readNumber({ ...data, ...m }, [
    "previousAccuracy",
    "priorAccuracy",
  ]);
  let accuracyDrop: number | undefined;
  if (currentAcc !== undefined && priorAcc !== undefined) {
    accuracyDrop = priorAcc - currentAcc;
    if (accuracyDrop >= config.decayAccuracyDrop) {
      alerts.push(`Prediction accuracy dropped ${accuracyDrop.toFixed(1)}pp`);
    }
  }

  const currentLoss = readNumber({ ...data, ...m }, [
    "averageLoss",
    "avgLoss",
    "currentAverageLoss",
  ]);
  const priorLoss = readNumber({ ...data, ...m }, [
    "previousAverageLoss",
    "priorAverageLoss",
  ]);
  let increasingLosses = false;
  if (
    currentLoss !== undefined &&
    priorLoss !== undefined &&
    currentLoss > priorLoss * 1.25
  ) {
    increasingLosses = true;
    alerts.push("Average losses increasing");
  }

  if (data.modelDecay === true || data.degrading === true) {
    alerts.push("Explicit model decay flag");
  }
  if (data.sectorDegradation === true) alerts.push("Sector-specific degradation");
  if (data.indicatorDegradation === true) alerts.push("Indicator degradation");
  if (data.recommendationDegradation === true) {
    alerts.push("Recommendation degradation");
  }

  return {
    decaying: alerts.length > 0,
    alerts,
    hitRateDrop,
    accuracyDrop,
    increasingLosses,
  };
}

export function appendHistoricalAudit(
  entry: Omit<HistoricalAuditEntry, "engineVersion" | "validationTimestamp"> & {
    validationTimestamp?: string;
    engineVersion?: string;
  }
): HistoricalAuditEntry {
  const full: HistoricalAuditEntry = {
    recommendationId: entry.recommendationId,
    tradeId: entry.tradeId,
    validationTimestamp:
      entry.validationTimestamp ?? new Date().toISOString(),
    performanceScore: entry.performanceScore,
    historicalMetrics: entry.historicalMetrics,
    warnings: entry.warnings,
    failedRules: entry.failedRules,
    engineVersion: entry.engineVersion ?? ENGINE_VERSION,
  };
  auditLog.push(full);
  return full;
}

export function buildHistoricalRules(
  configInput?: HistoricalValidationConfigInput
): CreateRuleInput[] {
  const config = resolveHistoricalConfig(configInput);
  return [
    ...createRecommendationPerformanceRules(config),
    ...createTradePerformanceRules(config),
    ...createPredictionAccuracyRules(config),
    ...createHitRateValidationRules(config),
    ...createTargetAchievementRules(config),
    ...createStopLossValidationRules(config),
    ...createHoldingPeriodRules(config),
    ...createRiskRewardPerformanceRules(config),
    ...createDrawdownValidationRules(config),
    ...createConsistencyValidationRules(config),
    ...createModelDecayRules(config),
    ...createPerformanceScoringRules(config),
    ...createHistoricalAuditRules(config),
  ];
}

/** Idempotent registration of all historical performance validation rules. */
export function registerHistoricalRules(options?: {
  engine?: RuleEngine;
  config?: HistoricalValidationConfigInput;
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();
  if (options?.config) {
    activeConfig = resolveHistoricalConfig(options.config);
  }

  if (registered && !options?.force) {
    return {
      registered: 0,
      skipped: REGISTERED_RULE_IDS.size,
      total: REGISTERED_RULE_IDS.size,
    };
  }

  const rules = buildHistoricalRules(activeConfig);
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

function recordMetrics(
  result: ExecuteRulesResult,
  data: unknown
): void {
  validatedRuns += 1;
  metricsState.validationRuntime += result.executionTime;
  metricsState.averageValidationRuntime =
    Math.round((metricsState.validationRuntime / validatedRuns) * 100) / 100;

  for (const r of result.results) {
    if (r.passed || r.skipped) continue;
    metricsState.ruleFailureFrequency[r.ruleId] =
      (metricsState.ruleFailureFrequency[r.ruleId] ?? 0) + 1;
  }

  if (!isPlainObject(data)) return;
  const m = metricsSection(data);

  const recCount =
    readNumber({ ...data, ...m }, ["totalRecommendations", "recommendationsAnalysed"]) ??
    asArray(data.recommendations).length;
  const tradeCount =
    readNumber({ ...data, ...m }, ["totalTrades", "tradesAnalysed"]) ??
    asArray(data.trades).length;
  metricsState.recommendationsAnalysed += recCount;
  metricsState.tradesAnalysed += tradeCount;

  const score = calculateHistoricalScore(data, activeConfig);
  scoreSum += score.score;
  metricsState.historicalScore =
    Math.round((scoreSum / validatedRuns) * 100) / 100;

  const acc = readNumber({ ...data, ...m }, [
    "predictionAccuracy",
    "accuracy",
    "directionAccuracy",
  ]);
  if (acc !== undefined) {
    accuracySum += acc;
    accuracyCount += 1;
    metricsState.predictionAccuracy =
      Math.round((accuracySum / accuracyCount) * 100) / 100;
  }

  const hr = readNumber({ ...data, ...m }, ["hitRate", "overallHitRate", "successRate"]);
  if (hr !== undefined) {
    hitRateSum += hr;
    hitRateCount += 1;
    metricsState.hitRate =
      Math.round((hitRateSum / hitRateCount) * 100) / 100;
  }

  const ret = readNumber({ ...data, ...m }, [
    "averageReturn",
    "avgReturn",
    "medianReturn",
  ]);
  if (ret !== undefined) {
    returnSum += ret;
    returnCount += 1;
    metricsState.averageReturn =
      Math.round((returnSum / returnCount) * 100) / 100;
  }

  const dd = readNumber({ ...data, ...m }, [
    "averageDrawdown",
    "avgDrawdown",
    "maximumDrawdown",
    "maxDrawdown",
  ]);
  if (dd !== undefined) {
    drawdownSum += dd;
    drawdownCount += 1;
    metricsState.averageDrawdown =
      Math.round((drawdownSum / drawdownCount) * 100) / 100;
  }
}

async function runHistoricalValidation(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    rulePrefix?: string | string[];
    engine?: RuleEngine;
    appendAudit?: boolean;
  }
): Promise<ExecuteRulesResult> {
  registerHistoricalRules({ engine: options?.engine });
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();

  const prefixes = Array.isArray(options?.rulePrefix)
    ? options!.rulePrefix!
    : options?.rulePrefix
      ? [options.rulePrefix]
      : [
          "hist.rec.",
          "hist.trade.",
          "hist.prediction.",
          "hist.hitrate.",
          "hist.target.",
          "hist.stoploss.",
          "hist.holding.",
          "hist.rr.",
          "hist.drawdown.",
          "hist.consistency.",
          "hist.decay.",
          "hist.score.",
          "hist.audit.",
        ];

  const ruleIds = engine
    .listRules({ enabled: true })
    .filter((r) => prefixes.some((p) => r.id.startsWith(p)))
    .map((r) => r.id);

  const result = await engine.executeRules({
    data,
    datasetType: options?.datasetType ?? "HISTORICAL_DATASET",
    dataSource: options?.dataSource ?? "historical-performance",
    metadata: {
      ...options?.metadata,
      historicalConfig: activeConfig,
    },
    config: new IntegrityConfig({ loggingLevel: "silent" }),
    ruleIds,
  });

  recordMetrics(result, data);

  if (options?.appendAudit !== false && isPlainObject(data)) {
    const score = calculateHistoricalScore(data, activeConfig);
    const m = metricsSection(data);
    appendHistoricalAudit({
      recommendationId: readString(data, [
        "recommendationId",
        "recId",
        "id",
      ]),
      tradeId: readString(data, ["tradeId", "setupId"]),
      performanceScore: score.score,
      historicalMetrics: { ...m },
      failedRules: result.failedRules,
      warnings: result.results
        .filter((r) => {
          if (r.passed || r.skipped) return false;
          const def = engine.findRule(r.ruleId);
          return def?.ruleLevel === "WARNING" || def?.ruleLevel === "INFO";
        })
        .map((r) => r.ruleId),
    });
  }

  return result;
}

export async function validateHistoricalPerformance(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runHistoricalValidation(data, options);
}

export async function validateRecommendationHistory(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runHistoricalValidation(data, {
    ...options,
    rulePrefix: ["hist.rec.", "hist.hitrate.", "hist.prediction."],
    appendAudit: false,
  });
}

export async function validateTradeHistory(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runHistoricalValidation(data, {
    ...options,
    rulePrefix: [
      "hist.trade.",
      "hist.target.",
      "hist.stoploss.",
      "hist.holding.",
      "hist.rr.",
      "hist.drawdown.",
    ],
    appendAudit: false,
  });
}
