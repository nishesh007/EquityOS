/**
 * Trade setup risk-reward validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  calculateRiskReward,
  configFromContext,
  isPlainObject,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

export function createRiskRewardValidationRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.rr.calculable",
      name: "Risk Reward Calculable",
      description: "Entry, stop, and primary target must allow RR calculation.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "risk-reward"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const rr = calculateRiskReward(ctx.data);
        if (!rr) {
          return tsFail({
            field: "riskReward",
            message: "Unable to calculate risk-reward metrics.",
            recommendation:
              "Provide valid entry, stopLoss, and primaryTarget with non-zero risk.",
            actual: null,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.rr.minimum",
      name: "Minimum Risk Reward",
      description: "RR ratio must meet the configured minimum.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "risk-reward"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const rr = calculateRiskReward(ctx.data);
        if (!rr) return tsPass();
        if (rr.riskRewardRatio < cfg.minRiskReward) {
          return tsFail({
            field: "riskReward",
            message: "Risk-reward below configured minimum.",
            recommendation: `Improve setup until RR >= ${cfg.minRiskReward}.`,
            expected: `>= ${cfg.minRiskReward}`,
            actual: {
              riskRewardRatio: rr.riskRewardRatio,
              absoluteRisk: rr.absoluteRisk,
              absoluteReward: rr.absoluteReward,
              riskPercent: rr.riskPercent,
              rewardPercent: rr.rewardPercent,
            },
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.rr.maximum",
      name: "Maximum Acceptable Risk Reward",
      description: "Reject unrealistically high RR ratios.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "risk-reward"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const rr = calculateRiskReward(ctx.data);
        if (!rr) return tsPass();
        if (rr.riskRewardRatio > cfg.maxRiskReward) {
          return tsFail({
            field: "riskReward",
            message: "Risk-reward unrealistically high.",
            recommendation: `Cap RR at ${cfg.maxRiskReward} or revise levels.`,
            expected: `<= ${cfg.maxRiskReward}`,
            actual: rr.riskRewardRatio,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.rr.negative_or_zero",
      name: "Non Negative Risk Reward",
      description: "Reject negative or zero reward / risk metrics.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "risk-reward"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const rr = calculateRiskReward(ctx.data);
        if (!rr) return tsPass();
        if (rr.absoluteReward <= 0 || rr.riskRewardRatio <= 0) {
          return tsFail({
            field: "riskReward",
            message: "Negative or zero risk-reward.",
            recommendation: "Ensure reward is positive relative to risk.",
            expected: "> 0",
            actual: rr,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.rr.max_risk_percent",
      name: "Maximum Risk Percent",
      description: "Absolute risk as % of entry must not exceed config.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "risk-reward"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const rr = calculateRiskReward(ctx.data);
        if (!rr) return tsPass();
        if (rr.riskPercent > cfg.maxRiskPercent) {
          return tsFail({
            field: "riskPercent",
            message: "Risk percent exceeds maximum acceptable risk.",
            recommendation: `Reduce stop distance so risk% <= ${cfg.maxRiskPercent}.`,
            expected: `<= ${cfg.maxRiskPercent}`,
            actual: rr.riskPercent,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.rr.poor_setup_flag",
      name: "Poor Setup Flag",
      description: "Warn when RR is only marginally above the minimum.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "risk-reward"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const rr = calculateRiskReward(ctx.data);
        if (!rr) return tsPass();
        const marginal = cfg.minRiskReward * 1.1;
        if (
          rr.riskRewardRatio >= cfg.minRiskReward &&
          rr.riskRewardRatio < marginal
        ) {
          return tsFail({
            field: "riskReward",
            message: "Marginal risk-reward — poor setup quality.",
            recommendation: "Prefer setups with clearer asymmetric reward.",
            expected: `>= ${marginal}`,
            actual: rr.riskRewardRatio,
          });
        }
        return tsPass();
      },
    },
  ];
}
