/**
 * Hallucination Risk Score rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  calculateHallucinationScore,
  configFromContext,
  isPlainObject,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

export function createHallucinationScoreRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.score.threshold",
      name: "Hallucination Score Threshold",
      description:
        "Compute hallucination risk score and reject below configurable minimum.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "score"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) {
          return halFail({
            field: "hallucinationScore",
            message: "Cannot score non-object AI output.",
            recommendation: "Provide structured AI output payload.",
            actual: typeof ctx.data,
          });
        }
        const cfg = configFromContext(ctx);
        const result = calculateHallucinationScore(ctx.data, cfg);
        if (result.rejected) {
          return halFail({
            field: "hallucinationScore",
            message: "Hallucination risk score below threshold (High Hallucination Risk).",
            recommendation:
              "Improve fact accuracy, evidence, reasoning, numbers, history, or market context.",
            expected: `>= ${result.threshold}`,
            actual: {
              score: result.score,
              band: result.band,
              components: result.components,
            },
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.score.component_floors",
      name: "Hallucination Component Floors",
      description: "Warn when core accuracy components fall below floors.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "score"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        const result = calculateHallucinationScore(ctx.data, cfg);
        const weak: Record<string, number> = {};
        if (result.components.factAccuracy < cfg.minFactAccuracy) {
          weak.factAccuracy = result.components.factAccuracy;
        }
        if (result.components.reasoningQuality < cfg.minReasoningQuality) {
          weak.reasoningQuality = result.components.reasoningQuality;
        }
        if (result.components.evidenceSupport < cfg.evidenceThreshold / 2) {
          weak.evidenceSupport = result.components.evidenceSupport;
        }
        if (Object.keys(weak).length >= 2) {
          return halFail({
            field: "hallucinationScore",
            message: "Multiple hallucination score components below floors.",
            recommendation: "Strengthen weak components before publication.",
            expected: {
              factAccuracy: `>= ${cfg.minFactAccuracy}`,
              reasoningQuality: `>= ${cfg.minReasoningQuality}`,
            },
            actual: weak,
          });
        }
        return halPass();
      },
    },
  ];
}
