/**
 * Institutional AI Recommendation Validation — helpers, registry, public API.
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
  DEFAULT_RECOMMENDATION_VALIDATION_CONFIG,
  resolveRecommendationConfig,
  type RecommendationAction,
  type RecommendationValidationConfig,
  type RecommendationValidationConfigInput,
} from "./RecommendationValidationConfig";
import { createRecommendationConsistencyRules } from "./RecommendationConsistencyRules";
import { createRecommendationConfidenceRules } from "./RecommendationConfidenceRules";
import { createRecommendationReasoningRules } from "./RecommendationReasoningRules";
import { createRecommendationRiskRules } from "./RecommendationRiskRules";
import { createRecommendationConflictRules } from "./RecommendationConflictRules";
import { createRecommendationHistoricalRules } from "./RecommendationHistoricalRules";
import { createRecommendationMarketContextRules } from "./RecommendationMarketContextRules";
import { createRecommendationFundamentalAlignmentRules } from "./RecommendationFundamentalAlignmentRules";
import { createRecommendationTechnicalAlignmentRules } from "./RecommendationTechnicalAlignmentRules";
import { createRecommendationQualityScoreRules } from "./RecommendationQualityScoreRules";
import { createRecommendationAuditRules } from "./RecommendationAuditRules";

export {
  DEFAULT_RECOMMENDATION_VALIDATION_CONFIG,
  resolveRecommendationConfig,
};
export type {
  RecommendationAction,
  RecommendationValidationConfig,
  RecommendationValidationConfigInput,
};

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function recFail(input: {
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

export function recPass(): RuleValidationOutcome {
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

export function normalizeAction(
  value: unknown
): RecommendationAction | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, RecommendationAction> = {
    BUY: "BUY",
    STRONG_BUY: "STRONG_BUY",
    STRONGBUY: "STRONG_BUY",
    ACCUMULATE: "ACCUMULATE",
    HOLD: "HOLD",
    WATCH: "WATCH",
    REDUCE: "REDUCE",
    SELL: "SELL",
    STRONG_SELL: "STRONG_SELL",
    STRONGSELL: "STRONG_SELL",
  };
  return aliases[raw];
}

export function readAction(
  data: Record<string, unknown>
): RecommendationAction | undefined {
  return normalizeAction(
    readString(data, [
      "action",
      "recommendation",
      "signal",
      "call",
      "rating",
    ])
  );
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

export function scoreDirection(
  value: unknown
): "bullish" | "bearish" | "neutral" | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 0) return "bullish";
    if (value < 0) return "bearish";
    return "neutral";
  }
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase();
  if (
    ["bullish", "up", "uptrend", "positive", "buy", "strong_buy", "improving"].includes(
      v
    ) ||
    v.includes("bull")
  ) {
    return "bullish";
  }
  if (
    [
      "bearish",
      "down",
      "downtrend",
      "negative",
      "sell",
      "strong_sell",
      "deteriorating",
    ].includes(v) ||
    v.includes("bear")
  ) {
    return "bearish";
  }
  if (["neutral", "sideways", "flat", "mixed", "hold", "watch"].includes(v)) {
    return "neutral";
  }
  return undefined;
}

export function actionBias(
  action: RecommendationAction,
  config: RecommendationValidationConfig
): "bullish" | "bearish" | "neutral" {
  if (config.bullishActions.includes(action)) return "bullish";
  if (config.bearishActions.includes(action)) return "bearish";
  return "neutral";
}

export function configFromContext(
  ctx: ValidationContext
): RecommendationValidationConfig {
  const fromMeta = ctx.metadata?.recommendationConfig;
  if (fromMeta && typeof fromMeta === "object") {
    return resolveRecommendationConfig(
      fromMeta as RecommendationValidationConfigInput
    );
  }
  return getActiveRecommendationConfig();
}

export interface RecommendationComponentScores {
  technicalAlignment: number;
  fundamentalAlignment: number;
  reasoning: number;
  riskAssessment: number;
  historicalConsistency: number;
  marketContext: number;
}

export interface RecommendationQualityScoreResult {
  score: number;
  components: RecommendationComponentScores;
  rejected: boolean;
  threshold: number;
}

export interface RecommendationAuditEntry {
  recommendation: RecommendationAction | string | undefined;
  timestamp: string;
  validationScore: number;
  qualityScore: number;
  failedRules: string[];
  warnings: string[];
  reviewer: string;
  engineVersion: string;
}

export interface RecommendationValidationMetrics {
  recommendationsValidated: number;
  rejected: number;
  warnings: number;
  averageQualityScore: number;
  averageConfidence: number;
  ruleFailureFrequency: Record<string, number>;
  validationTime: number;
  averageValidationTime: number;
}

const metricsState: RecommendationValidationMetrics = {
  recommendationsValidated: 0,
  rejected: 0,
  warnings: 0,
  averageQualityScore: 0,
  averageConfidence: 0,
  ruleFailureFrequency: {},
  validationTime: 0,
  averageValidationTime: 0,
};

let qualitySum = 0;
let confidenceSum = 0;
let confidenceCount = 0;

const auditLog: RecommendationAuditEntry[] = [];
const ENGINE_VERSION = "9F.6.0";

let registered = false;
let activeConfig: RecommendationValidationConfig =
  DEFAULT_RECOMMENDATION_VALIDATION_CONFIG;
const REGISTERED_RULE_IDS = new Set<string>();

export function getActiveRecommendationConfig(): RecommendationValidationConfig {
  return { ...activeConfig, qualityWeights: { ...activeConfig.qualityWeights } };
}

export function getRecommendationValidationMetrics(): RecommendationValidationMetrics {
  return {
    ...metricsState,
    ruleFailureFrequency: { ...metricsState.ruleFailureFrequency },
  };
}

export function resetRecommendationValidationMetrics(): void {
  metricsState.recommendationsValidated = 0;
  metricsState.rejected = 0;
  metricsState.warnings = 0;
  metricsState.averageQualityScore = 0;
  metricsState.averageConfidence = 0;
  metricsState.ruleFailureFrequency = {};
  metricsState.validationTime = 0;
  metricsState.averageValidationTime = 0;
  qualitySum = 0;
  confidenceSum = 0;
  confidenceCount = 0;
}

export function getRecommendationAuditLog(): RecommendationAuditEntry[] {
  return [...auditLog];
}

export function resetRecommendationAuditLog(): void {
  auditLog.length = 0;
}

export function resetRecommendationRuleRegistrationState(): void {
  registered = false;
  REGISTERED_RULE_IDS.clear();
  activeConfig = DEFAULT_RECOMMENDATION_VALIDATION_CONFIG;
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

function componentFromPresence(
  data: Record<string, unknown>,
  keys: string[],
  baseWhenPresent = 80,
  baseWhenMissing = 40
): number {
  for (const key of keys) {
    if (key in data && hasNonEmptyText(data[key])) return baseWhenPresent;
    if (isPlainObject(data[key])) {
      const score = readNumber(data[key] as Record<string, unknown>, [
        "score",
        "alignment",
        "quality",
      ]);
      if (score !== undefined) return clampScore(score);
      return baseWhenPresent;
    }
  }
  return baseWhenMissing;
}

export function deriveComponentScores(
  data: unknown,
  config: RecommendationValidationConfig = activeConfig
): RecommendationComponentScores {
  if (!isPlainObject(data)) {
    return {
      technicalAlignment: 0,
      fundamentalAlignment: 0,
      reasoning: 0,
      riskAssessment: 0,
      historicalConsistency: 0,
      marketContext: 0,
    };
  }

  const tech = section(data, ["technical", "technicals", "indicators"]);
  const fund = section(data, ["fundamental", "fundamentals"]);
  const market = section(data, ["market", "marketContext", "context"]);
  const hist = section(data, ["historical", "history"]);
  const risk = section(data, ["risk", "riskAssessment"]);

  const techScore =
    readNumber(tech, ["score", "alignment"]) ??
    componentFromPresence(data, ["technical", "technicals", "supportingIndicators"]);

  const fundScore =
    readNumber(fund, ["score", "alignment"]) ??
    componentFromPresence(data, [
      "fundamental",
      "fundamentals",
      "supportingFundamentals",
    ]);

  let reasoningScore = 40;
  if (hasNonEmptyText(data.primaryReason ?? data.reason)) reasoningScore += 20;
  if (hasNonEmptyText(data.supportingFactors)) reasoningScore += 10;
  if (hasNonEmptyText(data.riskFactors)) reasoningScore += 10;
  if (hasNonEmptyText(data.invalidationCriteria)) reasoningScore += 10;
  if (hasNonEmptyText(data.supportingIndicators)) reasoningScore += 5;
  if (hasNonEmptyText(data.supportingFundamentals)) reasoningScore += 5;

  const riskScore =
    readNumber(risk, ["score"]) ??
    (() => {
      let s = 30;
      if (hasNonEmptyText(data.riskLevel ?? risk.riskLevel)) s += 15;
      if (readNumber({ ...data, ...risk }, ["expectedRisk", "downside"]) !== undefined)
        s += 10;
      if (readNumber({ ...data, ...risk }, ["upside"]) !== undefined) s += 10;
      if (readNumber({ ...data, ...risk }, ["riskReward"]) !== undefined) s += 15;
      if (readNumber({ ...data, ...risk }, ["maximumLoss", "maxLoss"]) !== undefined)
        s += 10;
      if (
        hasNonEmptyText(
          data.expectedHoldingPeriod ?? risk.expectedHoldingPeriod
        )
      )
        s += 10;
      return s;
    })();

  const histScore =
    readNumber(hist, ["score", "consistency", "successRate"]) ??
    (isPlainObject(data.previousRecommendation) ||
    isPlainObject(data.historical)
      ? 75
      : 55);

  const marketScore =
    readNumber(market, ["score", "alignment"]) ??
    componentFromPresence(data, ["market", "marketContext"], 75, 45);

  // Penalize explicit conflicts when present
  const action = readAction(data);
  let techAdj = techScore;
  let fundAdj = fundScore;
  if (action) {
    const bias = actionBias(action, config);
    const trend = scoreDirection(
      tech.trend ?? tech.overall ?? data.technicalBias
    );
    if (trend && bias !== "neutral" && trend !== bias && trend !== "neutral") {
      techAdj = Math.min(techAdj, 25);
    }
    const fundDir = scoreDirection(
      fund.outlook ?? fund.improving ?? fund.bias
    );
    if (
      fundDir &&
      bias !== "neutral" &&
      fundDir !== bias &&
      fundDir !== "neutral"
    ) {
      fundAdj = Math.min(fundAdj, 25);
    }
  }

  return {
    technicalAlignment: clampScore(techAdj),
    fundamentalAlignment: clampScore(fundAdj),
    reasoning: clampScore(reasoningScore),
    riskAssessment: clampScore(riskScore),
    historicalConsistency: clampScore(histScore),
    marketContext: clampScore(marketScore),
  };
}

/** Generate Recommendation Quality Score (0–100). */
export function calculateRecommendationQualityScore(
  data: unknown,
  configInput?: RecommendationValidationConfigInput
): RecommendationQualityScoreResult {
  const config = resolveRecommendationConfig(configInput ?? activeConfig);
  const components = deriveComponentScores(data, config);
  const w = config.qualityWeights;
  const score = clampScore(
    components.technicalAlignment * w.technicalAlignment +
      components.fundamentalAlignment * w.fundamentalAlignment +
      components.reasoning * w.reasoning +
      components.riskAssessment * w.riskAssessment +
      components.historicalConsistency * w.historicalConsistency +
      components.marketContext * w.marketContext
  );
  return {
    score,
    components,
    rejected: score < config.minQualityScore,
    threshold: config.minQualityScore,
  };
}

export function appendRecommendationAudit(
  entry: Omit<RecommendationAuditEntry, "engineVersion" | "timestamp"> & {
    timestamp?: string;
    engineVersion?: string;
  }
): RecommendationAuditEntry {
  const full: RecommendationAuditEntry = {
    recommendation: entry.recommendation,
    timestamp: entry.timestamp ?? new Date().toISOString(),
    validationScore: entry.validationScore,
    qualityScore: entry.qualityScore,
    failedRules: entry.failedRules,
    warnings: entry.warnings,
    reviewer: entry.reviewer,
    engineVersion: entry.engineVersion ?? ENGINE_VERSION,
  };
  auditLog.push(full);
  return full;
}

export function buildRecommendationRules(
  configInput?: RecommendationValidationConfigInput
): CreateRuleInput[] {
  const config = resolveRecommendationConfig(configInput);
  return [
    ...createRecommendationConsistencyRules(config),
    ...createRecommendationConfidenceRules(config),
    ...createRecommendationReasoningRules(config),
    ...createRecommendationRiskRules(config),
    ...createRecommendationConflictRules(config),
    ...createRecommendationHistoricalRules(config),
    ...createRecommendationMarketContextRules(config),
    ...createRecommendationFundamentalAlignmentRules(config),
    ...createRecommendationTechnicalAlignmentRules(config),
    ...createRecommendationQualityScoreRules(config),
    ...createRecommendationAuditRules(config),
  ];
}

/** Idempotent registration of all recommendation validation rules. */
export function registerRecommendationRules(options?: {
  engine?: RuleEngine;
  config?: RecommendationValidationConfigInput;
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();
  if (options?.config) {
    activeConfig = resolveRecommendationConfig(options.config);
  }

  if (registered && !options?.force) {
    return {
      registered: 0,
      skipped: REGISTERED_RULE_IDS.size,
      total: REGISTERED_RULE_IDS.size,
    };
  }

  const rules = buildRecommendationRules(activeConfig);
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
  data: unknown,
  engine: RuleEngine
): void {
  metricsState.recommendationsValidated += 1;
  metricsState.validationTime += result.executionTime;
  metricsState.averageValidationTime =
    Math.round(
      (metricsState.validationTime / metricsState.recommendationsValidated) *
        100
    ) / 100;

  if (result.failedRules.length > 0) {
    metricsState.rejected += 1;
  }

  let warningCount = 0;
  for (const r of result.results) {
    if (r.passed || r.skipped) continue;
    metricsState.ruleFailureFrequency[r.ruleId] =
      (metricsState.ruleFailureFrequency[r.ruleId] ?? 0) + 1;
    const def = engine.findRule(r.ruleId);
    if (def?.ruleLevel === "WARNING" || def?.ruleLevel === "INFO") {
      warningCount += 1;
    }
  }
  metricsState.warnings += warningCount;

  const quality = calculateRecommendationQualityScore(data, activeConfig);
  qualitySum += quality.score;
  metricsState.averageQualityScore =
    Math.round(
      (qualitySum / metricsState.recommendationsValidated) * 100
    ) / 100;

  if (isPlainObject(data)) {
    const conf = readNumber(data, ["confidence", "conviction", "score"]);
    if (conf !== undefined) {
      confidenceSum += conf;
      confidenceCount += 1;
      metricsState.averageConfidence =
        Math.round((confidenceSum / confidenceCount) * 100) / 100;
    }
  }
}

async function runRecommendationValidation(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    rulePrefix?: string | string[];
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  registerRecommendationRules({ engine: options?.engine });
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();

  const prefixes = Array.isArray(options?.rulePrefix)
    ? options!.rulePrefix!
    : options?.rulePrefix
      ? [options.rulePrefix]
      : [
          "rec.consistency.",
          "rec.confidence.",
          "rec.reasoning.",
          "rec.risk.",
          "rec.conflict.",
          "rec.historical.",
          "rec.market.",
          "rec.fundamental.",
          "rec.technical.",
          "rec.quality.",
          "rec.audit.",
        ];

  const ruleIds = engine
    .listRules({ enabled: true })
    .filter((r) => prefixes.some((p) => r.id.startsWith(p)))
    .map((r) => r.id);

  const result = await engine.executeRules({
    data,
    datasetType: options?.datasetType ?? "AI_OUTPUT",
    dataSource: options?.dataSource ?? "recommendation",
    metadata: {
      ...options?.metadata,
      recommendationConfig: activeConfig,
    },
    config: new IntegrityConfig({ loggingLevel: "silent" }),
    ruleIds,
  });

  recordMetrics(result, data, engine);

  if (isPlainObject(data)) {
    const quality = calculateRecommendationQualityScore(data, activeConfig);
    const passedCount = result.results.filter((r) => r.passed).length;
    const total = result.results.filter((r) => !r.skipped).length;
    const validationScore =
      total === 0 ? 0 : clampScore((passedCount / total) * 100);
    appendRecommendationAudit({
      recommendation: readAction(data) ?? readString(data, ["action"]),
      validationScore,
      qualityScore: quality.score,
      failedRules: result.failedRules,
      warnings: result.results
        .filter((r) => {
          if (r.passed || r.skipped) return false;
          const def = engine.findRule(r.ruleId);
          return def?.ruleLevel === "WARNING" || def?.ruleLevel === "INFO";
        })
        .map((r) => r.ruleId),
      reviewer:
        readString(data, ["reviewer", "author", "source"]) ??
        "recommendation-engine",
    });
  }

  return result;
}

export async function validateRecommendation(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runRecommendationValidation(data, options);
}

export async function validateRecommendationReasoning(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runRecommendationValidation(data, {
    ...options,
    rulePrefix: ["rec.reasoning."],
  });
}

export async function validateRecommendationConfidence(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runRecommendationValidation(data, {
    ...options,
    rulePrefix: ["rec.confidence."],
  });
}

export async function validateRecommendationAlignment(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runRecommendationValidation(data, {
    ...options,
    rulePrefix: [
      "rec.technical.",
      "rec.fundamental.",
      "rec.market.",
      "rec.conflict.",
    ],
  });
}
