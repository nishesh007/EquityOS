/**
 * Reasoning consistency rules — conclusion must match evidence chain.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  hasNonEmptyText,
  isPlainObject,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

export function createReasoningConsistencyRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.reasoning.conclusion_present",
      name: "Conclusion Present",
      description: "AI output must include a conclusion or primary reason.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "reasoning"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          !hasNonEmptyText(
            ctx.data.conclusion ??
              ctx.data.primaryReason ??
              ctx.data.reason ??
              ctx.data.summary
          )
        ) {
          return halFail({
            field: "conclusion",
            message: "Missing conclusion / primary reasoning.",
            recommendation: "Provide conclusion or primaryReason grounded in evidence.",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.reasoning.chain_complete",
      name: "Reasoning Chain Complete",
      description: "Reject incomplete reasoning chains.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "reasoning"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          ctx.data.reasoningIncomplete === true ||
          ctx.data.incompleteReasoning === true
        ) {
          return halFail({
            field: "reasoning",
            message: "Reasoning chain incomplete.",
            recommendation: "Complete evidence → analysis → conclusion chain.",
            actual: true,
          });
        }
        const hasEvidence = hasNonEmptyText(
          ctx.data.supportingFactors ??
            ctx.data.keyFindings ??
            ctx.data.evidence
        );
        const hasConclusion = hasNonEmptyText(
          ctx.data.conclusion ?? ctx.data.primaryReason ?? ctx.data.reason
        );
        if (hasConclusion && !hasEvidence) {
          return halFail({
            field: "reasoning",
            message: "Conclusion without supporting evidence chain.",
            recommendation: "Add supportingFactors / keyFindings linked to evidence.",
            expected: "supporting evidence",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.reasoning.no_logical_jumps",
      name: "No Logical Jumps",
      description: "Reject reasoning with logical jumps or missing assumptions.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "reasoning"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (ctx.data.logicalJump === true || ctx.data.hasLogicalJump === true) {
          return halFail({
            field: "reasoning",
            message: "Logical jump detected in reasoning.",
            recommendation: "Fill intermediate steps and state assumptions.",
            actual: true,
          });
        }
        if (
          ctx.data.missingAssumptions === true ||
          (ctx.data.assumptionsRequired === true &&
            !hasNonEmptyText(ctx.data.assumptions))
        ) {
          return halFail({
            field: "assumptions",
            message: "Missing assumptions in reasoning chain.",
            recommendation: "Explicitly list assumptions used in the analysis.",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.reasoning.no_circular",
      name: "No Circular Reasoning",
      description: "Reject circular reasoning loops.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "reasoning"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          ctx.data.circularReasoning === true ||
          ctx.data.hasCircularReasoning === true
        ) {
          return halFail({
            field: "reasoning",
            message: "Circular reasoning detected.",
            recommendation: "Rebuild chain with independent evidence → conclusion.",
            actual: true,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.reasoning.no_unsupported_claims",
      name: "No Unsupported Reasoning Claims",
      description: "Reject unsupported claims inside the reasoning narrative.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "reasoning"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (
          ctx.data.unsupportedReasoning === true ||
          ctx.data.unsupportedClaimsInReasoning === true
        ) {
          return halFail({
            field: "reasoning",
            message: "Unsupported claims inside reasoning.",
            recommendation: "Remove or evidence-back every claim in the chain.",
            actual: true,
          });
        }
        return halPass();
      },
    },
  ];
}
