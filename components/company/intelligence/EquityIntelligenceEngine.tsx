import { EquityScoreEngine } from "@/components/company/intelligence/EquityScoreEngine";
import { FinancialHealthGrid } from "@/components/company/intelligence/FinancialHealthGrid";
import { FinancialQualityPanel } from "@/components/company/intelligence/FinancialQualityPanel";
import { InvestmentSignalsPanel } from "@/components/company/intelligence/InvestmentSignalsPanel";
import { MultiYearTrendPanel } from "@/components/company/intelligence/MultiYearTrendPanel";
import { ResearchConfidencePanel } from "@/components/company/intelligence/ResearchConfidencePanel";
import { ValuationAnalysisPanel } from "@/components/company/intelligence/ValuationAnalysisPanel";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import type { EquityIntelligence } from "@/types";

interface EquityIntelligenceEngineProps {
  intelligence: EquityIntelligence;
}

/**
 * Card-first equity intelligence — fundamentals, valuation, signals.
 * Detail lives in research card modals.
 */
export function EquityIntelligenceEngine({
  intelligence,
}: EquityIntelligenceEngineProps) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-text-primary">
            Equity Intelligence
          </h2>
          <p className="text-[10px] text-text-muted">
            {intelligence.generatedAt}
          </p>
        </div>
      </div>

      <DataTransparencyBar transparency={intelligence.dataTransparency} />

      <section aria-label="Fundamental analysis" className="space-y-4">
        <EquityScoreEngine score={intelligence.score} />
        <ResearchConfidencePanel
          confidence={intelligence.researchConfidence}
          dataTransparency={intelligence.dataTransparency}
        />
        <FinancialQualityPanel
          analysis={intelligence.financialQuality}
          dataTransparency={intelligence.dataTransparency}
        />
        <MultiYearTrendPanel
          trends={intelligence.multiYearTrends}
          dataTransparency={intelligence.dataTransparency}
        />
        <FinancialHealthGrid
          metrics={intelligence.financialHealth}
          dataTransparency={intelligence.dataTransparency}
        />
      </section>

      <section aria-label="Valuation">
        <ValuationAnalysisPanel
          valuation={intelligence.valuation}
          dataTransparency={intelligence.dataTransparency}
        />
      </section>

      <section aria-label="Risk and opportunity">
        <InvestmentSignalsPanel
          flags={intelligence.redFlags}
          opportunities={intelligence.opportunities}
          dataTransparency={intelligence.dataTransparency}
        />
      </section>
    </div>
  );
}
