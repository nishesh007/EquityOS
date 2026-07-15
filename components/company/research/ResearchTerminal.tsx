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
  screenerInsight?: {
    score: number;
    reasonSummary: string;
    emptyMessage: string;
    whyMatched: string;
  };
}

/**
 * Sprint 3 — Equity Research Terminal.
 * Composes the full research layer for a company. Rendered as an additive
 * section on the company page; existing components remain untouched.
 * Sprint 9D.R2 — optional AI Screener insight strip for Research Drawer.
 */
export function ResearchTerminal({
  company,
  research,
  screenerInsight,
}: ResearchTerminalProps) {
  return (
    <div className="space-y-6">
      {screenerInsight ? (
        <div className="rounded-xl border border-surface-border-subtle bg-surface-elevated px-4 py-3 text-sm">
          <p className="font-medium text-text-primary">
            AI Screener · Score {screenerInsight.score}
          </p>
          <p className="mt-1 text-text-muted">
            {screenerInsight.emptyMessage ||
              screenerInsight.whyMatched ||
              screenerInsight.reasonSummary}
          </p>
        </div>
      ) : null}

      <KeyStatsGrid company={company} trading={research.trading} />

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.85fr)]">
        <LazyTradingViewChart
          exchangeSymbol={research.exchangeSymbol}
          companyName={company.name}
          symbol={company.symbol}
          priceHistory={company.priceHistory}
          quote={company.quote}
        />
        <TechnicalIndicatorsPanel
          symbol={company.symbol}
          technicals={research.technicals}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <SwingTradePanel
          swing={research.swing}
          symbol={company.symbol}
          initialQuote={company.quote}
        />
        <AIAnalysisCard
          analysis={research.ai}
          symbol={company.symbol}
          initialQuote={company.quote}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CompanyNewsPanel news={research.news} />
        <ResultsSummaryCard results={research.results} />
      </div>
    </div>
  );
}
