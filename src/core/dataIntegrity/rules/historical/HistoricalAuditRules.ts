/**
 * Historical performance audit logging rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  appendHistoricalAudit,
  calculateHistoricalScore,
  configFromContext,
  isPlainObject,
  metricsSection,
  readString,
  histFail,
  histPass,
  type HistoricalValidationConfig,
} from "./HistoricalRuleRegistry";

export function createHistoricalAuditRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.audit.trail_writable",
      name: "Historical Audit Trail",
      description:
        "Ensure historical validation can be audited (ids, timestamp, metrics).",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["historical", "audit"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const recommendationId = readString(ctx.data, [
          "recommendationId",
          "recId",
        ]);
        const tradeId = readString(ctx.data, ["tradeId", "setupId"]);
        const id = readString(ctx.data, ["id", "batchId", "reportId"]);
        const ts =
          ctx.data.timestamp ??
          ctx.data.ts ??
          ctx.data.validatedAt ??
          ctx.data.createdAt;

        if (
          (!recommendationId && !tradeId && !id) ||
          ts === undefined ||
          ts === null ||
          ts === ""
        ) {
          return histFail({
            field: "audit",
            message: "Insufficient fields for historical audit trail.",
            recommendation:
              "Include recommendationId/tradeId/id and validation timestamp.",
            actual: {
              recommendationId: recommendationId ?? null,
              tradeId: tradeId ?? null,
              id: id ?? null,
              timestamp: ts ?? null,
            },
          });
        }

        const cfg = configFromContext(ctx);
        const score = calculateHistoricalScore(ctx.data, cfg);
        appendHistoricalAudit({
          recommendationId: recommendationId ?? id,
          tradeId,
          validationTimestamp:
            typeof ts === "string" || typeof ts === "number"
              ? String(ts)
              : new Date().toISOString(),
          performanceScore: score.score,
          historicalMetrics: { ...metricsSection(ctx.data) },
          failedRules: [],
          warnings: [],
        });

        return histPass();
      },
    },
  ];
}
