/**
 * Decision red flag engine — consolidates risk signals for AI decision output.
 */

import type { InstitutionalRiskAssessment } from "@/lib/research/riskEngine";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { RedFlag } from "@/types";

export interface DecisionRedFlag {
  label: string;
  severity: string;
  description: string;
  category: string;
}

function mapFlag(flag: RedFlag, category: string): DecisionRedFlag {
  return {
    label: flag.label,
    severity: flag.severity,
    description: flag.description,
    category,
  };
}

export function buildDecisionRedFlags(
  risk: InstitutionalRiskAssessment,
  context: CompanyContext
): DecisionRedFlag[] {
  const flags: DecisionRedFlag[] = [];

  for (const flag of risk.redFlags) {
    const category =
      flag.key.includes("debt") ||
      flag.key.includes("cash") ||
      flag.key.includes("liquidity")
        ? "Financial"
        : flag.key.includes("margin") || flag.key.includes("roe")
          ? "Business"
          : "Operational";
    flags.push(mapFlag(flag, category));
  }

  for (const category of risk.categories) {
    if (category.severity === "High") {
      for (const riskLine of category.risks.slice(0, 2)) {
        flags.push({
          label: category.category,
          severity: category.severity,
          description: riskLine.replace(/\*\*/g, ""),
          category: category.category.replace(" Risks", ""),
        });
      }
    }
  }

  const fi = context.financialIntelligence;
  if (fi && fi.scores.riskScore >= 65) {
    flags.push({
      label: "Elevated Risk Score",
      severity: fi.scores.riskScore >= 80 ? "High" : "Medium",
      description: `Financial intelligence aggregate risk score at ${fi.scores.riskScore}/100.`,
      category: "Financial",
    });
  }

  const seen = new Set<string>();
  return flags
    .filter((flag) => {
      const key = `${flag.label}:${flag.description}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 12);
}

export function formatRedFlags(flags: DecisionRedFlag[]): string[] {
  return flags.map(
    (flag) =>
      `[${flag.severity}] ${flag.label} (${flag.category}): ${flag.description}`
  );
}
