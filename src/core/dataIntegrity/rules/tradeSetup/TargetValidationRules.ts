/**
 * Trade setup target price validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  isFiniteNumber,
  isFinitePositive,
  isPlainObject,
  readSide,
  readTradeLevels,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

export function createTargetValidationRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.target.primary_exists",
      name: "Primary Target Exists",
      description: "Every trade setup must include a primary target.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "target"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { primaryTarget } = readTradeLevels(ctx.data);
        if (primaryTarget === undefined) {
          return tsFail({
            field: "primaryTarget",
            message: "Primary target is missing.",
            recommendation: "Provide primaryTarget / target / targets.primary.",
            actual: null,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.target.positive_finite",
      name: "Targets Positive And Finite",
      description: "All provided targets must be positive and finite.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "target"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const { primaryTarget, secondaryTarget, finalTarget } =
          readTradeLevels(ctx.data);
        const targets = [
          ["primaryTarget", primaryTarget],
          ["secondaryTarget", secondaryTarget],
          ["finalTarget", finalTarget],
        ] as const;
        for (const [field, value] of targets) {
          if (value === undefined) continue;
          if (!isFiniteNumber(value) || Number.isNaN(value)) {
            return tsFail({
              field,
              message: `${field} is non-finite or NaN.`,
              recommendation: "Use finite numeric target prices.",
              actual: value,
            });
          }
          if (!isFinitePositive(value)) {
            return tsFail({
              field,
              message: `${field} must be positive.`,
              recommendation: "Set all targets > 0.",
              expected: "> 0",
              actual: value,
            });
          }
        }
        return tsPass();
      },
    },
    {
      id: "ts.target.side_alignment",
      name: "Targets Side Alignment",
      description:
        "Targets must be above entry for longs and below entry for shorts.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "target"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const { entry, primaryTarget, secondaryTarget, finalTarget } =
          readTradeLevels(ctx.data);
        if (entry === undefined) return tsPass();
        const targets = [
          ["primaryTarget", primaryTarget],
          ["secondaryTarget", secondaryTarget],
          ["finalTarget", finalTarget],
        ] as const;
        for (const [field, value] of targets) {
          if (value === undefined) continue;
          if (side === "LONG" && value <= entry) {
            return tsFail({
              field,
              message: `${field} must be above entry for long trades.`,
              recommendation: `Place ${field} > entry for LONG.`,
              expected: `> ${entry}`,
              actual: value,
            });
          }
          if (side === "SHORT" && value >= entry) {
            return tsFail({
              field,
              message: `${field} must be below entry for short trades.`,
              recommendation: `Place ${field} < entry for SHORT.`,
              expected: `< ${entry}`,
              actual: value,
            });
          }
        }
        return tsPass();
      },
    },
    {
      id: "ts.target.ordered",
      name: "Targets Ordered Correctly",
      description:
        "Primary < secondary < final for longs; reverse order for shorts.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "target"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const { primaryTarget, secondaryTarget, finalTarget } =
          readTradeLevels(ctx.data);
        const ordered = [primaryTarget, secondaryTarget, finalTarget].filter(
          (v): v is number => v !== undefined
        );
        if (ordered.length < 2) return tsPass();

        for (let i = 1; i < ordered.length; i++) {
          if (side === "LONG" && ordered[i]! <= ordered[i - 1]!) {
            return tsFail({
              field: "targets",
              message: "Long targets are not ascending.",
              recommendation:
                "Order as primary < secondary < final for LONG.",
              expected: "ascending targets",
              actual: {
                primaryTarget,
                secondaryTarget,
                finalTarget,
              },
            });
          }
          if (side === "SHORT" && ordered[i]! >= ordered[i - 1]!) {
            return tsFail({
              field: "targets",
              message: "Short targets are not descending.",
              recommendation:
                "Order as primary > secondary > final for SHORT.",
              expected: "descending targets",
              actual: {
                primaryTarget,
                secondaryTarget,
                finalTarget,
              },
            });
          }
        }
        return tsPass();
      },
    },
    {
      id: "ts.target.distance_reasonable",
      name: "Target Distance Reasonable",
      description: "Primary target distance must be within configured bounds.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "target"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const { entry, primaryTarget } = readTradeLevels(ctx.data);
        if (entry === undefined || primaryTarget === undefined) return tsPass();
        const distancePct =
          (Math.abs(primaryTarget - entry) / entry) * 100;
        if (distancePct < cfg.minTargetDistancePercent) {
          return tsFail({
            field: "primaryTarget",
            message: "Target distance too small to be meaningful.",
            recommendation: `Increase target to at least ${cfg.minTargetDistancePercent}% from entry.`,
            expected: `>= ${cfg.minTargetDistancePercent}%`,
            actual: distancePct,
          });
        }
        if (distancePct > cfg.maxTargetDistancePercent) {
          return tsFail({
            field: "primaryTarget",
            message: "Target distance unrealistically large.",
            recommendation: `Reduce target to at most ${cfg.maxTargetDistancePercent}% from entry.`,
            expected: `<= ${cfg.maxTargetDistancePercent}%`,
            actual: distancePct,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.target.achievable",
      name: "Target Achievable",
      description: "Flag targets marked unachievable or beyond resistance extremes.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "target"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        if (
          ctx.data.targetAchievable === false ||
          ctx.data.achievable === false
        ) {
          return tsFail({
            field: "primaryTarget",
            message: "Target explicitly marked as not achievable.",
            recommendation: "Revise target or wait for better setup.",
            actual: false,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.target.secondary_final_optional",
      name: "Secondary And Final Target Presence",
      description: "Warn when secondary/final targets are omitted in strict mode.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "target"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return tsPass();
        const { secondaryTarget, finalTarget } = readTradeLevels(ctx.data);
        if (secondaryTarget === undefined || finalTarget === undefined) {
          return tsFail({
            field: "targets",
            message: "Secondary/final targets missing in strict mode.",
            recommendation:
              "Provide secondary and final targets for institutional setups.",
            actual: { secondaryTarget, finalTarget },
          });
        }
        return tsPass();
      },
    },
  ];
}
