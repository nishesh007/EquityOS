/**
 * Hallucination audit logging rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  appendHallucinationAudit,
  calculateHallucinationScore,
  collectEvidenceSources,
  configFromContext,
  isPlainObject,
  readString,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

export function createHallucinationAuditRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.audit.trail_writable",
      name: "Hallucination Audit Trail",
      description:
        "Ensure AI output can be audited (id, timestamp, evidence sources).",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["hallucination", "audit"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const aiOutputId = readString(ctx.data, [
          "aiOutputId",
          "id",
          "reportId",
          "outputId",
        ]);
        const ts =
          ctx.data.timestamp ??
          ctx.data.ts ??
          ctx.data.generatedAt ??
          ctx.data.createdAt;
        const sources = collectEvidenceSources(ctx.data);

        if (
          !aiOutputId ||
          ts === undefined ||
          ts === null ||
          ts === ""
        ) {
          return halFail({
            field: "audit",
            message: "Insufficient fields for hallucination audit trail.",
            recommendation: "Include aiOutputId and timestamp.",
            actual: {
              aiOutputId: aiOutputId ?? null,
              timestamp: ts ?? null,
              evidenceSources: sources,
            },
          });
        }

        const cfg = configFromContext(ctx);
        const score = calculateHallucinationScore(ctx.data, cfg);
        appendHallucinationAudit({
          aiOutputId,
          validationTimestamp:
            typeof ts === "string" || typeof ts === "number"
              ? String(ts)
              : new Date().toISOString(),
          hallucinationScore: score.score,
          failedRules: [],
          warnings: [],
          evidenceSources: sources,
        });

        return halPass();
      },
    },
  ];
}
