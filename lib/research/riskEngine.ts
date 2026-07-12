/**
 * Institutional risk engine — categorized risk assessment from EquityOS intelligence.
 */

import { detectRedFlags } from "@/lib/engine/calculators/red-flags";
import { createAnalysisContext } from "@/lib/engine/analysis-context";
import { calculateValuation } from "@/lib/engine/calculators/valuation-engine";
import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { FundamentalsBundle } from "@/lib/fundamentals/types";
import type { EnrichedShareholding } from "@/lib/fundamentals/types";
import type { CompanyProfile, RedFlag } from "@/types";

export interface RiskCategory {
  category: string;
  risks: string[];
  severity: "Low" | "Medium" | "High";
}

export interface InstitutionalRiskAssessment {
  categories: RiskCategory[];
  redFlags: RedFlag[];
  aggregateRiskScore: number;
  summary: string;
}

const BUSINESS_KEYS = new Set([
  "falling-margins",
  "declining-roe",
  "high-receivables",
  "revenue-deceleration",
]);
const FINANCIAL_KEYS = new Set([
  "increasing-debt",
  "negative-cash-flow",
  "liquidity-stress",
  "interest-coverage",
]);
const GOVERNANCE_KEYS = new Set([
  "promoter-pledge",
  "insider-selling",
  "auditor-qualification",
  "related-party",
]);

function categorySeverity(risks: string[]): "Low" | "Medium" | "High" {
  if (risks.length >= 4) return "High";
  if (risks.length >= 2) return "Medium";
  return "Low";
}

function classifyFlag(flag: RedFlag): string {
  if (BUSINESS_KEYS.has(flag.key)) return "business";
  if (FINANCIAL_KEYS.has(flag.key)) return "financial";
  if (GOVERNANCE_KEYS.has(flag.key)) return "governance";
  if (flag.label.toLowerCase().includes("valuation") || flag.key.includes("valuation")) {
    return "financial";
  }
  return "business";
}

function buildIndustryRisks(profile: CompanyProfile): string[] {
  const risks: string[] = [];
  const industry = profile.industry.toLowerCase();
  const sector = profile.sector.toLowerCase();

  if (sector.includes("bank") || industry.includes("bank")) {
    risks.push("Asset quality and NPA cycle sensitivity to macro credit conditions.");
    risks.push("Regulatory capital and RBI policy changes affect lending growth.");
  }
  if (sector.includes("auto") || industry.includes("auto")) {
    risks.push("Cyclical demand tied to interest rates, fuel costs, and consumer sentiment.");
    risks.push("Regulatory emission norms and EV transition capex requirements.");
  }
  if (sector.includes("it") || industry.includes("software")) {
    risks.push("Client concentration and global discretionary IT spending cycles.");
    risks.push("Currency volatility impacts export revenue translation.");
  }
  if (sector.includes("pharma") || industry.includes("pharma")) {
    risks.push("USFDA inspection outcomes and pricing pressure in regulated markets.");
  }
  if (sector.includes("metal") || sector.includes("mining")) {
    risks.push("Commodity price volatility and global demand cycles.");
  }

  if (risks.length === 0) {
    risks.push(
      `Competitive intensity within ${profile.industry} may compress margins over time.`
    );
  }

  return risks;
}

function buildMacroRisks(profile: CompanyProfile): string[] {
  return [
    "Indian equity valuations sensitive to global rate cycles and FII flow reversals.",
    profile.financials.debtToEquity > 0.8
      ? "Elevated leverage amplifies sensitivity to domestic interest rate moves."
      : "Domestic consumption and capex cycles influence earnings visibility.",
    "INR volatility affects companies with import dependence or foreign debt.",
    `Sector (${profile.sector}) regulatory and policy changes remain an overhang.`,
  ];
}

function buildGovernanceRisks(
  profile: CompanyProfile,
  bundle: FundamentalsBundle | null
): string[] {
  const shareholding: EnrichedShareholding = bundle?.shareholding ?? {
    ...profile.shareholding,
  };
  const changes = shareholding.changes;
  const risks: string[] = [];

  if (shareholding.promoter < 25) {
    risks.push(`Promoter holding at ${shareholding.promoter}% is below typical control threshold.`);
  }
  if (changes && changes.promoter < -0.5) {
    risks.push("Recent promoter holding decline warrants monitoring of alignment.");
  }
  if (changes && changes.fii < -1) {
    risks.push("FII selling pressure observed in latest shareholding pattern.");
  }
  if (risks.length === 0) {
    risks.push("No material governance red flags from latest shareholding disclosures.");
  }
  return risks;
}

export function buildInstitutionalRiskAssessment(
  context: CompanyContext,
  profile: CompanyProfile,
  bundle: FundamentalsBundle | null
): InstitutionalRiskAssessment {
  const analysisCtx = createAnalysisContext(
    profile,
    bundle ?? undefined,
    context.financialIntelligence?.fundamentals ?? profile.fundamentals
  );
  const valuation = calculateValuation(analysisCtx);
  const redFlags = detectRedFlags(analysisCtx, valuation);

  const business: string[] = [];
  const financial: string[] = [];
  const governance: string[] = [];

  for (const flag of redFlags) {
    const bucket = classifyFlag(flag);
    const line = `**${flag.label}** (${flag.severity}): ${flag.description}`;
    if (bucket === "financial") financial.push(line);
    else if (bucket === "governance") governance.push(line);
    else business.push(line);
  }

  const fi = context.financialIntelligence;
  if (fi && fi.scores.riskScore >= 60) {
    financial.push(
      `Financial intelligence risk score elevated at ${fi.scores.riskScore}/100.`
    );
  }

  const categories: RiskCategory[] = [
    {
      category: "Business Risks",
      risks: business.length > 0 ? business : ["No acute business risks flagged by EquityOS engines."],
      severity: categorySeverity(business),
    },
    {
      category: "Financial Risks",
      risks: financial.length > 0 ? financial : ["Balance sheet and cash flow metrics within acceptable bounds."],
      severity: categorySeverity(financial),
    },
    {
      category: "Industry Risks",
      risks: buildIndustryRisks(profile),
      severity: "Medium",
    },
    {
      category: "Governance Risks",
      risks: [
        ...governance,
        ...buildGovernanceRisks(profile, bundle),
      ],
      severity: categorySeverity(governance),
    },
    {
      category: "Macro Risks",
      risks: buildMacroRisks(profile),
      severity: "Medium",
    },
  ];

  const aggregateRiskScore = fi?.scores.riskScore ?? Math.min(100, redFlags.length * 15 + 20);

  return {
    categories,
    redFlags,
    aggregateRiskScore,
    summary: `${redFlags.length} automated red flag(s) detected. Aggregate risk score: ${aggregateRiskScore}/100 (higher = riskier).`,
  };
}

export function formatRiskSection(assessment: InstitutionalRiskAssessment): string {
  return assessment.categories
    .map((category) => {
      return `### ${category.category} (${category.severity})\n${category.risks.map((risk) => `- ${risk}`).join("\n")}`;
    })
    .join("\n\n");
}
