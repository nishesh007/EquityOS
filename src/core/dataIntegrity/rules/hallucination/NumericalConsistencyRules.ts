/**
 * Numerical consistency rules — claimed numbers must match validated datasets.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  evidenceSection,
  isPlainObject,
  numericDeviationPercent,
  readNumber,
  section,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

const NUMERIC_FIELDS: Array<{
  claimKeys: string[];
  evidenceKeys: string[];
  field: string;
}> = [
  { claimKeys: ["revenue", "claimedRevenue"], evidenceKeys: ["revenue"], field: "revenue" },
  { claimKeys: ["profit", "netIncome", "claimedProfit"], evidenceKeys: ["profit", "netIncome"], field: "profit" },
  { claimKeys: ["cashFlow", "claimedCashFlow"], evidenceKeys: ["cashFlow", "operatingCashFlow"], field: "cashFlow" },
  { claimKeys: ["eps", "claimedEps"], evidenceKeys: ["eps"], field: "eps" },
  { claimKeys: ["marketCap", "claimedMarketCap"], evidenceKeys: ["marketCap"], field: "marketCap" },
  { claimKeys: ["growth", "revenueGrowth", "claimedGrowth"], evidenceKeys: ["growth", "revenueGrowth"], field: "growth" },
  { claimKeys: ["targetPrice", "priceTarget", "target"], evidenceKeys: ["targetPrice", "primaryTarget", "target"], field: "target" },
  { claimKeys: ["stopLoss", "stop"], evidenceKeys: ["stopLoss", "stop"], field: "stopLoss" },
  { claimKeys: ["riskReward", "rr"], evidenceKeys: ["riskReward", "rr"], field: "riskReward" },
];

export function createNumericalConsistencyRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.numerical.no_inconsistency_flag",
      name: "No Numerical Inconsistency Flag",
      description: "Reject outputs flagged for numerical inconsistency.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "numerical"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          ctx.data.numericalInconsistency === true ||
          ctx.data.hasNumericalErrors === true
        ) {
          return halFail({
            field: "numbers",
            message: "Numerical inconsistency flagged.",
            recommendation: "Reconcile all figures with validated datasets.",
            actual: true,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.numerical.match_evidence",
      name: "Numbers Match Evidence",
      description: "Claimed financials/ratios must match validated evidence within tolerance.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "numerical"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        const evidence = evidenceSection(ctx.data);
        const financial = section(evidence, ["financial", "fundamentals", "metrics"]);
        const trade = section(evidence, ["tradeSetup", "setup", "levels"]);
        const pool = { ...evidence, ...financial, ...trade };

        for (const spec of NUMERIC_FIELDS) {
          const claimed = readNumber(ctx.data, spec.claimKeys);
          if (claimed === undefined) continue;
          const actual = readNumber(pool, spec.evidenceKeys);
          if (actual === undefined) continue;
          const deviation = numericDeviationPercent(claimed, actual);
          if (deviation > cfg.maxNumericDeviationPercent) {
            return halFail({
              field: spec.field,
              message: `${spec.field} does not match validated evidence.`,
              recommendation: `Align ${spec.field} within ${cfg.maxNumericDeviationPercent}% of evidence.`,
              expected: actual,
              actual: { claimed, deviationPct: deviation },
            });
          }
        }
        return halPass();
      },
    },
    {
      id: "hal.numerical.percentages",
      name: "Percentage Sanity",
      description: "Percentages should be finite and within a sane range when claimed.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["hallucination", "numerical"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const pctFields = [
          "growth",
          "revenueGrowth",
          "margin",
          "profitMargin",
          "riskPercent",
          "rewardPercent",
        ];
        for (const field of pctFields) {
          const v = readNumber(ctx.data, [field]);
          if (v === undefined) continue;
          if (!Number.isFinite(v) || Number.isNaN(v)) {
            return halFail({
              field,
              message: `${field} is non-finite.`,
              recommendation: "Use finite percentage values.",
              actual: v,
            });
          }
          if (Math.abs(v) > 1000) {
            return halFail({
              field,
              message: `${field} percentage is unrealistically large.`,
              recommendation: "Verify percentage units and magnitude.",
              expected: "abs(value) <= 1000",
              actual: v,
            });
          }
        }
        return halPass();
      },
    },
    {
      id: "hal.numerical.ratios",
      name: "Ratio Sanity",
      description: "Key ratios must be finite when present.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["hallucination", "numerical", "ratios"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const ratios = [
          "pe",
          "pb",
          "roe",
          "roce",
          "debtToEquity",
          "riskReward",
          "rr",
        ];
        for (const field of ratios) {
          const v = readNumber(ctx.data, [field]);
          if (v === undefined) continue;
          if (!Number.isFinite(v) || Number.isNaN(v)) {
            return halFail({
              field,
              message: `${field} ratio is non-finite.`,
              recommendation: "Provide finite ratio from validated data.",
              actual: v,
            });
          }
        }
        return halPass();
      },
    },
  ];
}
