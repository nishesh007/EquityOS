/**
 * Data evidence rules — claims must be backed by validated datasets.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  configFromContext,
  evidenceSection,
  hasNonEmptyText,
  isPlainObject,
  statementsOf,
  halFail,
  halPass,
  type HallucinationValidationConfig,
} from "./HallucinationRuleRegistry";

export function createDataEvidenceRules(
  _config: HallucinationValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hal.evidence.statements_backed",
      name: "Statements Evidence Backed",
      description: "Each factual statement should reference evidence.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "evidence"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const statements = statementsOf(ctx.data);
        if (statements.length === 0) return halPass();
        for (const s of statements) {
          if (!isPlainObject(s)) continue;
          const hasRef =
            hasNonEmptyText(s.evidenceRef) ||
            hasNonEmptyText(s.source) ||
            hasNonEmptyText(s.evidenceId) ||
            s.supported === true;
          if (!hasRef) {
            return halFail({
              field: "statements",
              message: "Statement lacks evidence reference.",
              recommendation: "Attach evidenceRef / source for every factual statement.",
              expected: "evidenceRef or source",
              actual: s.text ?? s.claim ?? s,
            });
          }
        }
        return halPass();
      },
    },
    {
      id: "hal.evidence.support_threshold",
      name: "Evidence Support Threshold",
      description: "Evidence support score must meet configured threshold.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "evidence"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const cfg = configFromContext(ctx);
        const evidence = evidenceSection(ctx.data);
        const score =
          typeof evidence.score === "number"
            ? evidence.score
            : typeof evidence.support === "number"
              ? evidence.support
              : typeof ctx.data.evidenceScore === "number"
                ? ctx.data.evidenceScore
                : undefined;
        if (score === undefined) {
          if (cfg.mode === "strict" && ctx.data.missingEvidence === true) {
            return halFail({
              field: "evidence",
              message: "Evidence support missing in strict mode.",
              recommendation: `Provide evidence.score >= ${cfg.evidenceThreshold}.`,
              expected: `>= ${cfg.evidenceThreshold}`,
              actual: null,
            });
          }
          return halPass();
        }
        if (score < cfg.evidenceThreshold) {
          return halFail({
            field: "evidence",
            message: "Evidence support below configured threshold.",
            recommendation: `Raise evidence coverage to >= ${cfg.evidenceThreshold}.`,
            expected: `>= ${cfg.evidenceThreshold}`,
            actual: score,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.evidence.validated_dataset",
      name: "Validated Dataset Present",
      description: "Require validatedData / groundTruth when factual claims exist.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["hallucination", "evidence"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        const factual =
          ctx.data.hasFactualClaims === true ||
          statementsOf(ctx.data).length > 0 ||
          ctx.data.mentionsFinancials === true ||
          ctx.data.mentionsPrice === true;
        if (!factual) return halPass();
        const evidence = evidenceSection(ctx.data);
        const hasValidated =
          isPlainObject(ctx.data.validatedData) ||
          isPlainObject(ctx.data.groundTruth) ||
          isPlainObject(evidence.validatedData) ||
          isPlainObject(evidence.financial) ||
          isPlainObject(evidence.price) ||
          hasNonEmptyText(evidence.priceSource) ||
          hasNonEmptyText(evidence.financialSource);
        if (!hasValidated) {
          return halFail({
            field: "validatedData",
            message: "Factual claims without validated dataset attachment.",
            recommendation:
              "Attach validatedData / groundTruth from Integrity-approved sources.",
            expected: "validatedData or evidence datasets",
            actual: null,
          });
        }
        return halPass();
      },
    },
    {
      id: "hal.evidence.missing_flag",
      name: "Missing Evidence Flag",
      description: "Reject outputs explicitly flagged as missing evidence.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["hallucination", "evidence"],
      author: "equityos-hallucination",
      datasetTypes: ["AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return halPass();
        if (ctx.data.missingEvidence === true) {
          return halFail({
            field: "evidence",
            message: "AI output flagged as missing evidence.",
            recommendation: "Do not publish until evidence is attached.",
            actual: true,
          });
        }
        return halPass();
      },
    },
  ];
}
