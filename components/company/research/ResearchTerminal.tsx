import { AIAnalysisCard } from "@/components/company/research/AIAnalysisCard";
import { CompanyNewsPanel } from "@/components/company/research/CompanyNewsPanel";
import { KeyStatsGrid } from "@/components/company/research/KeyStatsGrid";
import { ResultsSummaryCard } from "@/components/company/research/ResultsSummaryCard";
import { SwingTradePanel } from "@/components/company/research/SwingTradePanel";
import { TechnicalIndicatorsPanel } from "@/components/company/research/TechnicalIndicatorsPanel";
import { LazyChartWorkspace } from "@/components/charts/workspace";
import type { CompanyProfile, CompanyResearch } from "@/types";

interface ResearchTerminalProps {
  company: CompanyProfile;
  research: CompanyResearch;
  screenerInsight?: {
    score: number;
    eventScore?: number;
    reasonSummary: string;
    emptyMessage: string;
    whyMatched: string;
  };
}

/**
 * Sprint 3 — Equity Research Terminal.
 * Sprint 10C.1 — institutional Chart Workspace (layouts, tools, indicators).
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
            {typeof screenerInsight.eventScore === "number" &&
            screenerInsight.eventScore > 0
              ? ` · Event ${screenerInsight.eventScore}`
              : ""}
            {" · Workspace"}
          </p>
          <p className="mt-1 text-text-muted">
            {screenerInsight.emptyMessage ||
              screenerInsight.whyMatched ||
              screenerInsight.reasonSummary}
          </p>
        </div>
      ) : null}

      <div id="key-stats">
        <KeyStatsGrid company={company} trading={research.trading} />
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.85fr)]">
        <LazyChartWorkspace
          exchangeSymbol={research.exchangeSymbol}
          companyName={company.name}
          symbol={company.symbol}
          priceHistory={company.priceHistory}
          quote={company.quote}
          overview={
            <span>
              {company.name} · {company.sector ?? "Equities"} · exchange{" "}
              {research.exchangeSymbol}
            </span>
          }
          aiSummary={
            research.ai?.investmentThesis ? (
              <span className="line-clamp-4">
                {research.ai.investmentThesis}
              </span>
            ) : (
              <span>Open AI Analysis below for the full brief.</span>
            )
          }
          keyMetrics={
            <span>
              Check Key Stats above for PE, ROE and liquidity metrics.
            </span>
          }
        />
        <TechnicalIndicatorsPanel
          symbol={company.symbol}
          technicals={research.technicals}
        />
      </div>

      <div
        className={
          research.swing.entryLow > 0
            ? "grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]"
            : "grid grid-cols-1 gap-6"
        }
      >
        {research.swing.entryLow > 0 ? (
          <SwingTradePanel
            swing={research.swing}
            symbol={company.symbol}
            initialQuote={company.quote}
          />
        ) : null}
        <div id="ai-analysis">
          <AIAnalysisCard
            analysis={research.ai}
            symbol={company.symbol}
            initialQuote={company.quote}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CompanyNewsPanel news={research.news} />
        <ResultsSummaryCard results={research.results} />
      </div>
    </div>
  );
}
