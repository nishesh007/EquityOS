/**
 * Trade setup consistency validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  calculateRiskReward,
  configFromContext,
  isPlainObject,
  readSide,
  readString,
  readTradeLevels,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

export function createTradeSetupConsistencyRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.consistency.side_required",
      name: "Trade Side Required",
      description: "Every setup must declare LONG or SHORT side.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "consistency"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const side = readSide(ctx.data);
        if (!side || !cfg.supportedSides.includes(side)) {
          return tsFail({
            field: "side",
            message: "Missing or unsupported trade side.",
            recommendation: "Set side to LONG or SHORT.",
            expected: cfg.supportedSides,
            actual: ctx.data.side ?? ctx.data.direction ?? null,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.consistency.entry_above_target",
      name: "Entry Not Above Target",
      description: "Reject impossible long setups where entry is above target.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "consistency"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const { entry, primaryTarget } = readTradeLevels(ctx.data);
        if (entry === undefined || primaryTarget === undefined) return tsPass();
        if (side === "LONG" && entry > primaryTarget) {
          return tsFail({
            field: "entry",
            message: "Entry above target for long trade.",
            recommendation: "Ensure entry < primaryTarget for LONG.",
            expected: `entry < ${primaryTarget}`,
            actual: entry,
          });
        }
        if (side === "SHORT" && entry < primaryTarget) {
          return tsFail({
            field: "entry",
            message: "Entry below target for short trade.",
            recommendation: "Ensure entry > primaryTarget for SHORT.",
            expected: `entry > ${primaryTarget}`,
            actual: entry,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.consistency.stop_above_target",
      name: "Stop Not Beyond Target",
      description: "Reject setups where stop sits on the wrong side of target.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "consistency"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const { stopLoss, primaryTarget } = readTradeLevels(ctx.data);
        if (stopLoss === undefined || primaryTarget === undefined) return tsPass();
        if (side === "LONG" && stopLoss >= primaryTarget) {
          return tsFail({
            field: "stopLoss",
            message: "Stop is at or above target for long trade.",
            recommendation: "Place stop below entry and target for LONG.",
            expected: `stopLoss < ${primaryTarget}`,
            actual: stopLoss,
          });
        }
        if (side === "SHORT" && stopLoss <= primaryTarget) {
          return tsFail({
            field: "stopLoss",
            message: "Stop is at or below target for short trade.",
            recommendation: "Place stop above entry and target for SHORT.",
            expected: `stopLoss > ${primaryTarget}`,
            actual: stopLoss,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.consistency.negative_rr",
      name: "No Negative Risk Reward",
      description: "Reject negative RR / impossible reward.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "consistency"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const rr = calculateRiskReward(ctx.data);
        if (!rr) return tsPass();
        if (rr.riskRewardRatio < 0 || rr.absoluteReward < 0) {
          return tsFail({
            field: "riskReward",
            message: "Negative risk-reward / impossible reward.",
            recommendation: "Fix entry, stop, and target geometry.",
            actual: rr,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.consistency.impossible_downside",
      name: "No Impossible Downside",
      description: "Reject setups with zero/negative absolute risk.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "consistency"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const rr = calculateRiskReward(ctx.data);
        if (!rr) return tsPass();
        if (rr.absoluteRisk <= 0) {
          return tsFail({
            field: "stopLoss",
            message: "Impossible downside — zero absolute risk.",
            recommendation: "Separate stop from entry.",
            actual: rr.absoluteRisk,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.consistency.duplicate_setup",
      name: "Duplicate Setup",
      description: "Reject setups marked as duplicates.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "consistency", "duplicate"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        if (
          ctx.data.duplicate === true ||
          ctx.data.isDuplicate === true ||
          hasDuplicateId(ctx.data)
        ) {
          return tsFail({
            field: "setupId",
            message: "Duplicate trade setup detected.",
            recommendation: "Deduplicate before publication.",
            actual: {
              setupId: readString(ctx.data, ["setupId", "id"]),
              duplicateOf: ctx.data.duplicateOf ?? null,
            },
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.consistency.conflicting_setups",
      name: "Conflicting Setups",
      description: "Reject explicitly conflicting long/short pairs on same symbol.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "consistency", "conflict"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        if (
          ctx.data.conflicting === true ||
          ctx.data.hasConflict === true ||
          (Array.isArray(ctx.data.conflicts) && ctx.data.conflicts.length > 0)
        ) {
          return tsFail({
            field: "conflicts",
            message: "Conflicting trade setups present.",
            recommendation: "Resolve opposing setups before display.",
            actual: ctx.data.conflicts ?? true,
          });
        }
        return tsPass();
      },
    },
  ];
}

function hasDuplicateId(data: Record<string, unknown>): boolean {
  const dup = data.duplicateOf ?? data.duplicateSetupId;
  return typeof dup === "string" && dup.trim().length > 0;
}
