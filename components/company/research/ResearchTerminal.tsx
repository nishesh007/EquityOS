import { AIAnalysisCard } from "@/components/company/research/AIAnalysisCard";
import { CompanyNewsPanel } from "@/components/company/research/CompanyNewsPanel";
import { KeyStatsGrid } from "@/components/company/research/KeyStatsGrid";
import { ResultsSummaryCard } from "@/components/company/research/ResultsSummaryCard";
import { SwingTradePanel } from "@/components/company/research/SwingTradePanel";
import { TechnicalIndicatorsPanel } from "@/components/company/research/TechnicalIndicatorsPanel";
import { LazyTradingViewChart } from "@/components/company/research/LazyTradingViewChart";
import type { CompanyProfile, CompanyResearch } from "@/types";

interface ResearchTerminalProps {
  company: CompanyProfile;
  research: CompanyResearch;
}

/**
 * Sprint 3 — Equity Research Terminal.
 * Composes the full research layer for a company. Rendered as an additive
 * section on the company page; existing components remain untouched.
 */
export function ResearchTerminal({ company, research }: ResearchTerminalProps) {
  return (
    <div className="space-y-6">
      <KeyStatsGrid company={company} trading={research.trading} />

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.85fr)]">
        <LazyTradingViewChart
          exchangeSymbol={research.exchangeSymbol}
          companyName={company.name}
          symbol={company.symbol}
          currentPrice={company.price}
          priceHistory={company.priceHistory}
        />
        <TechnicalIndicatorsPanel
          symbol={company.symbol}
          technicals={research.technicals}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <SwingTradePanel swing={research.swing} symbol={company.symbol} />
        <AIAnalysisCard analysis={research.ai} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CompanyNewsPanel news={research.news} />
        <ResultsSummaryCard results={research.results} />
      </div>
    </div>
  );
}
