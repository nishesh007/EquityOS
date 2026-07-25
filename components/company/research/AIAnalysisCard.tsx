import {
  ResearchCardSection,
  ResearchMetricCard,
  type ResearchCardTone,
} from "@/components/company/research-cards";
import {
  formatScore,
} from "@/lib/format/research-numbers";
import type { AIAnalysis, AIInvestmentThesis, RiskLevel } from "@/types";
import {
  BrainCircuit,
  Lightbulb,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";

interface AIAnalysisCardProps {
  analysis: AIAnalysis;
  thesis?: AIInvestmentThesis | null;
}

function riskTone(level: RiskLevel): ResearchCardTone {
  if (level === "Low") return "positive";
  if (level === "High") return "risk";
  return "warning";
}

function truncate(text: string, max = 36): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

export function AIAnalysisCard({ analysis, thesis }: AIAnalysisCardProps) {
  const risks = thesis?.keyRisks ?? [];
  const catalysts = thesis?.keyCatalysts ?? [];
  const confidence = thesis?.confidence;

  return (
    <ResearchCardSection
      title="AI Research"
      subtitle={analysis.generatedAt}
      badge={
        <span className="rounded-md border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-purple-400">
          AI
        </span>
      }
    >
      <ResearchMetricCard
        title="Investment Thesis"
        value={truncate(analysis.investmentThesis, 28)}
        verdict={thesis?.recommendation ?? "Thesis"}
        tone="ai"
        icon={Sparkles}
      />
      <ResearchMetricCard
        title="Risks"
        value={
          risks.length > 0
            ? `${risks.length} factors`
            : analysis.riskLevel
        }
        verdict={analysis.riskLevel}
        tone={riskTone(analysis.riskLevel)}
        icon={ShieldAlert}
      />
      <ResearchMetricCard
        title="Catalysts"
        value={
          catalysts.length > 0
            ? `${catalysts.length} items`
            : truncate(analysis.momentum, 24)
        }
        verdict={catalysts.length > 0 ? "Active" : "Momentum"}
        tone="macro"
        icon={Lightbulb}
      />
      <ResearchMetricCard
        title="Confidence"
        value={
          typeof confidence === "number"
            ? `${formatScore(confidence)}%`
            : analysis.trend.slice(0, 18)
        }
        verdict={typeof confidence === "number" ? "Model" : "Trend"}
        tone="neutral"
        icon={Target}
      />
      <ResearchMetricCard
        title="AI Summary"
        value={truncate(analysis.trend, 28)}
        verdict="Brief"
        tone="ai"
        icon={BrainCircuit}
      />
    </ResearchCardSection>
  );
}
