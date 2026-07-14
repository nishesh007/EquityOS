/**
 * Trade setup lifecycle validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isPlainObject,
  readLifecycleStatus,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

export function createTradeLifecycleRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.lifecycle.status_valid",
      name: "Lifecycle Status Valid",
      description: "Lifecycle status must be a supported institutional state.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "lifecycle"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const raw = ctx.data.status ?? ctx.data.lifecycle ?? ctx.data.state;
        if (raw === undefined || raw === null || raw === "") {
          if (cfg.mode === "strict") {
            return tsFail({
              field: "status",
              message: "Lifecycle status missing in strict mode.",
              recommendation:
                "Set status to CREATED, ACTIVE, TARGET_HIT, STOP_HIT, EXPIRED, CANCELLED, REVALIDATED, or ARCHIVED.",
              actual: null,
            });
          }
          return tsPass();
        }
        const status = readLifecycleStatus(ctx.data);
        if (!status || !cfg.supportedLifecycleStatuses.includes(status)) {
          return tsFail({
            field: "status",
            message: "Unsupported lifecycle status.",
            recommendation: `Use one of: ${cfg.supportedLifecycleStatuses.join(", ")}.`,
            expected: cfg.supportedLifecycleStatuses,
            actual: raw,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.lifecycle.displayable",
      name: "Lifecycle Displayable",
      description:
        "Terminal cancelled/archived/expired setups should not be shown as active calls.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "lifecycle"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const status = readLifecycleStatus(ctx.data);
        if (!status) return tsPass();
        const publishAsActive =
          ctx.data.publishAsActive === true ||
          ctx.data.displayAsActive === true ||
          ctx.data.activeCall === true;
        if (
          publishAsActive &&
          (status === "CANCELLED" ||
            status === "ARCHIVED" ||
            status === "EXPIRED" ||
            status === "STOP_HIT")
        ) {
          return tsFail({
            field: "status",
            message: `Cannot display ${status} setup as an active call.`,
            recommendation: "Only CREATED/ACTIVE/REVALIDATED/TARGET_HIT may be shown as live.",
            expected: ["CREATED", "ACTIVE", "REVALIDATED", "TARGET_HIT"],
            actual: status,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.lifecycle.revalidated",
      name: "Revalidated Freshness",
      description: "Revalidated setups must include a revalidation timestamp.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "lifecycle"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const status = readLifecycleStatus(ctx.data);
        if (status !== "REVALIDATED") return tsPass();
        const ts =
          ctx.data.revalidatedAt ??
          ctx.data.revalidationTimestamp ??
          ctx.data.lastValidatedAt;
        if (ts === undefined || ts === null || ts === "") {
          return tsFail({
            field: "revalidatedAt",
            message: "REVALIDATED setup missing revalidation timestamp.",
            recommendation: "Attach revalidatedAt when marking REVALIDATED.",
            actual: null,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.lifecycle.terminal_consistency",
      name: "Terminal State Consistency",
      description: "TARGET_HIT / STOP_HIT must agree with outcome flags.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "lifecycle"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const status = readLifecycleStatus(ctx.data);
        if (status === "TARGET_HIT" && ctx.data.targetHit === false) {
          return tsFail({
            field: "status",
            message: "TARGET_HIT status but targetHit flag is false.",
            recommendation: "Align status with outcome flags.",
            actual: { status, targetHit: false },
          });
        }
        if (status === "STOP_HIT" && ctx.data.stopHit === false) {
          return tsFail({
            field: "status",
            message: "STOP_HIT status but stopHit flag is false.",
            recommendation: "Align status with outcome flags.",
            actual: { status, stopHit: false },
          });
        }
        return tsPass();
      },
    },
  ];
}
