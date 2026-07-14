/**
 * Source verification rules — every fact must cite validated internal data.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  evidenceSection,
  hasNonEmptyText,
  isPlainObject,
  readString,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

const SOURCE_KEYS = [
  ["priceSource", "Price"],
  ["financialSource", "Financial"],
  ["indicatorSource", "Indicator"],
  ["corporateActionSource", "Corporate action"],
  ["historicalSource", "Historical"],
  ["recommendationSource", "Recommendation"],
] as const;

export function createSourceVerificationRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.source.evidence_required",
      name: "Evidence Block Required",
      description: "AI factual outputs must include an evidence / sources block.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "source", "evidence"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        const evidence = evidenceSection(ctx.data);
        const hasEvidence =
          hasNonEmptyText(ctx.data.evidence) ||
          hasNonEmptyText(ctx.data.sources) ||
          Object.keys(evidence).some((k) =>
            SOURCE_KEYS.some(([sk]) => sk === k)
          ) ||
          (Array.isArray(ctx.data.evidenceSources) &&
            ctx.data.evidenceSources.length > 0);

        if (!hasEvidence) {
          if (cfg.mode === "relaxed" && ctx.data.opinionOnly === true) {
            return halPass();
          }
          return halFail({
            field: "evidence",
            message: "No evidence sources attached to AI output.",
            recommendation:
              "Attach evidence with price/financial/indicator/historical sources.",
            expected: "evidence or sources block",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.source.price",
      name: "Price Source Verified",
      description: "Price-related claims must cite a price source.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "source", "price"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const mentionsPrice =
          ctx.data.mentionsPrice === true ||
          hasNonEmptyText(ctx.data.priceDiscussion) ||
          readString(ctx.data, ["currentPrice", "ltp", "price"]) !== undefined;
        if (!mentionsPrice) return halPass();
        const evidence = evidenceSection(ctx.data);
        const src = readString(
          { ...ctx.data, ...evidence },
          ["priceSource"]
        );
        if (!src) {
          return halFail({
            field: "priceSource",
            message: "Price claim without price source.",
            recommendation: "Set evidence.priceSource to a validated market feed.",
            expected: "priceSource",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.source.financial",
      name: "Financial Source Verified",
      description: "Financial claims must cite a financial source.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "source", "financial"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const mentionsFinancial =
          ctx.data.mentionsFinancials === true ||
          hasNonEmptyText(ctx.data.financialDiscussion) ||
          ["revenue", "profit", "eps", "cashFlow", "margins"].some(
            (k) => k in ctx.data
          );
        if (!mentionsFinancial) return halPass();
        const evidence = evidenceSection(ctx.data);
        const src = readString(
          { ...ctx.data, ...evidence },
          ["financialSource"]
        );
        if (!src) {
          return halFail({
            field: "financialSource",
            message: "Financial claim without financial source.",
            recommendation:
              "Set evidence.financialSource to validated fundamentals.",
            expected: "financialSource",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.source.indicator",
      name: "Indicator Source Verified",
      description: "Technical indicator claims must cite an indicator source.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["hallucination", "source", "indicator"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const mentionsIndicators =
          ctx.data.mentionsIndicators === true ||
          hasNonEmptyText(ctx.data.technicalDiscussion) ||
          isPlainObject(ctx.data.technical) ||
          isPlainObject(ctx.data.indicators);
        if (!mentionsIndicators) return halPass();
        const evidence = evidenceSection(ctx.data);
        const src = readString(
          { ...ctx.data, ...evidence },
          ["indicatorSource"]
        );
        if (!src) {
          return halFail({
            field: "indicatorSource",
            message: "Indicator claim without indicator source.",
            recommendation:
              "Set evidence.indicatorSource to validated technical data.",
            expected: "indicatorSource",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.source.coverage",
      name: "Source Coverage Threshold",
      description: "Require minimum evidence source coverage in strict mode.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "source"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return halPass();
        const evidence = evidenceSection(ctx.data);
        const present = SOURCE_KEYS.filter(([key]) =>
          hasNonEmptyText(evidence[key] ?? ctx.data[key])
        ).length;
        if (present < 2) {
          return halFail({
            field: "evidence",
            message: "Insufficient source coverage in strict mode.",
            recommendation:
              "Provide at least two validated sources (price, financial, indicator, etc.).",
            expected: ">= 2 sources",
            actual: present,
          });
        }
        return halPass();
      },
    },
  ];
}
