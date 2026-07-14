/**
 * Recommendation audit logging rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  appendRecommendationAudit,
  calculateRecommendationQualityScore,
  configFromContext,
  isPlainObject,
  readAction,
  readString,
  recFail,
  recPass,
  type RecommendationValidationConfig,
} from "./RecommendationRuleRegistry";

export function createRecommendationAuditRules(
  _config: RecommendationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "rec.audit.trail_writable",
      name: "Recommendation Audit Trail",
      description:
        "Ensure recommendation can be audited (action, timestamp, reviewer).",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["recommendation", "audit"],
      author: "equityos-recommendation",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return recPass();
        const action = readAction(ctx.data);
        const ts = ctx.data.timestamp ?? ctx.data.ts ?? ctx.data.generatedAt;
        const reviewer = readString(ctx.data, [
          "reviewer",
          "author",
          "source",
          "engine",
        ]);
        if (!action || ts === undefined || ts === null || ts === "") {
          return recFail({
            field: "audit",
            message: "Insufficient fields for audit trail.",
            recommendation: "Include action, timestamp, and reviewer/source.",
            actual: { action, timestamp: ts ?? null, reviewer: reviewer ?? null },
          });
        }

        // Persist a lightweight audit snapshot when validation reaches this rule.
        const cfg = configFromContext(ctx);
        const quality = calculateRecommendationQualityScore(ctx.data, cfg);
        appendRecommendationAudit({
          recommendation: action,
          timestamp:
            typeof ts === "string" || typeof ts === "number"
              ? String(ts)
              : new Date().toISOString(),
          validationScore: quality.score,
          qualityScore: quality.score,
          failedRules: [],
          warnings: [],
          reviewer: reviewer ?? "recommendation-engine",
        });

        return recPass();
      },
    },
  ];
}
