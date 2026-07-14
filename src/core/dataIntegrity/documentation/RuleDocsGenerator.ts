/**
 * Rule documentation generator — describes validation rule families (read-only).
 */

import type { DocumentationConfiguration } from "./DocumentationConfiguration";
import type { DocumentationTargetDefinition } from "./DocumentationRegistry";
import { buildDocument, type DocumentationDocument } from "./DocumentationDocument";

export class RuleDocsGenerator {
  private seq = 0;

  generate(
    targets: DocumentationTargetDefinition[],
    config: DocumentationConfiguration
  ): DocumentationDocument {
    this.seq += 1;
    const warnings: string[] = [];
    const errors: string[] = [];
    try {
      const rules = targets.filter((t) => t.kind === "rule");
      const synthetic =
        rules.length > 0
          ? rules
          : [
              {
                targetId: "rule:market",
                kind: "rule" as const,
                name: "Market Validation Rules",
                module: "rules/market",
                description:
                  "OHLC, quote, volume, and corporate-action consistency checks.",
                publicApi: ["validateMarketData", "validateOHLC"],
                dependencies: ["integrity"],
                version: "1.0.0",
                registeredAt: new Date().toISOString(),
              },
              {
                targetId: "rule:technical",
                kind: "rule" as const,
                name: "Technical Indicator Rules",
                module: "rules/technical",
                description:
                  "RSI, MACD, moving average, and band integrity checks.",
                publicApi: ["validateTechnicalIndicators"],
                dependencies: ["rules/market"],
                version: "1.0.0",
                registeredAt: new Date().toISOString(),
              },
              {
                targetId: "rule:recommendation",
                kind: "rule" as const,
                name: "Recommendation Validation Rules",
                module: "rules/recommendation",
                description:
                  "Reasoning, confidence, alignment, and risk checks for AI recommendations.",
                publicApi: ["validateRecommendation"],
                dependencies: ["rules/market", "trust"],
                version: "1.0.0",
                registeredAt: new Date().toISOString(),
              },
            ];

      if (rules.length === 0) {
        warnings.push(
          "No explicit rule targets registered; generated baseline rule family docs"
        );
      }

      const sections = synthetic.map((r) => ({
        heading: r.name,
        body: `${r.description}${
          config.style === "concise" ? "" : " Rules are executed by the Rule Engine without DX-layer mutation."
        }`,
        bullets: [
          `Module: ${r.module}`,
          `APIs: ${r.publicApi.join(", ")}`,
          `Depends on: ${r.dependencies.join(", ") || "none"}`,
        ],
      }));

      return buildDocument({
        documentId: `doc:rule:${this.seq}`,
        kind: "rule",
        title: "Validation Rule Documentation",
        summary: `Rule family documentation covering ${synthetic.length} groups.`,
        sections,
        relatedModules: [...new Set(synthetic.map((r) => r.module))],
        warnings,
        errors,
      });
    } catch (err) {
      errors.push(`rule docs generation failed: ${String(err)}`);
      return buildDocument({
        documentId: `doc:rule:error:${Date.now()}`,
        kind: "rule",
        title: "Validation Rule Documentation",
        summary: "Rule documentation unavailable",
        sections: [],
        warnings,
        errors,
      });
    }
  }
}
