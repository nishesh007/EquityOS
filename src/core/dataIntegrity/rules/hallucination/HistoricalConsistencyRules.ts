/**
 * Historical consistency rules — compare against prior AI outputs.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  actionBias,
  configFromContext,
  hasNonEmptyText,
  isPlainObject,
  readAction,
  readNumber,
  scoreDirection,
  section,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

export function createHistoricalConsistencyRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.historical.no_contradiction_flag",
      name: "No Historical Contradiction Flag",
      description: "Reject outputs flagged as historically contradictory.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "historical"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const hist = section(ctx.data, ["historical", "history"]);
        if (
          ctx.data.historicalContradiction === true ||
          hist.contradiction === true
        ) {
          return halFail({
            field: "historical",
            message: "Historical contradiction detected.",
            recommendation: "Explain change of view or reconcile with prior reports.",
            actual: true,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.historical.recommendation_flip",
      name: "Unexplained Recommendation Flip",
      description: "Major recommendation flips require explanation.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "historical", "recommendation"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const current = actionBias(readAction(ctx.data));
        const prevObj = isPlainObject(ctx.data.previousRecommendation)
          ? (ctx.data.previousRecommendation as Record<string, unknown>)
          : section(ctx.data, ["historical"]).previousRecommendation;
        if (!isPlainObject(prevObj)) return halPass();
        const previous = actionBias(readAction(prevObj as Record<string, unknown>));
        if (
          current &&
          previous &&
          current !== "neutral" &&
          previous !== "neutral" &&
          current !== previous
        ) {
          const explained =
            hasNonEmptyText(ctx.data.changeOfView) ||
            hasNonEmptyText(ctx.data.thesisChange) ||
            ctx.data.viewChangeExplained === true;
          if (!explained) {
            return halFail({
              field: "recommendation",
              message: "Unexplained flip vs previous recommendation.",
              recommendation: "Document changeOfView / thesisChange with evidence.",
              expected: "explained view change",
              actual: { previous, current },
            });
          }
        }
        return halPass();
      },
    },
    {
      id: "hal.historical.reasoning_conflict",
      name: "Previous Reasoning Conflict",
      description: "Detect conflicts with previous reasoning without acknowledgment.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "historical"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const hist = section(ctx.data, ["historical", "history"]);
        const prevReasonBias = scoreDirection(
          hist.previousReasoningBias ??
            (isPlainObject(ctx.data.previousReport)
              ? (ctx.data.previousReport as Record<string, unknown>).reasoningBias
              : undefined)
        );
        const currentBias = scoreDirection(
          ctx.data.reasoningBias ?? ctx.data.analysisBias
        );
        if (
          prevReasonBias &&
          currentBias &&
          prevReasonBias !== "neutral" &&
          currentBias !== "neutral" &&
          prevReasonBias !== currentBias &&
          !hasNonEmptyText(ctx.data.changeOfView)
        ) {
          return halFail({
            field: "reasoning",
            message: "Current reasoning conflicts with previous without explanation.",
            recommendation: "Acknowledge prior reasoning and justify the update.",
            actual: { previous: prevReasonBias, current: currentBias },
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.historical.consistency_threshold",
      name: "Historical Consistency Threshold",
      description: "Historical consistency score must meet configured minimum.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["hallucination", "historical"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        const hist = section(ctx.data, ["historical", "history"]);
        const score = readNumber(
          { ...ctx.data, ...hist },
          ["historicalConsistency", "consistency", "score"]
        );
        if (score === undefined) return halPass();
        if (score < cfg.historicalConsistencyThreshold) {
          return halFail({
            field: "historical",
            message: "Historical consistency below threshold.",
            recommendation: `Improve consistency to >= ${cfg.historicalConsistencyThreshold}.`,
            expected: `>= ${cfg.historicalConsistencyThreshold}`,
            actual: score,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.historical.valuation_conflict",
      name: "Previous Valuation Conflict",
      description: "Large unexplained valuation swings vs prior analysis.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "historical", "valuation"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const prev = isPlainObject(ctx.data.previousValuation)
          ? (ctx.data.previousValuation as Record<string, unknown>)
          : section(ctx.data, ["historical"]).previousValuation;
        if (!isPlainObject(prev)) return halPass();
        const prevPe = readNumber(prev as Record<string, unknown>, ["pe", "valuation"]);
        const currPe = readNumber(ctx.data, ["pe", "valuation"]);
        if (prevPe === undefined || currPe === undefined) return halPass();
        const changePct =
          prevPe === 0 ? Infinity : (Math.abs(currPe - prevPe) / Math.abs(prevPe)) * 100;
        if (changePct > 50 && !hasNonEmptyText(ctx.data.valuationChangeReason)) {
          return halFail({
            field: "valuation",
            message: "Large valuation change vs prior without explanation.",
            recommendation: "Add valuationChangeReason with supporting evidence.",
            expected: "explained valuation change",
            actual: { previous: prevPe, current: currPe, changePct },
          });
        }
        return halPass();
      },
    },
  ];
}
