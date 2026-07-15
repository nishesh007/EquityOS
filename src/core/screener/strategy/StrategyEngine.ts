/**
 * Institutional Strategy Screener — execution engine (Sprint 9D.R5).
 * Composes Strategy rules with Institutional intelligence scoring — no engine rebuild.
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";
import {
  buildInstitutionalInsights,
  generateResearchPriority,
  normalizeInstitutionalCard,
  rankInstitutionalResults,
  scoreInstitutionalCandidate,
  type InstitutionalCandidate,
  type InstitutionalResultCard,
} from "../intelligence";
import {
  collectMatchedFailedRules,
  evaluateRuleNode,
} from "./StrategyRule";
import type { StrategyDefinition } from "./StrategyDefinition";
import {
  countRules,
  previewStrategy,
  summarizeRules,
  validateRuleTree,
} from "./StrategyBuilderEngine";
import type { StrategyDefinitionInput } from "./StrategyDefinition";
import {
  cloneStrategy,
  createStrategy,
  deleteStrategy,
  getStrategy,
  listStrategies,
  listTemplates,
  markStrategyRun,
  saveTemplate,
  updateStrategy,
} from "./StrategyLibrary";
import { registerBuiltinTemplates } from "./StrategyTemplateEngine";
import {
  emptyStrategyExecutionResult,
  normalizeStrategyExplainability,
  STRATEGY_EMPTY,
  type StrategyEmptyMessage,
  type StrategyExecutionResult,
  type StrategyExplainability,
} from "./StrategyPresentationModels";

export interface StrategyUniverseCandidate {
  ticker: string;
  company?: string | null;
  sector?: string | null;
  industry?: string | null;
  metrics?: Record<string, number | string | null | undefined>;
  trustScore?: number | null;
  validationScore?: number | null;
  confidence?: number | null;
  aiConviction?: number | null;
  opportunityScore?: number | null;
  momentum?: number | null;
  quality?: number | null;
  technical?: number | null;
  growth?: number | null;
  risk?: number | null;
  fundamentalStrength?: number | null;
  reasonSummary?: string | null;
}

export interface StrategyRunOptions {
  universe: StrategyUniverseCandidate[];
  resultLimit?: number;
}

const METRIC_FIELD_MAP: Record<string, keyof InstitutionalCandidate> = {
  trust_score: "trustScore",
  validation_score: "validationScore",
  ai_conviction: "aiConviction",
  opportunity_score: "opportunityScore",
  quality_score: "quality",
  confidence: "confidence",
  momentum: "momentum",
  technical: "technical",
  growth: "growth",
  risk: "risk",
  roce: "quality",
};

function metricNumber(
  metrics: Record<string, number | string | null | undefined>,
  key: string
): number | undefined {
  const raw = metrics[key];
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim() !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export function toInstitutionalCandidate(
  candidate: StrategyUniverseCandidate
): InstitutionalCandidate {
  const metrics = candidate.metrics ?? {};
  const pick = (snake: string, direct?: number | null): number | undefined => {
    if (direct != null && Number.isFinite(direct)) return direct;
    return metricNumber(metrics, snake);
  };

  return {
    ticker: safeScreenText(candidate.ticker, "—").toUpperCase(),
    company: candidate.company,
    sector: candidate.sector,
    industry: candidate.industry,
    trustScore: pick("trust_score", candidate.trustScore),
    validationScore: pick("validation_score", candidate.validationScore),
    confidence: pick("confidence", candidate.confidence),
    aiConviction: pick("ai_conviction", candidate.aiConviction),
    opportunityScore: pick("opportunity_score", candidate.opportunityScore),
    momentum: pick("momentum", candidate.momentum),
    quality:
      pick("quality_score", candidate.quality) ??
      pick("roce", undefined) ??
      pick("quality", undefined),
    technical: pick("technical", candidate.technical),
    growth:
      pick("growth", candidate.growth) ??
      pick("revenue_yoy", undefined) ??
      pick("eps_growth", undefined),
    risk: pick("risk", candidate.risk),
    fundamentalStrength: pick(
      "fundamental_strength",
      candidate.fundamentalStrength
    ),
    income: pick("dividend_yield", undefined) ?? pick("income", undefined),
    value: pick("pe", undefined) != null
      ? Math.max(0, 100 - Math.min(100, Number(pick("pe", undefined))))
      : pick("value", undefined),
    reasonSummary: candidate.reasonSummary,
    domain: "opportunity",
  };
}

function mergeMetricsBag(
  candidate: StrategyUniverseCandidate
): Record<string, number | string | null | undefined> {
  const bag: Record<string, number | string | null | undefined> = {
    ...(candidate.metrics ?? {}),
  };

  const assign = (key: string, value: number | null | undefined) => {
    if (value != null && Number.isFinite(value) && bag[key] == null) {
      bag[key] = value;
    }
  };

  assign("trust_score", candidate.trustScore);
  assign("validation_score", candidate.validationScore);
  assign("confidence", candidate.confidence);
  assign("ai_conviction", candidate.aiConviction);
  assign("opportunity_score", candidate.opportunityScore);
  assign("momentum", candidate.momentum);
  assign("quality_score", candidate.quality);
  assign("technical", candidate.technical);
  assign("growth", candidate.growth);
  assign("risk", candidate.risk);

  // Camel ↔ snake aliases for rule fields
  for (const [snake, camel] of Object.entries(METRIC_FIELD_MAP)) {
    const v = candidate[camel as keyof StrategyUniverseCandidate];
    if (typeof v === "number" && Number.isFinite(v) && bag[snake] == null) {
      bag[snake] = v;
    }
  }

  return bag;
}

function buildCardFromPass(
  candidate: StrategyUniverseCandidate,
  matched: string[]
): InstitutionalResultCard {
  const institutional = toInstitutionalCandidate(candidate);
  const factors = scoreInstitutionalCandidate(institutional);
  const priority = generateResearchPriority(factors, {
    matchedSignals: matched.length,
    hasCatalyst: matched.some((s) =>
      /breakout|catalyst|buy|conviction/i.test(s)
    ),
  });
  const insight = buildInstitutionalInsights({
    candidate: institutional,
    factors,
    matchedSignals: matched,
  });

  return normalizeInstitutionalCard({
    ticker: institutional.ticker,
    company: institutional.company,
    sector: institutional.sector,
    badges: insight.badges,
    evidence: insight.evidence,
    drivers: insight.drivers,
    priority,
    confidence: factors.aiConfidence,
    institutionalScore: factors.overallInstitutionalScore,
    trust: factors.trust,
    validation: factors.validation,
    reasonSummary:
      institutional.reasonSummary ||
      matched.slice(0, 3).join(", ") ||
      insight.headline,
    matchedSignals: matched,
    factors,
    insight,
  });
}

function resolveDefinition(
  strategyIdOrDefinition: string | StrategyDefinition
): StrategyDefinition | null {
  if (typeof strategyIdOrDefinition === "string") {
    return getStrategy(strategyIdOrDefinition);
  }
  return strategyIdOrDefinition;
}

export function runStrategy(
  strategyIdOrDefinition: string | StrategyDefinition,
  options: StrategyRunOptions
): StrategyExecutionResult {
  registerBuiltinTemplates();

  const definition = resolveDefinition(strategyIdOrDefinition);
  if (!definition) {
    return emptyStrategyExecutionResult(
      STRATEGY_EMPTY.noStrategies,
      typeof strategyIdOrDefinition === "string" ? strategyIdOrDefinition : "",
      STRATEGY_EMPTY.noStrategies
    );
  }

  const universe = options.universe ?? [];
  if (universe.length === 0) {
    return emptyStrategyExecutionResult(
      STRATEGY_EMPTY.awaitingExecution,
      definition.id,
      definition.name
    );
  }

  const cards: InstitutionalResultCard[] = [];
  const explainability: StrategyExplainability[] = [];

  for (const candidate of universe) {
    const metrics = mergeMetricsBag(candidate);
    const passed = evaluateRuleNode(definition.root, metrics);
    const { matched, failed } = collectMatchedFailedRules(
      definition.root,
      metrics
    );

    explainability.push(
      normalizeStrategyExplainability({
        ticker: candidate.ticker,
        matched,
        failed,
        passed,
        summary: passed
          ? matched.slice(0, 3).join(", ") || "Matched"
          : failed.slice(0, 3).join(", ") || "Failed rules",
        empty: false,
      })
    );

    if (passed) {
      cards.push(buildCardFromPass(candidate, matched));
    }
  }

  if (typeof strategyIdOrDefinition === "string") {
    markStrategyRun(definition.id);
  } else if (getStrategy(definition.id)) {
    markStrategyRun(definition.id);
  }

  if (cards.length === 0) {
    return {
      ...emptyStrategyExecutionResult(
        STRATEGY_EMPTY.noMatchingStocks,
        definition.id,
        definition.name
      ),
      explainability,
      generatedAt: new Date().toISOString(),
    };
  }

  const ranked = rankInstitutionalResults(cards);
  const limited = ranked.slice(
    0,
    Math.max(1, safeScreenNumber(options.resultLimit, 50))
  );

  return {
    strategyId: definition.id,
    strategyName: safeScreenText(definition.name, definition.id),
    cards: limited,
    totalMatches: limited.length,
    explainability,
    empty: false,
    emptyMessage: STRATEGY_EMPTY.noMatchingStocks,
    generatedAt: new Date().toISOString(),
  };
}

export class StrategyEngine {
  registerBuiltins(force?: boolean) {
    return registerBuiltinTemplates({ force });
  }

  create(input: StrategyDefinitionInput, options?: { force?: boolean }) {
    return createStrategy(input, options);
  }

  update(id: string, patch: Partial<StrategyDefinitionInput>) {
    return updateStrategy(id, patch);
  }

  delete(id: string) {
    return deleteStrategy(id);
  }

  clone(id: string, overrides?: Partial<StrategyDefinitionInput>) {
    return cloneStrategy(id, overrides);
  }

  saveTemplate(
    input: StrategyDefinitionInput,
    options?: { force?: boolean }
  ) {
    return saveTemplate(input, options);
  }

  list(options?: Parameters<typeof listStrategies>[0]) {
    return listStrategies(options);
  }

  listTemplates(options?: Parameters<typeof listTemplates>[0]) {
    return listTemplates(options);
  }

  get(id: string) {
    return getStrategy(id);
  }

  preview(definition: StrategyDefinition) {
    return previewStrategy(definition);
  }

  summarize(definition: StrategyDefinition) {
    return summarizeRules(definition.root);
  }

  validate(definition: StrategyDefinition) {
    return validateRuleTree(definition.root);
  }

  countRules(definition: StrategyDefinition) {
    return countRules(definition.root);
  }

  run(
    strategyIdOrDefinition: string | StrategyDefinition,
    options: StrategyRunOptions
  ) {
    return runStrategy(strategyIdOrDefinition, options);
  }
}

export type { StrategyEmptyMessage };
