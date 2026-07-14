/**
 * AI fact validation rules — detect fabricated / unsupported facts.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  evidenceSection,
  hasNonEmptyText,
  isPlainObject,
  readNumber,
  statementsOf,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

function hasFabricationFlags(data: Record<string, unknown>): string | undefined {
  const flags: Array<[string, string]> = [
    ["fabricated", "Fabricated content flagged"],
    ["hasFabricatedFacts", "Fabricated facts flagged"],
    ["inventedEarnings", "Invented earnings flagged"],
    ["inventedEvents", "Invented events flagged"],
    ["inventedManagementCommentary", "Invented management commentary flagged"],
    ["inventedCorporateActions", "Invented corporate actions flagged"],
    ["inventedAnalystRatings", "Invented analyst ratings flagged"],
    ["inventedGuidance", "Invented guidance flagged"],
    ["inventedFinancialMetrics", "Invented financial metrics flagged"],
  ];
  for (const [key, msg] of flags) {
    if (data[key] === true) return msg;
  }
  return undefined;
}

export function createFactValidationRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.fact.no_fabrication_flags",
      name: "No Fabrication Flags",
      description: "Reject AI output explicitly marked as fabricated.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "fact"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) {
          return halFail({
            field: "facts",
            message: "AI output payload must be an object.",
            recommendation: "Provide a structured AI output object.",
            actual: typeof ctx.data,
          });
        }
        const msg = hasFabricationFlags(ctx.data);
        if (msg) {
          return halFail({
            field: "facts",
            message: msg,
            recommendation: "Remove fabricated claims and ground in validated data.",
            expected: "no fabrication flags",
            actual: true,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.fact.unsupported_statements",
      name: "Unsupported Statements",
      description: "Reject statements marked unsupported or lacking evidence refs.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "fact"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          ctx.data.unsupportedClaims === true ||
          (typeof ctx.data.unsupportedClaimCount === "number" &&
            ctx.data.unsupportedClaimCount > 0)
        ) {
          return halFail({
            field: "statements",
            message: "Unsupported factual claims detected.",
            recommendation: "Attach evidence or remove unsupported statements.",
            actual: ctx.data.unsupportedClaimCount ?? true,
          });
        }
        const statements = statementsOf(ctx.data);
        for (const s of statements) {
          if (!isPlainObject(s)) continue;
          if (s.supported === false || s.fabricated === true) {
            return halFail({
              field: "statements",
              message: "Statement is unsupported or fabricated.",
              recommendation: "Cite validated internal data for every fact.",
              actual: s.text ?? s.claim ?? s,
            });
          }
        }
        return halPass();
      },
    },
    {
      id: "hal.fact.fabricated_numbers",
      name: "Fabricated Numbers",
      description: "Detect numeric claims marked fabricated or without evidence.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "fact", "numerical"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (ctx.data.fabricatedNumbers === true) {
          return halFail({
            field: "numbers",
            message: "Fabricated numbers detected.",
            recommendation: "Replace with values from validated datasets.",
            actual: true,
          });
        }
        const claims = Array.isArray(ctx.data.numericClaims)
          ? ctx.data.numericClaims
          : [];
        for (const c of claims) {
          if (!isPlainObject(c)) continue;
          if (c.fabricated === true || c.verified === false) {
            return halFail({
              field: "numericClaims",
              message: "Numeric claim is fabricated or unverified.",
              recommendation: "Verify against evidence.metrics / validatedData.",
              expected: c.expected ?? "validated number",
              actual: c.value ?? c.claimed ?? c,
            });
          }
        }
        return halPass();
      },
    },
    {
      id: "hal.fact.invented_earnings",
      name: "Invented Earnings",
      description: "Reject invented earnings figures not present in evidence.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "fact", "earnings"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (ctx.data.inventedEarnings === true) {
          return halFail({
            field: "earnings",
            message: "Invented earnings detected.",
            recommendation: "Use validated earnings from financial source.",
            actual: true,
          });
        }
        const claimed = readNumber(ctx.data, [
          "claimedEps",
          "claimedEarnings",
          "eps",
        ]);
        const evidence = evidenceSection(ctx.data);
        const financial = isPlainObject(evidence.financial)
          ? (evidence.financial as Record<string, unknown>)
          : evidence;
        const actual = readNumber(financial, ["eps", "earnings", "netIncome"]);
        if (
          claimed !== undefined &&
          actual === undefined &&
          !hasNonEmptyText(evidence.financialSource ?? ctx.data.financialSource)
        ) {
          return halFail({
            field: "earnings",
            message: "Earnings claimed without validated financial evidence.",
            recommendation: "Provide financialSource and validated EPS/earnings.",
            expected: "validated earnings in evidence",
            actual: claimed,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.fact.invented_targets",
      name: "Invented Targets",
      description: "Reject invented price targets without setup/evidence backing.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "fact", "target"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (ctx.data.inventedTargets === true) {
          return halFail({
            field: "target",
            message: "Invented price targets detected.",
            recommendation: "Derive targets from validated levels or remove.",
            actual: true,
          });
        }
        const target = readNumber(ctx.data, [
          "targetPrice",
          "priceTarget",
          "target",
        ]);
        const evidence = evidenceSection(ctx.data);
        const validatedTarget = readNumber(
          { ...evidence, ...(isPlainObject(evidence.tradeSetup) ? (evidence.tradeSetup as Record<string, unknown>) : {}) },
          ["targetPrice", "primaryTarget", "target"]
        );
        if (
          target !== undefined &&
          validatedTarget === undefined &&
          ctx.data.targetVerified !== true &&
          !hasNonEmptyText(evidence.recommendationSource)
        ) {
          return halFail({
            field: "target",
            message: "Price target lacks validated evidence.",
            recommendation: "Link target to validated trade setup or research source.",
            expected: "validated target in evidence",
            actual: target,
          });
        }
        return halPass();
      },
    },
  ];
}
