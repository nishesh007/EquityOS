/**
 * Trade setup support & resistance validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  isPlainObject,
  readNumber,
  readSide,
  readTradeLevels,
  section,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

function srSource(data: Record<string, unknown>): Record<string, unknown> {
  const nested = section(data, ["supportResistance", "levels"]);
  return { ...data, ...nested };
}

export function createSupportResistanceValidationRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.sr.entry_near_support",
      name: "Entry Near Support",
      description: "Long entries should be near support; shorts near resistance.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "support-resistance"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const { entry } = readTradeLevels(ctx.data);
        if (entry === undefined) return tsPass();
        const src = srSource(ctx.data);
        const support = readNumber(src, ["support", "supportLevel"]);
        const resistance = readNumber(src, ["resistance", "resistanceLevel"]);
        if (side === "LONG" && support !== undefined) {
          const dist = ((entry - support) / entry) * 100;
          if (dist > 5 || entry < support) {
            return tsFail({
              field: "entry",
              message: "Long entry not near support.",
              recommendation: "Enter closer to support for LONG setups.",
              expected: "entry within ~5% above support",
              actual: { entry, support, distancePct: dist },
            });
          }
        }
        if (side === "SHORT" && resistance !== undefined) {
          const dist = ((resistance - entry) / entry) * 100;
          if (dist > 5 || entry > resistance) {
            return tsFail({
              field: "entry",
              message: "Short entry not near resistance.",
              recommendation: "Enter closer to resistance for SHORT setups.",
              expected: "entry within ~5% below resistance",
              actual: { entry, resistance, distancePct: dist },
            });
          }
        }
        return tsPass();
      },
    },
    {
      id: "ts.sr.target_near_resistance",
      name: "Target Near Resistance",
      description: "Primary target should align with opposing S/R.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "support-resistance"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const { primaryTarget } = readTradeLevels(ctx.data);
        if (primaryTarget === undefined) return tsPass();
        const src = srSource(ctx.data);
        const support = readNumber(src, ["support", "supportLevel"]);
        const resistance = readNumber(src, ["resistance", "resistanceLevel"]);
        if (side === "LONG" && resistance !== undefined) {
          const dist =
            (Math.abs(primaryTarget - resistance) / resistance) * 100;
          if (dist > 8) {
            return tsFail({
              field: "primaryTarget",
              message: "Long target far from resistance.",
              recommendation: "Align primary target near resistance.",
              expected: "within ~8% of resistance",
              actual: { primaryTarget, resistance, distancePct: dist },
            });
          }
        }
        if (side === "SHORT" && support !== undefined) {
          const dist = (Math.abs(primaryTarget - support) / support) * 100;
          if (dist > 8) {
            return tsFail({
              field: "primaryTarget",
              message: "Short target far from support.",
              recommendation: "Align primary target near support.",
              expected: "within ~8% of support",
              actual: { primaryTarget, support, distancePct: dist },
            });
          }
        }
        return tsPass();
      },
    },
    {
      id: "ts.sr.stop_below_support",
      name: "Stop Below Support",
      description: "Long stop below support; short stop above resistance.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "support-resistance"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const side = readSide(ctx.data) ?? "LONG";
        const { stopLoss } = readTradeLevels(ctx.data);
        if (stopLoss === undefined) return tsPass();
        const src = srSource(ctx.data);
        const support = readNumber(src, ["support", "supportLevel"]);
        const resistance = readNumber(src, ["resistance", "resistanceLevel"]);
        if (side === "LONG" && support !== undefined && stopLoss > support) {
          return tsFail({
            field: "stopLoss",
            message: "Long stop not below support.",
            recommendation: "Place LONG stop below support.",
            expected: `<= ${support}`,
            actual: stopLoss,
          });
        }
        if (
          side === "SHORT" &&
          resistance !== undefined &&
          stopLoss < resistance
        ) {
          return tsFail({
            field: "stopLoss",
            message: "Short stop not above resistance.",
            recommendation: "Place SHORT stop above resistance.",
            expected: `>= ${resistance}`,
            actual: stopLoss,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.sr.breakout_confirmation",
      name: "Breakout Confirmation",
      description: "Require breakout confirmation when setup claims a breakout.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "support-resistance", "breakout"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const src = srSource(ctx.data);
        const isBreakout =
          ctx.data.breakout === true ||
          src.breakout === true ||
          ctx.data.setupType === "BREAKOUT" ||
          src.setupType === "BREAKOUT";
        if (!isBreakout) return tsPass();
        const confirmed =
          ctx.data.breakoutConfirmed === true ||
          src.breakoutConfirmed === true ||
          ctx.data.confirmation === true;
        if (!confirmed) {
          return tsFail({
            field: "breakout",
            message: "Breakout setup without confirmation.",
            recommendation: "Wait for volume/close confirmation before publishing.",
            expected: true,
            actual: false,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.sr.false_breakout",
      name: "False Breakout Detection",
      description: "Reject setups flagged as false breakouts.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "support-resistance", "breakout"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const src = srSource(ctx.data);
        if (
          ctx.data.falseBreakout === true ||
          src.falseBreakout === true ||
          ctx.data.fakeout === true
        ) {
          return tsFail({
            field: "breakout",
            message: "False breakout detected.",
            recommendation: "Do not publish until a valid breakout reclaims.",
            actual: true,
          });
        }
        return tsPass();
      },
    },
  ];
}
