/**
 * Institutional AI Hallucination Detection — helpers, registry, public API.
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
  DEFAULT_HALLUCINATION_VALIDATION_CONFIG,
  resolveHallucinationConfig,
  resolveHallucinationScoreBand,
  type HallucinationScoreBand,
  type HallucinationValidationConfig,
  type HallucinationValidationConfigInput,
} from "./HallucinationValidationConfig";
import { createFactValidationRules } from "./FactValidationRules";
import { createSourceVerificationRules } from "./SourceVerificationRules";
import { createReasoningConsistencyRules } from "./ReasoningConsistencyRules";
import { createDataEvidenceRules } from "./DataEvidenceRules";
import { createContradictionDetectionRules } from "./ContradictionDetectionRules";
import { createConfidenceVerificationRules } from "./ConfidenceVerificationRules";
import { createMarketContextRules } from "./MarketContextRules";
import { createNumericalConsistencyRules } from "./NumericalConsistencyRules";
import { createHistoricalConsistencyRules } from "./HistoricalConsistencyRules";
import { createDuplicateReasoningRules } from "./DuplicateReasoningRules";
import { createAIOutputIntegrityRules } from "./AIOutputIntegrityRules";
import { createHallucinationScoreRules } from "./HallucinationScoreRules";
import { createHallucinationAuditRules } from "./HallucinationAuditRules";

export {
  DEFAULT_HALLUCINATION_VALIDATION_CONFIG,
  resolveHallucinationConfig,
  resolveHallucinationScoreBand,
};
export type {
  HallucinationScoreBand,
  HallucinationValidationConfig,
  HallucinationValidationConfigInput,
};

export function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function halFail(input: {
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

export function halPass(): RuleValidationOutcome {
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

export function normalizeAction(
  value: unknown
): string | undefined {
  if (typeof value !== "string") return undefined;
  return value.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

export function readAction(data: Record<string, unknown>): string | undefined {
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

export function actionBias(
  action: string | undefined
): "bullish" | "bearish" | "neutral" | undefined {
  if (!action) return undefined;
  if (["BUY", "STRONG_BUY", "ACCUMULATE"].includes(action)) return "bullish";
  if (["SELL", "STRONG_SELL", "REDUCE"].includes(action)) return "bearish";
  if (["HOLD", "WATCH"].includes(action)) return "neutral";
  return undefined;
}

/** Validated evidence / ground-truth datasets attached to the AI payload. */
export function evidenceSection(
  data: Record<string, unknown>
): Record<string, unknown> {
  return section(data, [
    "evidence",
    "validatedData",
    "sources",
    "groundTruth",
    "data",
  ]);
}

export function statementsOf(data: Record<string, unknown>): unknown[] {
  if (Array.isArray(data.statements)) return data.statements;
  if (Array.isArray(data.claims)) return data.claims;
  if (Array.isArray(data.facts)) return data.facts;
  return [];
}

export function numericDeviationPercent(
  claimed: number,
  actual: number
): number {
  if (!Number.isFinite(claimed) || !Number.isFinite(actual)) return Infinity;
  if (actual === 0) return claimed === 0 ? 0 : Infinity;
  return (Math.abs(claimed - actual) / Math.abs(actual)) * 100;
}

export function configFromContext(
  ctx: ValidationContext
): HallucinationValidationConfig {
  const fromMeta = ctx.metadata?.hallucinationConfig;
  if (fromMeta && typeof fromMeta === "object") {
    return resolveHallucinationConfig(
      fromMeta as HallucinationValidationConfigInput
    );
  }
  return getActiveHallucinationConfig();
}

export interface HallucinationComponentScores {
  factAccuracy: number;
  evidenceSupport: number;
  reasoningQuality: number;
  numericalAccuracy: number;
  historicalConsistency: number;
  marketContext: number;
}

export interface HallucinationScoreResult {
  score: number;
  components: HallucinationComponentScores;
  band: HallucinationScoreBand;
  rejected: boolean;
  threshold: number;
}

export interface HallucinationAuditEntry {
  aiOutputId: string | undefined;
  validationTimestamp: string;
  hallucinationScore: number;
  failedRules: string[];
  warnings: string[];
  evidenceSources: string[];
  engineVersion: string;
}

export interface HallucinationValidationMetrics {
  aiOutputsValidated: number;
  hallucinationsDetected: number;
  unsupportedClaims: number;
  contradictions: number;
  evidenceFailures: number;
  averageHallucinationScore: number;
  validationRuntime: number;
  averageValidationRuntime: number;
  ruleFailureFrequency: Record<string, number>;
}

const metricsState: HallucinationValidationMetrics = {
  aiOutputsValidated: 0,
  hallucinationsDetected: 0,
  unsupportedClaims: 0,
  contradictions: 0,
  evidenceFailures: 0,
  averageHallucinationScore: 0,
  validationRuntime: 0,
  averageValidationRuntime: 0,
  ruleFailureFrequency: {},
};

let scoreSum = 0;
const auditLog: HallucinationAuditEntry[] = [];
const ENGINE_VERSION = "9F.8.0";

let registered = false;
let activeConfig: HallucinationValidationConfig =
  DEFAULT_HALLUCINATION_VALIDATION_CONFIG;
const REGISTERED_RULE_IDS = new Set<string>();

export function getActiveHallucinationConfig(): HallucinationValidationConfig {
  return {
    ...activeConfig,
    scoreWeights: { ...activeConfig.scoreWeights },
    scoreBands: { ...activeConfig.scoreBands },
    requiredSections: [...activeConfig.requiredSections],
  };
}

export function getHallucinationValidationMetrics(): HallucinationValidationMetrics {
  return {
    ...metricsState,
    ruleFailureFrequency: { ...metricsState.ruleFailureFrequency },
  };
}

export function resetHallucinationValidationMetrics(): void {
  metricsState.aiOutputsValidated = 0;
  metricsState.hallucinationsDetected = 0;
  metricsState.unsupportedClaims = 0;
  metricsState.contradictions = 0;
  metricsState.evidenceFailures = 0;
  metricsState.averageHallucinationScore = 0;
  metricsState.validationRuntime = 0;
  metricsState.averageValidationRuntime = 0;
  metricsState.ruleFailureFrequency = {};
  scoreSum = 0;
}

export function getHallucinationAuditLog(): HallucinationAuditEntry[] {
  return [...auditLog];
}

export function resetHallucinationAuditLog(): void {
  auditLog.length = 0;
}

export function resetHallucinationRuleRegistrationState(): void {
  registered = false;
  REGISTERED_RULE_IDS.clear();
  activeConfig = DEFAULT_HALLUCINATION_VALIDATION_CONFIG;
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
        "accuracy",
        "quality",
        "support",
      ]);
      if (score !== undefined) return clampScore(score);
      return baseWhenPresent;
    }
  }
  return baseWhenMissing;
}

function countFlagged(
  data: Record<string, unknown>,
  keys: string[]
): number {
  let count = 0;
  for (const key of keys) {
    const v = data[key];
    if (v === true) count += 1;
    if (Array.isArray(v)) count += v.length;
    if (typeof v === "number" && Number.isFinite(v)) count += v;
  }
  return count;
}

export function deriveHallucinationComponentScores(
  data: unknown,
  _config: HallucinationValidationConfig = activeConfig
): HallucinationComponentScores {
  if (!isPlainObject(data)) {
    return {
      factAccuracy: 0,
      evidenceSupport: 0,
      reasoningQuality: 0,
      numericalAccuracy: 0,
      historicalConsistency: 0,
      marketContext: 0,
    };
  }

  const evidence = evidenceSection(data);
  const facts = section(data, ["facts", "factCheck", "claims"]);
  const reasoning = section(data, ["reasoning", "analysis"]);
  const numerical = section(data, ["numerical", "metrics", "numbers"]);
  const historical = section(data, ["historical", "history", "previous"]);
  const market = section(data, ["market", "marketContext", "context"]);

  let factAccuracy =
    readNumber(facts, ["score", "accuracy", "factAccuracy"]) ??
    (() => {
      const statements = Array.isArray(data.statements)
        ? data.statements
        : Array.isArray(data.claims)
          ? data.claims
          : [];
      if (statements.length > 0) {
        const supported = statements.filter(
          (s) =>
            isPlainObject(s) &&
            (s.supported === true ||
              hasNonEmptyText(s.evidenceRef) ||
              hasNonEmptyText(s.source))
        ).length;
        if (supported === statements.length) return 90;
        if (supported > 0) return 65;
        return 30;
      }
      return componentFromPresence(
        data,
        ["facts", "factCheck", "statements"],
        75,
        35
      );
    })();
  if (
    data.fabricated === true ||
    data.hasFabricatedFacts === true ||
    countFlagged(data, ["fabricatedFacts", "inventedEvents"]) > 0
  ) {
    factAccuracy = Math.min(factAccuracy, 15);
  }

  let evidenceSupport =
    readNumber(evidence, ["score", "support", "coverage"]) ??
    (() => {
      let s = 30;
      const sourceKeys = [
        "priceSource",
        "financialSource",
        "indicatorSource",
        "corporateActionSource",
        "historicalSource",
        "recommendationSource",
      ];
      for (const key of sourceKeys) {
        if (hasNonEmptyText(evidence[key] ?? data[key])) s += 10;
      }
      if (hasNonEmptyText(data.evidence) || Object.keys(evidence).length > 0) {
        s += 10;
      }
      return s;
    })();
  if (
    data.missingEvidence === true ||
    data.unsupportedClaims === true ||
    countFlagged(data, ["unsupportedClaims"]) > 0
  ) {
    evidenceSupport = Math.min(evidenceSupport, 20);
  }

  let reasoningQuality =
    readNumber(reasoning, ["score", "quality"]) ??
    (() => {
      let s = 35;
      if (hasNonEmptyText(data.primaryReason ?? data.reason ?? data.conclusion))
        s += 15;
      if (hasNonEmptyText(data.supportingFactors ?? data.keyFindings)) s += 15;
      if (hasNonEmptyText(data.assumptions)) s += 10;
      if (hasNonEmptyText(data.bullCase) && hasNonEmptyText(data.bearCase))
        s += 15;
      if (data.circularReasoning === true) s = Math.min(s, 20);
      if (data.logicalJump === true) s = Math.min(s, 25);
      return s;
    })();

  let numericalAccuracy =
    readNumber(numerical, ["score", "accuracy"]) ??
    (() => {
      const keys = [
        "revenue",
        "profit",
        "eps",
        "cashFlow",
        "marketCap",
        "growth",
        "pe",
        "roe",
      ];
      const present = keys.filter((k) => readNumber(data, [k]) !== undefined)
        .length;
      if (present >= 4) return 85;
      if (present >= 2) return 70;
      return componentFromPresence(
        data,
        ["numerical", "metrics", "numbers"],
        75,
        45
      );
    })();
  if (
    data.numericalInconsistency === true ||
    data.hasNumericalErrors === true
  ) {
    numericalAccuracy = Math.min(numericalAccuracy, 20);
  }

  let historicalConsistency =
    readNumber(historical, ["score", "consistency"]) ??
    (isPlainObject(data.previousReport) ||
    isPlainObject(data.previousRecommendation) ||
    isPlainObject(historical)
      ? 75
      : 50);
  if (
    data.historicalContradiction === true ||
    historical.contradiction === true
  ) {
    historicalConsistency = Math.min(historicalConsistency, 20);
  }

  let marketContext =
    readNumber(market, ["score", "coverage"]) ??
    (() => {
      let s = 30;
      if (hasNonEmptyText(market.sectorTrend ?? data.sectorTrend)) s += 12;
      if (hasNonEmptyText(market.indexTrend ?? data.indexTrend)) s += 12;
      if (readNumber({ ...data, ...market }, ["volatility"]) !== undefined)
        s += 10;
      if (hasNonEmptyText(market.macro ?? data.macroEnvironment)) s += 10;
      if (hasNonEmptyText(market.news ?? data.recentNews)) s += 8;
      if (hasNonEmptyText(market.earnings ?? data.upcomingEarnings)) s += 8;
      return s;
    })();
  if (data.missingMarketContext === true) {
    marketContext = Math.min(marketContext, 25);
  }

  return {
    factAccuracy: clampScore(factAccuracy),
    evidenceSupport: clampScore(evidenceSupport),
    reasoningQuality: clampScore(reasoningQuality),
    numericalAccuracy: clampScore(numericalAccuracy),
    historicalConsistency: clampScore(historicalConsistency),
    marketContext: clampScore(marketContext),
  };
}

/** Generate Hallucination Risk Score (0–100). Higher = lower hallucination risk. */
export function calculateHallucinationScore(
  data: unknown,
  configInput?: HallucinationValidationConfigInput
): HallucinationScoreResult {
  const config = resolveHallucinationConfig(configInput ?? activeConfig);
  const components = deriveHallucinationComponentScores(data, config);
  const w = config.scoreWeights;
  const score = clampScore(
    components.factAccuracy * w.factAccuracy +
      components.evidenceSupport * w.evidenceSupport +
      components.reasoningQuality * w.reasoningQuality +
      components.numericalAccuracy * w.numericalAccuracy +
      components.historicalConsistency * w.historicalConsistency +
      components.marketContext * w.marketContext
  );
  return {
    score,
    components,
    band: resolveHallucinationScoreBand(score, config.scoreBands),
    rejected: score < config.minHallucinationScore,
    threshold: config.minHallucinationScore,
  };
}

export function appendHallucinationAudit(
  entry: Omit<HallucinationAuditEntry, "engineVersion" | "validationTimestamp"> & {
    validationTimestamp?: string;
    engineVersion?: string;
  }
): HallucinationAuditEntry {
  const full: HallucinationAuditEntry = {
    aiOutputId: entry.aiOutputId,
    validationTimestamp:
      entry.validationTimestamp ?? new Date().toISOString(),
    hallucinationScore: entry.hallucinationScore,
    failedRules: entry.failedRules,
    warnings: entry.warnings,
    evidenceSources: entry.evidenceSources,
    engineVersion: entry.engineVersion ?? ENGINE_VERSION,
  };
  auditLog.push(full);
  return full;
}

export function collectEvidenceSources(
  data: Record<string, unknown>
): string[] {
  const evidence = evidenceSection(data);
  const keys = [
    "priceSource",
    "financialSource",
    "indicatorSource",
    "corporateActionSource",
    "historicalSource",
    "recommendationSource",
  ];
  const sources: string[] = [];
  for (const key of keys) {
    const v = readString({ ...data, ...evidence }, [key]);
    if (v) sources.push(`${key}:${v}`);
  }
  if (Array.isArray(data.evidenceSources)) {
    for (const s of data.evidenceSources) {
      if (typeof s === "string" && s.trim()) sources.push(s.trim());
    }
  }
  return sources;
}

export function buildHallucinationRules(
  configInput?: HallucinationValidationConfigInput
): CreateRuleInput[] {
  const config = resolveHallucinationConfig(configInput);
  return [
    ...createFactValidationRules(config),
    ...createSourceVerificationRules(config),
    ...createReasoningConsistencyRules(config),
    ...createDataEvidenceRules(config),
    ...createContradictionDetectionRules(config),
    ...createConfidenceVerificationRules(config),
    ...createMarketContextRules(config),
    ...createNumericalConsistencyRules(config),
    ...createHistoricalConsistencyRules(config),
    ...createDuplicateReasoningRules(config),
    ...createAIOutputIntegrityRules(config),
    ...createHallucinationScoreRules(config),
    ...createHallucinationAuditRules(config),
  ];
}

/** Idempotent registration of all hallucination detection rules. */
export function registerHallucinationRules(options?: {
  engine?: RuleEngine;
  config?: HallucinationValidationConfigInput;
  force?: boolean;
}): { registered: number; skipped: number; total: number } {
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();
  if (options?.config) {
    activeConfig = resolveHallucinationConfig(options.config);
  }

  if (registered && !options?.force) {
    return {
      registered: 0,
      skipped: REGISTERED_RULE_IDS.size,
      total: REGISTERED_RULE_IDS.size,
    };
  }

  const rules = buildHallucinationRules(activeConfig);
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
  metricsState.aiOutputsValidated += 1;
  metricsState.validationRuntime += result.executionTime;
  metricsState.averageValidationRuntime =
    Math.round(
      (metricsState.validationRuntime / metricsState.aiOutputsValidated) * 100
    ) / 100;

  if (result.failedRules.length > 0) {
    metricsState.hallucinationsDetected += 1;
  }

  for (const r of result.results) {
    if (r.passed || r.skipped) continue;
    metricsState.ruleFailureFrequency[r.ruleId] =
      (metricsState.ruleFailureFrequency[r.ruleId] ?? 0) + 1;
    if (
      r.ruleId.startsWith("hal.fact.") ||
      r.ruleId.startsWith("hal.evidence.")
    ) {
      metricsState.unsupportedClaims += 1;
    }
    if (r.ruleId.startsWith("hal.contradiction.")) {
      metricsState.contradictions += 1;
    }
    if (
      r.ruleId.startsWith("hal.source.") ||
      r.ruleId.startsWith("hal.evidence.")
    ) {
      metricsState.evidenceFailures += 1;
    }
  }

  const score = calculateHallucinationScore(data, activeConfig);
  scoreSum += score.score;
  metricsState.averageHallucinationScore =
    Math.round((scoreSum / metricsState.aiOutputsValidated) * 100) / 100;

  void engine;
}

async function runHallucinationValidation(
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
  registerHallucinationRules({ engine: options?.engine });
  const engine =
    options?.engine ?? getDataIntegrityEngine().getRuleEngine();

  const prefixes = Array.isArray(options?.rulePrefix)
    ? options!.rulePrefix!
    : options?.rulePrefix
      ? [options.rulePrefix]
      : [
          "hal.fact.",
          "hal.source.",
          "hal.reasoning.",
          "hal.evidence.",
          "hal.contradiction.",
          "hal.confidence.",
          "hal.market.",
          "hal.numerical.",
          "hal.historical.",
          "hal.duplicate.",
          "hal.integrity.",
          "hal.score.",
          "hal.audit.",
        ];

  const ruleIds = engine
    .listRules({ enabled: true })
    .filter((r) => prefixes.some((p) => r.id.startsWith(p)))
    .map((r) => r.id);

  const result = await engine.executeRules({
    data,
    datasetType: options?.datasetType ?? "AI_OUTPUT",
    dataSource: options?.dataSource ?? "ai-hallucination",
    metadata: {
      ...options?.metadata,
      hallucinationConfig: activeConfig,
    },
    config: new IntegrityConfig({ loggingLevel: "silent" }),
    ruleIds,
  });

  recordMetrics(result, data, engine);

  if (options?.appendAudit !== false && isPlainObject(data)) {
    const score = calculateHallucinationScore(data, activeConfig);
    appendHallucinationAudit({
      aiOutputId: readString(data, ["aiOutputId", "id", "reportId", "outputId"]),
      hallucinationScore: score.score,
      failedRules: result.failedRules,
      warnings: result.results
        .filter((r) => {
          if (r.passed || r.skipped) return false;
          const def = engine.findRule(r.ruleId);
          return def?.ruleLevel === "WARNING" || def?.ruleLevel === "INFO";
        })
        .map((r) => r.ruleId),
      evidenceSources: collectEvidenceSources(data),
    });
  }

  return result;
}

export async function validateAIOutput(
  data: unknown,
  options?: {
    datasetType?: DatasetType;
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runHallucinationValidation(data, options);
}

export async function validateFacts(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runHallucinationValidation(data, {
    ...options,
    rulePrefix: ["hal.fact."],
    appendAudit: false,
  });
}

export async function validateEvidence(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runHallucinationValidation(data, {
    ...options,
    rulePrefix: ["hal.source.", "hal.evidence."],
    appendAudit: false,
  });
}

export async function validateReasoning(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runHallucinationValidation(data, {
    ...options,
    rulePrefix: ["hal.reasoning."],
    appendAudit: false,
  });
}

export async function detectContradictions(
  data: unknown,
  options?: {
    dataSource?: string;
    metadata?: Record<string, unknown>;
    engine?: RuleEngine;
  }
): Promise<ExecuteRulesResult> {
  return runHallucinationValidation(data, {
    ...options,
    rulePrefix: ["hal.contradiction."],
    appendAudit: false,
  });
}
