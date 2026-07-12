import { AIInvestmentThesisCard } from "@/components/company/intelligence/AIInvestmentThesisCard";
import { CompanyIntelligenceTimeline } from "@/components/company/intelligence/CompanyIntelligenceTimeline";
import { DecisionEnginePanel } from "@/components/company/intelligence/DecisionEnginePanel";
import { EquityScoreEngine } from "@/components/company/intelligence/EquityScoreEngine";
import { FinancialHealthGrid } from "@/components/company/intelligence/FinancialHealthGrid";
import { FinancialQualityPanel } from "@/components/company/intelligence/FinancialQualityPanel";
import { InstitutionalPeerComparison } from "@/components/company/intelligence/InstitutionalPeerComparison";
import { InvestorDecisionPanel } from "@/components/company/intelligence/InvestorDecisionPanel";
import { MultiYearTrendPanel } from "@/components/company/intelligence/MultiYearTrendPanel";
import { OpportunityPanel } from "@/components/company/intelligence/OpportunityPanel";
import { QuarterlyIntelligence } from "@/components/company/intelligence/QuarterlyIntelligence";
import { RedFlagPanel } from "@/components/company/intelligence/RedFlagPanel";
import { ResearchConfidencePanel } from "@/components/company/intelligence/ResearchConfidencePanel";
import { ValuationAnalysisPanel } from "@/components/company/intelligence/ValuationAnalysisPanel";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import type { EquityIntelligence } from "@/types";
import { BrainCircuit } from "lucide-react";

interface EquityIntelligenceEngineProps {
  intelligence: EquityIntelligence;
}

export function EquityIntelligenceEngine({
  intelligence,
}: EquityIntelligenceEngineProps) {
  return (
    <section className="space-y-6" aria-labelledby="equity-intelligence-title">
      <div className="flex items-center justify-between border-b border-surface-border-subtle pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 ring-1 ring-accent/20">
            <BrainCircuit className="h-4 w-4 text-accent" />
          </div>
          <div>
            <h2
              id="equity-intelligence-title"
              className="text-sm font-semibold tracking-tight text-text-primary"
            >
              Equity Intelligence Engine
            </h2>
            <p className="mt-0.5 text-[10px] text-text-muted">
              {intelligence.generatedAt}
            </p>
          </div>
        </div>
        <span className="rounded-md border border-accent/15 bg-accent/5 px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-accent">
          Sprint 7D
        </span>
      </div>

      <DataTransparencyBar transparency={intelligence.dataTransparency} />

      <EquityScoreEngine score={intelligence.score} />
      <DecisionEnginePanel
        decision={intelligence.decision}
        dataTransparency={intelligence.dataTransparency}
      />
      <ResearchConfidencePanel
        confidence={intelligence.researchConfidence}
        dataTransparency={intelligence.dataTransparency}
      />
      <AIInvestmentThesisCard thesis={intelligence.thesis} dataTransparency={intelligence.dataTransparency} />
      <FinancialQualityPanel
        analysis={intelligence.financialQuality}
        dataTransparency={intelligence.dataTransparency}
      />
      <ValuationAnalysisPanel
        valuation={intelligence.valuation}
        dataTransparency={intelligence.dataTransparency}
      />
      <MultiYearTrendPanel
        trends={intelligence.multiYearTrends}
        dataTransparency={intelligence.dataTransparency}
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RedFlagPanel flags={intelligence.redFlags} dataTransparency={intelligence.dataTransparency} />
        <OpportunityPanel opportunities={intelligence.opportunities} dataTransparency={intelligence.dataTransparency} />
      </div>
      <FinancialHealthGrid metrics={intelligence.financialHealth} dataTransparency={intelligence.dataTransparency} />
      <InstitutionalPeerComparison peers={intelligence.peers} />
      <QuarterlyIntelligence quarterly={intelligence.quarterly} />
      <InvestorDecisionPanel
        summary={intelligence.summary}
        checklist={intelligence.checklist}
      />
      <CompanyIntelligenceTimeline events={intelligence.timeline} />
    </section>
  );
}
