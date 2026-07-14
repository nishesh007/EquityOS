/**
 * Duplicate / low-information reasoning detection rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  hasNonEmptyText,
  isPlainObject,
  readString,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function createDuplicateReasoningRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.duplicate.explicit",
      name: "Duplicate Reasoning Flag",
      description: "Reject copied / duplicate reasoning flags.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "duplicate"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          ctx.data.duplicateReasoning === true ||
          ctx.data.copiedReasoning === true ||
          ctx.data.isTemplateResponse === true
        ) {
          return halFail({
            field: "reasoning",
            message: "Duplicate or template reasoning detected.",
            recommendation: "Produce original, ticker-specific analysis.",
            actual: true,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.duplicate.repeated_sections",
      name: "Repeated Explanations",
      description: "Detect identical text reused across key sections.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "duplicate"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const sections = [
          readString(ctx.data, ["summary"]),
          readString(ctx.data, ["conclusion"]),
          readString(ctx.data, ["primaryReason", "reason"]),
          readString(ctx.data, ["bullCase"]),
          readString(ctx.data, ["bearCase"]),
        ].filter((v): v is string => !!v && v.length > 40);
        for (let i = 0; i < sections.length; i++) {
          for (let j = i + 1; j < sections.length; j++) {
            if (normalizeText(sections[i]!) === normalizeText(sections[j]!)) {
              return halFail({
                field: "reasoning",
                message: "Repeated identical explanations across sections.",
                recommendation: "Differentiate summary, cases, and conclusion.",
                actual: sections[i],
              });
            }
          }
        }
        return halPass();
      },
    },
    {
      id: "hal.duplicate.generic_conclusion",
      name: "Generic Conclusion",
      description: "Reject low-information / generic conclusions.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "duplicate"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          ctx.data.genericConclusion === true ||
          ctx.data.lowInformation === true
        ) {
          return halFail({
            field: "conclusion",
            message: "Low-information or generic conclusion.",
            recommendation: "Add specific catalysts, risks, and evidence-backed thesis.",
            actual: true,
          });
        }
        const conclusion = readString(ctx.data, [
          "conclusion",
          "primaryReason",
          "reason",
          "summary",
        ]);
        if (!conclusion) return halPass();
        const generics = [
          "the stock looks good",
          "market is uncertain",
          "wait and watch",
          "mixed signals",
          "could go either way",
        ];
        const normalized = normalizeText(conclusion);
        if (generics.some((g) => normalized === g || normalized.includes(g))) {
          return halFail({
            field: "conclusion",
            message: "Generic conclusion with low information content.",
            recommendation: "Replace with specific, evidence-linked analysis.",
            actual: conclusion,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.duplicate.copied_from_previous",
      name: "Copied From Previous Report",
      description: "Detect verbatim copy of previous reasoning.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "duplicate"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const current = readString(ctx.data, [
          "conclusion",
          "primaryReason",
          "reason",
        ]);
        if (!current || !hasNonEmptyText(current)) return halPass();
        const prev = isPlainObject(ctx.data.previousReport)
          ? (ctx.data.previousReport as Record<string, unknown>)
          : isPlainObject(ctx.data.previousRecommendation)
            ? (ctx.data.previousRecommendation as Record<string, unknown>)
            : undefined;
        if (!prev) return halPass();
        const prevText = readString(prev, [
          "conclusion",
          "primaryReason",
          "reason",
          "previousReasoning",
        ]);
        if (prevText && normalizeText(current) === normalizeText(prevText)) {
          return halFail({
            field: "reasoning",
            message: "Reasoning copied verbatim from previous report.",
            recommendation: "Refresh analysis with current evidence.",
            actual: current,
          });
        }
        return halPass();
      },
    },
  ];
}
