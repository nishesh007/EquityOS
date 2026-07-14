/**
 * Trade setup audit logging rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  appendTradeSetupAudit,
  calculateRiskReward,
  calculateTradeSetupQuality,
  configFromContext,
  isPlainObject,
  readString,
  readTradeLevels,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

export function createTradeSetupAuditRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.audit.trail_writable",
      name: "Trade Setup Audit Trail",
      description:
        "Ensure setup can be audited (id, entry, stop, targets, timestamp).",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "audit"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const setupId = readString(ctx.data, ["setupId", "id", "tradeId"]);
        const levels = readTradeLevels(ctx.data);
        const ts =
          ctx.data.timestamp ??
          ctx.data.ts ??
          ctx.data.createdAt ??
          ctx.data.entryTimestamp;

        if (
          !setupId ||
          levels.entry === undefined ||
          levels.stopLoss === undefined ||
          levels.primaryTarget === undefined ||
          ts === undefined ||
          ts === null ||
          ts === ""
        ) {
          return tsFail({
            field: "audit",
            message: "Insufficient fields for trade setup audit trail.",
            recommendation:
              "Include setupId, entry, stopLoss, primaryTarget, and timestamp.",
            actual: {
              setupId: setupId ?? null,
              entry: levels.entry ?? null,
              stopLoss: levels.stopLoss ?? null,
              primaryTarget: levels.primaryTarget ?? null,
              timestamp: ts ?? null,
            },
          });
        }

        const cfg = configFromContext(ctx);
        const quality = calculateTradeSetupQuality(ctx.data, cfg);
        const rr = calculateRiskReward(ctx.data);
        appendTradeSetupAudit({
          setupId,
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
          validationTime:
            typeof ts === "string" || typeof ts === "number"
              ? String(ts)
              : new Date().toISOString(),
          failedRules: [],
          warnings: [],
        });

        return tsPass();
      },
    },
  ];
}
