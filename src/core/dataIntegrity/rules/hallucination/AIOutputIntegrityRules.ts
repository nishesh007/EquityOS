/**
 * AI output integrity rules — required sections must be internally consistent.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  actionBias,
  configFromContext,
  hasNonEmptyText,
  isPlainObject,
  readAction,
  scoreDirection,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

export function createAIOutputIntegrityRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.integrity.required_sections",
      name: "Required AI Output Sections",
      description: "Strict mode requires institutional report sections.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "integrity"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        const data = ctx.data;
        if (!isPlainObject(data)) return halPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return halPass();
        if (data.skipSectionCheck === true) return halPass();
        const missing = cfg.requiredSections.filter(
          (section) => !hasNonEmptyText(data[section])
        );
        // Allow recommendation via action alias
        const filtered = missing.filter((s) => {
          if (s === "recommendation" && readAction(data)) return false;
          if (s === "keyFindings" && hasNonEmptyText(data.supportingFactors))
            return false;
          return true;
        });
        if (filtered.length > 0) {
          return halFail({
            field: "sections",
            message: "Missing required AI output sections.",
            recommendation: `Provide: ${filtered.join(", ")}.`,
            expected: cfg.requiredSections,
            actual: filtered,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.integrity.bull_bear_balance",
      name: "Bull And Bear Case Balance",
      description: "Bull and bear cases should not be identical or missing one side.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "integrity"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const bull = ctx.data.bullCase;
        const bear = ctx.data.bearCase;
        if (!hasNonEmptyText(bull) && !hasNonEmptyText(bear)) return halPass();
        if (hasNonEmptyText(bull) !== hasNonEmptyText(bear)) {
          return halFail({
            field: "bullCase",
            message: "Only one of bull/bear case provided.",
            recommendation: "Include both bullCase and bearCase for balance.",
            actual: {
              bull: hasNonEmptyText(bull),
              bear: hasNonEmptyText(bear),
            },
          });
        }
        if (
          typeof bull === "string" &&
          typeof bear === "string" &&
          bull.trim().toLowerCase() === bear.trim().toLowerCase()
        ) {
          return halFail({
            field: "bullCase",
            message: "Bull and bear cases are identical.",
            recommendation: "Differentiate upside and downside narratives.",
            actual: bull,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.integrity.conclusion_vs_recommendation",
      name: "Conclusion vs Recommendation Consistency",
      description: "Conclusion tone must align with recommendation action.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "integrity"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const action = readAction(ctx.data);
        const bias = actionBias(action);
        const conclusionBias = scoreDirection(
          ctx.data.conclusionBias ?? ctx.data.conclusionTone
        );
        if (
          bias &&
          conclusionBias &&
          bias !== "neutral" &&
          conclusionBias !== "neutral" &&
          bias !== conclusionBias
        ) {
          return halFail({
            field: "conclusion",
            message: "Conclusion tone conflicts with recommendation.",
            recommendation: "Align conclusionBias with recommendation action.",
            expected: bias,
            actual: conclusionBias,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.integrity.risks_and_catalysts",
      name: "Risks And Catalysts Present",
      description: "Actionable outputs should include risks and catalysts.",
      category: "AI",
      priority: "MEDIUM",
      ruleLevel: "WARNING",
      tags: ["hallucination", "integrity"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return halPass();
        const actionable = !!readAction(ctx.data);
        if (!actionable) return halPass();
        if (!hasNonEmptyText(ctx.data.risks) || !hasNonEmptyText(ctx.data.catalysts)) {
          return halFail({
            field: "risks",
            message: "Missing risks or catalysts for actionable output.",
            recommendation: "Provide both risks and catalysts sections.",
            actual: {
              risks: hasNonEmptyText(ctx.data.risks),
              catalysts: hasNonEmptyText(ctx.data.catalysts),
            },
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.integrity.action_items",
      name: "Action Items Coherence",
      description: "Action items should not conflict with recommendation.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["hallucination", "integrity"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (ctx.data.actionItemsConflict === true) {
          return halFail({
            field: "actionItems",
            message: "Action items conflict with recommendation.",
            recommendation: "Align action items with the stated recommendation.",
            actual: true,
          });
        }
        return halPass();
      },
    },
  ];
}
