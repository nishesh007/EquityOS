/**
 * Trade setup position sizing validation rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  calculateRiskReward,
  configFromContext,
  isPlainObject,
  readNumber,
  readTradeLevels,
  section,
  tsFail,
  tsPass,
  type TradeSetupValidationConfig,
} from "./TradeSetupRuleRegistry";

function sizingSource(data: Record<string, unknown>): Record<string, unknown> {
  const nested = section(data, ["position", "positionSizing", "sizing"]);
  return { ...data, ...nested };
}

export function createPositionSizingValidationRules(
  _config: TradeSetupValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "ts.position.capital_allocation",
      name: "Capital Allocation Valid",
      description: "Position size relative to capital must be within limits.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "position-sizing"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = sizingSource(ctx.data);
        const capital = readNumber(src, [
          "capital",
          "portfolioValue",
          "accountEquity",
        ]);
        const positionSize = readNumber(src, [
          "positionSize",
          "allocation",
          "notional",
        ]);
        const allocationPct = readNumber(src, [
          "allocationPercent",
          "positionSizePercent",
          "capitalAllocationPercent",
        ]);
        if (allocationPct !== undefined) {
          if (allocationPct > cfg.maxPositionSizePercent) {
            return tsFail({
              field: "positionSize",
              message: "Capital allocation exceeds maximum position size.",
              recommendation: `Keep allocation <= ${cfg.maxPositionSizePercent}% of capital.`,
              expected: `<= ${cfg.maxPositionSizePercent}`,
              actual: allocationPct,
            });
          }
          return tsPass();
        }
        if (
          capital !== undefined &&
          positionSize !== undefined &&
          capital > 0
        ) {
          const pct = (positionSize / capital) * 100;
          if (pct > cfg.maxPositionSizePercent) {
            return tsFail({
              field: "positionSize",
              message: "Capital allocation exceeds maximum position size.",
              recommendation: `Keep allocation <= ${cfg.maxPositionSizePercent}% of capital.`,
              expected: `<= ${cfg.maxPositionSizePercent}`,
              actual: pct,
            });
          }
        }
        return tsPass();
      },
    },
    {
      id: "ts.position.portfolio_exposure",
      name: "Maximum Portfolio Exposure",
      description: "Total portfolio exposure for this setup must respect limits.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "position-sizing"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = sizingSource(ctx.data);
        const exposure = readNumber(src, [
          "portfolioExposure",
          "portfolioExposurePercent",
          "exposurePercent",
        ]);
        if (exposure === undefined) return tsPass();
        if (exposure > cfg.maxPortfolioExposurePercent) {
          return tsFail({
            field: "portfolioExposure",
            message: "Portfolio exposure exceeds configured maximum.",
            recommendation: `Reduce exposure to <= ${cfg.maxPortfolioExposurePercent}%.`,
            expected: `<= ${cfg.maxPortfolioExposurePercent}`,
            actual: exposure,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.position.sector_exposure",
      name: "Sector Exposure Limit",
      description: "Sector concentration must remain within configured bounds.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "position-sizing", "sector"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = sizingSource(ctx.data);
        const sector = readNumber(src, [
          "sectorExposure",
          "sectorExposurePercent",
          "sectorPercent",
        ]);
        if (sector === undefined) return tsPass();
        if (sector > cfg.maxSectorExposurePercent) {
          return tsFail({
            field: "sectorExposure",
            message: "Sector exposure exceeds configured maximum.",
            recommendation: `Reduce sector exposure to <= ${cfg.maxSectorExposurePercent}%.`,
            expected: `<= ${cfg.maxSectorExposurePercent}`,
            actual: sector,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.position.concentration",
      name: "Position Concentration",
      description: "Reject extreme single-name concentration.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "position-sizing"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = sizingSource(ctx.data);
        const concentration = readNumber(src, [
          "concentration",
          "concentrationPercent",
          "singleNamePercent",
        ]);
        if (concentration === undefined) return tsPass();
        if (concentration > cfg.maxPositionSizePercent * 1.5) {
          return tsFail({
            field: "concentration",
            message: "Position concentration is excessive.",
            recommendation: "Reduce single-name weight for diversification.",
            expected: `<= ${cfg.maxPositionSizePercent * 1.5}`,
            actual: concentration,
          });
        }
        return tsPass();
      },
    },
    {
      id: "ts.position.risk_per_trade",
      name: "Risk Per Trade",
      description: "Monetary risk vs portfolio must respect max risk per trade.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["trade-setup", "position-sizing", "risk"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = sizingSource(ctx.data);
        const capital = readNumber(src, [
          "capital",
          "portfolioValue",
          "accountEquity",
        ]);
        const riskPerTradePct = readNumber(src, [
          "riskPerTradePercent",
          "riskPerTrade",
        ]);
        if (riskPerTradePct !== undefined) {
          if (riskPerTradePct > cfg.maxRiskPerTradePercent) {
            return tsFail({
              field: "riskPerTrade",
              message: "Risk per trade exceeds configured maximum.",
              recommendation: `Cap risk per trade at ${cfg.maxRiskPerTradePercent}% of capital.`,
              expected: `<= ${cfg.maxRiskPerTradePercent}`,
              actual: riskPerTradePct,
            });
          }
          return tsPass();
        }
        const quantity = readNumber(src, ["quantity", "shares", "units"]);
        const levels = readTradeLevels(ctx.data);
        const rr = calculateRiskReward(ctx.data);
        if (
          capital !== undefined &&
          capital > 0 &&
          quantity !== undefined &&
          rr &&
          levels.entry !== undefined
        ) {
          const monetaryRisk = rr.absoluteRisk * quantity;
          const pct = (monetaryRisk / capital) * 100;
          if (pct > cfg.maxRiskPerTradePercent) {
            return tsFail({
              field: "riskPerTrade",
              message: "Computed risk per trade exceeds maximum.",
              recommendation: `Reduce quantity so risk <= ${cfg.maxRiskPerTradePercent}% of capital.`,
              expected: `<= ${cfg.maxRiskPerTradePercent}`,
              actual: pct,
            });
          }
        }
        return tsPass();
      },
    },
    {
      id: "ts.position.diversification",
      name: "Portfolio Diversification",
      description: "Ensure remaining diversification capacity is adequate.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["trade-setup", "position-sizing", "diversification"],
      author: "equityos-trade-setup",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return tsPass();
        const cfg = configFromContext(ctx);
        const src = sizingSource(ctx.data);
        const diversification = readNumber(src, [
          "diversification",
          "diversificationPercent",
          "freeExposurePercent",
        ]);
        if (diversification === undefined) return tsPass();
        if (diversification < cfg.minDiversificationPercent) {
          return tsFail({
            field: "diversification",
            message: "Portfolio diversification below minimum.",
            recommendation: `Maintain diversification >= ${cfg.minDiversificationPercent}%.`,
            expected: `>= ${cfg.minDiversificationPercent}`,
            actual: diversification,
          });
        }
        return tsPass();
      },
    },
  ];
}
