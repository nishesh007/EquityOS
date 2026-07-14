/**
 * Confidence verification rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  evidenceSection,
  isPlainObject,
  readNumber,
  section,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

export function createConfidenceVerificationRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.confidence.present",
      name: "Confidence Present",
      description: "AI outputs with recommendations should include confidence.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "confidence"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const hasRec =
          ctx.data.action !== undefined ||
          ctx.data.recommendation !== undefined ||
          ctx.data.requireConfidence === true;
        if (!hasRec) return halPass();
        const conf = readNumber(ctx.data, [
          "confidence",
          "conviction",
          "confidenceScore",
        ]);
        if (conf === undefined) {
          return halFail({
            field: "confidence",
            message: "Missing confidence for actionable AI output.",
            recommendation: "Provide numeric confidence 0–100.",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.confidence.supported_by_evidence",
      name: "Confidence Supported By Evidence",
      description: "High confidence requires strong evidence support.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "confidence", "evidence"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        const conf = readNumber(ctx.data, [
          "confidence",
          "conviction",
          "confidenceScore",
        ]);
        if (conf === undefined) return halPass();
        const evidence = evidenceSection(ctx.data);
        const evidenceScore =
          readNumber(evidence, ["score", "support", "coverage"]) ??
          readNumber(ctx.data, ["evidenceScore"]);
        if (
          conf >= cfg.confidenceThreshold &&
          (evidenceScore === undefined ||
            evidenceScore < cfg.evidenceThreshold)
        ) {
          return halFail({
            field: "confidence",
            message: "High confidence without sufficient evidence support.",
            recommendation: `Require evidenceScore >= ${cfg.evidenceThreshold} when confidence >= ${cfg.confidenceThreshold}.`,
            expected: `evidenceScore >= ${cfg.evidenceThreshold}`,
            actual: { confidence: conf, evidenceScore: evidenceScore ?? null },
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.confidence.inflated",
      name: "Inflated Confidence",
      description: "Reject inflated confidence without strong supporting signals.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "confidence"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        const conf = readNumber(ctx.data, [
          "confidence",
          "conviction",
          "confidenceScore",
        ]);
        if (conf === undefined) return halPass();
        if (ctx.data.inflatedConfidence === true) {
          return halFail({
            field: "confidence",
            message: "Inflated confidence flagged.",
            recommendation: "Reduce confidence to match signal strength.",
            actual: conf,
          });
        }
        const tech = section(ctx.data, ["technical", "signals"]);
        const signalStrength =
          readNumber(tech, ["score", "strength", "alignment"]) ??
          readNumber(ctx.data, ["signalStrength", "supportingSignalScore"]);
        if (
          conf >= cfg.inflatedConfidenceThreshold &&
          (signalStrength === undefined || signalStrength < 70)
        ) {
          return halFail({
            field: "confidence",
            message: "Unsupported certainty — confidence inflated vs signals.",
            recommendation: `Lower confidence below ${cfg.inflatedConfidenceThreshold} or strengthen signals.`,
            expected: "signalStrength >= 70",
            actual: { confidence: conf, signalStrength: signalStrength ?? null },
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.confidence.range",
      name: "Confidence Range",
      description: "Confidence must be a finite number in 0–100.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "confidence"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const conf = readNumber(ctx.data, [
          "confidence",
          "conviction",
          "confidenceScore",
        ]);
        if (conf === undefined) return halPass();
        if (!Number.isFinite(conf) || conf < 0 || conf > 100) {
          return halFail({
            field: "confidence",
            message: "Confidence out of valid range.",
            recommendation: "Use confidence in 0–100.",
            expected: "0–100",
            actual: conf,
          });
        }
        return halPass();
      },
    },
  ];
}
