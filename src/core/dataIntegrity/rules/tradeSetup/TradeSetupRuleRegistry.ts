/**
 * Institutional Trade Setup Validation — helpers, registry, public API.
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
  DEFAULT_TRADE_SETUP_VALIDATION_CONFIG,
  resolveTradeSetupConfig,
  type TradeLifecycleStatus,
  type TradeSide,
  type TradeSetupValidationConfig,
  type TradeSetupValidationConfigInput,
  type TradeType,
} from "./TradeSetupValidationConfig";
import { createEntryValidationRules } from "./EntryValidationRules";
import { createStopLossValidationRules } from "./StopLossValidationRules";
import { createTargetValidationRules } from "./TargetValidationRules";
import { createRiskRewardValidationRules } from "./RiskRewardValidationRules";
import { createPositionSizingValidationRules } from "./PositionSizingValidationRules";
import { createVolatilityValidationRules } from "./VolatilityValidationRules";
import { createSupportResistanceValidationRules } from "./SupportResistanceValidationRules";
import { createTrendAlignmentValidationRules } from "./TrendAlignmentValidationRules";
import { createTradeLifecycleRules } from "./TradeLifecycleRules";
import { createTradeSetupConsistencyRules } from "./TradeSetupConsistencyRules";
import { createTradeSetupQualityRules } from "./TradeSetupQualityRules";
import { createTradeSetupAuditRules } from "./TradeSetupAuditRules";

export {
  DEFAULT_TRADE_SETUP_VALIDATION_CONFIG,
  resolveTradeSetupConfig,
};
export type {
  TradeLifecycleStatus,
  TradeSide,
  TradeSetupValidationConfig,
  TradeSetupValidationConfigInput,
  TradeType,
};

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function tsFail(input: {
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

export function tsPass(): RuleValidationOutcome {
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

export function normalizeSide(value: unknown): TradeSide | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (raw === "LONG" || raw === "BUY" || raw === "BULLISH") return "LONG";
  if (raw === "SHORT" || raw === "SELL" || raw === "BEARISH") return "SHORT";
  return undefined;
}

export function readSide(data: Record<string, unknown>): TradeSide | undefined {
  return normalizeSide(
    readString(data, ["side", "direction", "tradeSide", "positionSide"])
  );
}

export function normalizeTradeType(value: unknown): TradeType | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, TradeType> = {
    INTRADAY: "INTRADAY",
    DAY: "INTRADAY",
    DAY_TRADE: "INTRADAY",
    SWING: "SWING",
    POSITIONAL: "POSITIONAL",
    POSITION: "POSITIONAL",
    INVESTMENT: "INVESTMENT",
    LONG_TERM: "INVESTMENT",
  };
  return aliases[raw];
}

export function readTradeType(
  data: Record<string, unknown>
): TradeType | undefined {
  return normalizeTradeType(
    readString(data, ["tradeType", "horizon", "style", "timeframe"])
  );
}

export function normalizeLifecycleStatus(
  value: unknown
): TradeLifecycleStatus | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, TradeLifecycleStatus> = {
    CREATED: "CREATED",
    NEW: "CREATED",
    ACTIVE: "ACTIVE",
    OPEN: "ACTIVE",
    TARGET_HIT: "TARGET_HIT",
    TARGETHIT: "TARGET_HIT",
    STOP_HIT: "STOP_HIT",
    STOPHIT: "STOP_HIT",
    STOPPED: "STOP_HIT",
    EXPIRED: "EXPIRED",
    CANCELLED: "CANCELLED",
    CANCELED: "CANCELLED",
    REVALIDATED: "REVALIDATED",
    ARCHIVED: "ARCHIVED",
  };
  return aliases[raw];
}

export function readLifecycleStatus(
  data: Record<string, unknown>
): TradeLifecycleStatus | undefined {
  return normalizeLifecycleStatus(
    readString(data, ["status", "lifecycle", "lifecycleStatus", "state"])
  );
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
    ["bullish", "up", "uptrend", "positive", "long", "buy"].includes(v) ||
    v.includes("bull")
  ) {
    return "bullish";
  }
  if (
    ["bearish", "down", "downtrend", "negative", "short", "sell"].includes(v) ||
    v.includes("bear")
  ) {
    return "bearish";
  }
  if (["neutral", "sideways", "flat", "mixed"].includes(v)) {
    return "neutral";
  }
  return undefined;
}

export function isFinitePositive(value: number | undefined): boolean {
  return value !== undefined && Number.isFinite(value) && value > 0;
}

export function isFiniteNumber(value: number | undefined): boolean {
  return value !== undefined && Number.isFinite(value) && !Number.isNaN(value);
}

/** Resolve entry / stop / targets from flat or nested trade setup payloads. */
export function readTradeLevels(data: Record<string, unknown>): {
  entry: number | undefined;
  stopLoss: number | undefined;
  primaryTarget: number | undefined;
  secondaryTarget: number | undefined;
  finalTarget: number | undefined;
  currentPrice: number | undefined;
} {
  const nested = section(data, ["setup", "tradeSetup", "levels", "prices"]);
  const src = { ...data, ...nested };
  const targets = section(src, ["targets", "target"]);

  return {
    entry: readNumber(src, ["entry", "entryPrice", "entry_price"]),
    stopLoss: readNumber(src, [
      "stopLoss",
      "stop",
      "sl",
      "stop_loss",
      "stopPrice",
    ]),
    primaryTarget:
      readNumber(targets, ["primary", "primaryTarget", "t1", "target1"]) ??
      readNumber(src, ["primaryTarget", "target1", "target", "targetPrice"]),
    secondaryTarget:
      readNumber(targets, ["secondary", "secondaryTarget", "t2", "target2"]) ??
      readNumber(src, ["secondaryTarget", "target2"]),
    finalTarget:
      readNumber(targets, ["final", "finalTarget", "t3", "target3"]) ??
      readNumber(src, ["finalTarget", "target3"]),
    currentPrice: readNumber(src, [
      "currentPrice",
      "ltp",
      "last",
      "marketPrice",
      "price",
    ]),
  };
}

export interface RiskRewardMetrics {
  absoluteRisk: number;
  absoluteReward: number;
  riskPercent: number;
  rewardPercent: number;
  riskRewardRatio: number;
}

/** Calculate absolute risk/reward and RR ratio for a setup. */
export function calculateRiskReward(
  data: unknown
): RiskRewardMetrics | undefined {
  if (!isPlainObject(data)) return undefined;
  const levels = readTradeLevels(data);
  const side = readSide(data) ?? "LONG";
  const { entry, stopLoss, primaryTarget } = levels;
  if (
    !isFinitePositive(entry) ||
    !isFinitePositive(stopLoss) ||
    !isFinitePositive(primaryTarget)
  ) {
    return undefined;
  }

  const absoluteRisk =
    side === "LONG"
      ? Math.abs(entry! - stopLoss!)
      : Math.abs(stopLoss! - entry!);
  const absoluteReward =
    side === "LONG"
      ? Math.abs(primaryTarget! - entry!)
      : Math.abs(entry! - primaryTarget!);

  if (absoluteRisk <= 0) return undefined;

  return {
    absoluteRisk,
    absoluteReward,
    riskPercent: (absoluteRisk / entry!) * 100,
    rewardPercent: (absoluteReward / entry!) * 100,
    riskRewardRatio: absoluteReward / absoluteRisk,
  };
}

export function configFromContext(
  ctx: ValidationContext
): TradeSetupValidationConfig {
  const fromMeta = ctx.metadata?.tradeSetupConfig;
  if (fromMeta && typeof fromMeta === "object") {
    return resolveTradeSetupConfig(fromMeta as TradeSetupValidationConfigInput);
  }
  return getActiveTradeSetupConfig();
}

export interface TradeSetupComponentScores {
  technicalAlignment: number;
  riskReward: number;
  trendAlignment: number;
  supportResistance: number;
  volatility: number;
  dataQuality: number;
}

export interface TradeSetupQualityScoreResult {
  score: number;
  components: TradeSetupComponentScores;
  rejected: boolean;
  threshold: number;
}

export interface TradeSetupAuditEntry {
  setupId: string | undefined;
  entry: number | undefined;
  stopLoss: number | undefined;
  targets: {
    primary?: number;
    secondary?: number;
    final?: number;
  };
  risk: number | undefined;
  reward: number | undefined;
  qualityScore: number;
  validationTime: string;
  failedRules: string[];
  warnings: string[];
  engineVersion: string;
}

export interface TradeSetupValidationMetrics {
  tradeSetupsValidated: number;
  rejectedSetups: number;
  averageRR: number;
  averageQualityScore: number;
  riskViolations: number;
  trendViolations: number;
  validationRuntime: number;
  averageValidationRuntime: number;
  ruleFailureFrequency: Record<string, number>;
}

const metricsState: TradeSetupValidationMetrics = {
  tradeSetupsValidated: 0,
  rejectedSetups: 0,
  averageRR: 0,
  averageQualityScore: 0,
  riskViolations: 0,
  trendViolations: 0,
  validationRuntime: 0,
  averageValidationRuntime: 0,
  ruleFailureFrequency: {},
};

let qualitySum = 0;
let rrSum = 0;
let rrCount = 0;

const auditLog: TradeSetupAuditEntry[] = [];
const ENGINE_VERSION = "9F.7.0";

let registered = false;
let activeConfig: TradeSetupValidationConfig =
  DEFAULT_TRADE_SETUP_VALIDATION_CONFIG;
const REGISTERED_RULE_IDS = new Set<string>();

export function getActiveTradeSetupConfig(): TradeSetupValidationConfig {
  return {
    ...activeConfig,
    qualityWeights: { ...activeConfig.qualityWeights },
  };
}

export function getTradeSetupValidationMetrics(): TradeSetupValidationMetrics {
  return {
    ...metricsState,
    ruleFailureFrequency: { ...metricsState.ruleFailureFrequency },
  };
}

export function resetTradeSetupValidationMetrics(): void {
  metricsState.tradeSetupsValidated = 0;
  metricsState.rejectedSetups = 0;
  metricsState.averageRR = 0;
  metricsState.averageQualityScore = 0;
  metricsState.riskViolations = 0;
  metricsState.trendViolations = 0;
  metricsState.validationRuntime = 0;
  metricsState.averageValidationRuntime = 0;
  metricsState.ruleFailureFrequency = {};
  qualitySum = 0;
  rrSum = 0;
  rrCount = 0;
}

export function getTradeSetupAuditLog(): TradeSetupAuditEntry[] {
  return [...auditLog];
}

export function resetTradeSetupAuditLog(): void {
  auditLog.length = 0;
}

export function resetTradeSetupRuleRegistrationState(): void {
  registered = false;
  REGISTERED_RULE_IDS.clear();
  activeConfig = DEFAULT_TRADE_SETUP_VALIDATION_CONFIG;
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

export function deriveTradeSetupComponentScores(
  data: unknown,
  config: TradeSetupValidationConfig = activeConfig
): TradeSetupComponentScores {
  if (!isPlainObject(data)) {
    return {
      technicalAlignment: 0,
      riskReward: 0,
      trendAlignment: 0,
      supportResistance: 0,
      volatility: 0,
      dataQuality: 0,
    };
  }

  const tech = section(data, ["technical", "technicals", "indicators"]);
  const trend = section(data, ["trend", "trendAlignment"]);
  const sr = section(data, ["supportResistance", "levels"]);
  const vol = section(data, ["volatility", "risk"]);
  const side = readSide(data) ?? "LONG";
  const levels = readTradeLevels(data);
  const rr = calculateRiskReward(data);

  const techScore =
    readNumber(tech, ["score", "alignment"]) ??
    componentFromPresence(data, ["technical", "technicals", "indicators"]);

  let rrScore = 40;
  if (rr) {
    if (rr.riskRewardRatio >= config.minRiskReward) rrScore = 70;
    if (rr.riskRewardRatio >= config.minRiskReward * 1.5) rrScore = 85;
    if (rr.riskRewardRatio >= config.minRiskReward * 2) rrScore = 95;
    if (rr.riskRewardRatio > config.maxRiskReward) rrScore = 20;
    if (rr.riskPercent > config.maxRiskPercent) rrScore = Math.min(rrScore, 30);
  }

  let trendScore =
    readNumber(trend, ["score", "alignment"]) ??
    componentFromPresence(data, ["trend", "trendAlignment", "marketTrend"], 75, 45);
  const marketTrend = scoreDirection(
    trend.marketTrend ?? data.marketTrend ?? tech.trend
  );
  if (
    marketTrend &&
    ((side === "LONG" && marketTrend === "bearish") ||
      (side === "SHORT" && marketTrend === "bullish"))
  ) {
    trendScore = Math.min(trendScore, 25);
  }

  let srScore =
    readNumber(sr, ["score", "alignment"]) ??
    (() => {
      let s = 40;
      const support = readNumber(
        { ...data, ...sr },
        ["support", "supportLevel"]
      );
      const resistance = readNumber(
        { ...data, ...sr },
        ["resistance", "resistanceLevel"]
      );
      if (support !== undefined) s += 20;
      if (resistance !== undefined) s += 20;
      if (
        levels.entry !== undefined &&
        support !== undefined &&
        side === "LONG" &&
        levels.entry >= support
      ) {
        s += 10;
      }
      if (
        levels.primaryTarget !== undefined &&
        resistance !== undefined &&
        side === "LONG" &&
        levels.primaryTarget <= resistance * 1.02
      ) {
        s += 10;
      }
      return s;
    })();

  let volScore =
    readNumber(vol, ["score"]) ??
    (() => {
      let s = 70;
      const atrPct = readNumber({ ...data, ...vol }, ["atrPercent", "atrPct"]);
      const hv = readNumber(
        { ...data, ...vol },
        ["historicalVolatility", "hv", "volatility"]
      );
      const beta = readNumber({ ...data, ...vol }, ["beta"]);
      if (atrPct !== undefined && atrPct > config.maxAtrPercent) s -= 25;
      if (hv !== undefined && hv > config.maxHistoricalVolatility) s -= 25;
      if (beta !== undefined && beta > config.maxBeta) s -= 15;
      return s;
    })();

  let dataQuality = 30;
  if (isFinitePositive(levels.entry)) dataQuality += 15;
  if (isFinitePositive(levels.stopLoss)) dataQuality += 15;
  if (isFinitePositive(levels.primaryTarget)) dataQuality += 15;
  if (readSide(data)) dataQuality += 10;
  if (hasNonEmptyText(data.setupId ?? data.id)) dataQuality += 5;
  if (data.timestamp ?? data.ts ?? data.createdAt) dataQuality += 5;
  if (hasNonEmptyText(data.exchange)) dataQuality += 5;

  return {
    technicalAlignment: clampScore(techScore),
    riskReward: clampScore(rrScore),
    trendAlignment: clampScore(trendScore),
    supportResistance: clampScore(srScore),
    volatility: clampScore(volScore),
    dataQuality: clampScore(dataQuality),
  };
}

/** Generate Trade Setup Quality Score (0–100). */
export function calculateTradeSetupQuality(
  data: unknown,
  configInput?: TradeSetupValidationConfigInput
): TradeSetupQualityScoreResult {
  const config = resolveTradeSetupConfig(configInput ?? activeConfig);
  const components = deriveTradeSetupComponentScores(data, config);
  const w = config.qualityWeights;
  const score = clampScore(
    components.technicalAlignment * w.technicalAlignment +
      components.riskReward * w.riskReward +
      components.trendAlignment * w.trendAlignment +
      components.supportResistance * w.supportResistance +
      components.volatility * w.volatility +
      components.dataQuality * w.dataQuality
  );
  return {
    score,
    components,
    rejected: score < config.minQualityScore,
    threshold: config.minQualityScore,
  };
}

export function appendTradeSetupAudit(
  entry: Omit<TradeSetupAuditEntry, "engineVersion" | "validationTime"> & {
    validationTime?: string;
    engineVersion?: string;
  }
): TradeSetupAuditEntry {
  const full: TradeSetupAuditEntry = {
    setupId: entry.setupId,
    entry: entry.entry,
    stopLoss: entry.stopLoss,
    targets: entry.targets,
    risk: entry.risk,
    reward: entry.reward,
    qualityScore: entry.qualityScore,
    validationTime: entry.validationTime ?? new Date().toISOString(),
    failedRules: entry.failedRules,
    warnings: entry.warnings,
    engineVersion: entry.engineVersion ?? ENGINE_VERSION,
  };
  auditLog.push(full);
  return full;
}

export function buildTradeSetupRules(
  configInput?: TradeSetupValidationConfigInput
): CreateRuleInput[] {
  const config = resolveTradeSetupConfig(configInput);
  return [
    ...createEntryValidationRules(config),
    ...createStopLossValidationRules(config),
    ...createTargetValidationRules(config),
    ...createRiskRewardValidationRules(config),
    ...createPositionSizingValidationRules(config),
    ...createVolatilityValidationRules(config),
    ...createSupportResistanceValidationRules(config),
    ...createTrendAlignmentValidationRules(config),
    ...createTradeLifecycleRules(config),
    ...createTradeSetupConsistencyRules(config),
    ...createTradeSetupQualityRules(config),
    ...createTradeSetupAuditRules(config),
  ];
}

/** Idempotent registration of all trade setup validation rules. */
export function registerTradeSetupRules(options?: {
  engine?: RuleEngine;
  config?: TradeSetupValidationConfigInput;
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();
  if (options?.config) {
    activeConfig = resolveTradeSetupConfig(options.config);
  }

  if (registered && !options?.force) {
    return {
      registered: 0,
      skipped: REGISTERED_RULE_IDS.size,
      total: REGISTERED_RULE_IDS.size,
    };
  }

  const rules = buildTradeSetupRules(activeConfig);
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
  metricsState.tradeSetupsValidated += 1;
  metricsState.validationRuntime += result.executionTime;
  metricsState.averageValidationRuntime =
    Math.round(
      (metricsState.validationRuntime / metricsState.tradeSetupsValidated) * 100
    ) / 100;

  if (result.failedRules.length > 0) {
    metricsState.rejectedSetups += 1;
  }

  for (const r of result.results) {
    if (r.passed || r.skipped) continue;
    metricsState.ruleFailureFrequency[r.ruleId] =
      (metricsState.ruleFailureFrequency[r.ruleId] ?? 0) + 1;
    if (r.ruleId.startsWith("ts.rr.") || r.ruleId.startsWith("ts.position.")) {
      metricsState.riskViolations += 1;
    }
    if (r.ruleId.startsWith("ts.trend.")) {
      metricsState.trendViolations += 1;
    }
  }

  const quality = calculateTradeSetupQuality(data, activeConfig);
  qualitySum += quality.score;
  metricsState.averageQualityScore =
    Math.round(
      (qualitySum / metricsState.tradeSetupsValidated) * 100
    ) / 100;

  const rr = calculateRiskReward(data);
  if (rr) {
    rrSum += rr.riskRewardRatio;
    rrCount += 1;
    metricsState.averageRR =
      Math.round((rrSum / rrCount) * 100) / 100;
  }

  void engine;
}

async function runTradeSetupValidation(
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
  registerTradeSetupRules({ engine: options?.engine });
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();

  const prefixes = Array.isArray(options?.rulePrefix)
    ? options!.rulePrefix!
    : options?.rulePrefix
      ? [options.rulePrefix]
      : [
          "ts.entry.",
          "ts.stop.",
          "ts.target.",
          "ts.rr.",
          "ts.position.",
          "ts.volatility.",
          "ts.sr.",
          "ts.trend.",
          "ts.lifecycle.",
          "ts.consistency.",
          "ts.quality.",
          "ts.audit.",
        ];

  const ruleIds = engine
    .listRules({ enabled: true })
    .filter((r) => prefixes.some((p) => r.id.startsWith(p)))
    .map((r) => r.id);

  const result = await engine.executeRules({
    data,
    datasetType: options?.datasetType ?? "AI_OUTPUT",
    dataSource: options?.dataSource ?? "trade-setup",
    metadata: {
      ...options?.metadata,
      tradeSetupConfig: activeConfig,
    },
    config: new IntegrityConfig({ loggingLevel: "silent" }),
    ruleIds,
  });

  recordMetrics(result, data, engine);

  if (options?.appendAudit !== false && isPlainObject(data)) {
    const quality = calculateTradeSetupQuality(data, activeConfig);
    const levels = readTradeLevels(data);
    const rr = calculateRiskReward(data);
    appendTradeSetupAudit({
      setupId: readString(data, ["setupId", "id", "tradeId"]),
      entry: levels.entry,
      stopLoss: levels.stopLoss,
      targets: {
        primary: levels.primaryTarget,
        secondary: levels.secondaryTarget,
        final: levels.finalTarget,
      },
      risk: rr?.absoluteRisk,
      reward: rr?.absoluteReward,
      qualityScore: quality.score,
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

export async function validateTradeSetup(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTradeSetupValidation(data, options);
}

export async function validateEntry(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTradeSetupValidation(data, {
    ...options,
    rulePrefix: ["ts.entry."],
    appendAudit: false,
  });
}

export async function validateStopLoss(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTradeSetupValidation(data, {
    ...options,
    rulePrefix: ["ts.stop."],
    appendAudit: false,
  });
}

export async function validateTargets(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTradeSetupValidation(data, {
    ...options,
    rulePrefix: ["ts.target."],
    appendAudit: false,
  });
}

export async function validateRiskReward(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runTradeSetupValidation(data, {
    ...options,
    rulePrefix: ["ts.rr."],
    appendAudit: false,
  });
}
