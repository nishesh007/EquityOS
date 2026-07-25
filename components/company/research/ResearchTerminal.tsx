import { AIAnalysisCard } from "@/components/company/research/AIAnalysisCard";
import { KeyStatsGrid } from "@/components/company/research/KeyStatsGrid";
import { ResultsSummaryCard } from "@/components/company/research/ResultsSummaryCard";
import { SwingTradePanel } from "@/components/company/research/SwingTradePanel";
import { TechnicalIndicatorsPanel } from "@/components/company/research/TechnicalIndicatorsPanel";
import { LazyChartWorkspace } from "@/components/charts/workspace";
import type {
  AIInvestmentThesis,
  CompanyProfile,
  CompanyResearch,
} from "@/types";

interface ResearchTerminalProps {
  company: CompanyProfile;
  research: CompanyResearch;
  thesis?: AIInvestmentThesis | null;
  screenerInsight?: {
    score: number;
    eventScore?: number;
    reasonSummary: string;
    emptyMessage: string;
    whyMatched: string;
  };
}

/**
 * Compact research terminal — overview, chart, technical cards, AI cards.
 */
export function ResearchTerminal({
  company,
  research,
  thesis,
  screenerInsight,
}: ResearchTerminalProps) {
  return (
    <div className="space-y-4">
      <section aria-label="Overview and market data" className="space-y-3">
        {screenerInsight ? (
          <div className="rounded-xl border border-purple-500/25 bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent px-3.5 py-2.5 text-sm">
            <p className="font-medium text-text-primary">
              AI Screener · Score {screenerInsight.score}
              {typeof screenerInsight.eventScore === "number" &&
              screenerInsight.eventScore > 0
                ? ` · Event ${screenerInsight.eventScore}`
                : ""}
            </p>
            <p className="mt-0.5 text-xs text-text-muted">
              {screenerInsight.emptyMessage ||
                screenerInsight.whyMatched ||
                screenerInsight.reasonSummary}
            </p>
          </div>
        ) : null}

        <div id="key-stats">
          <KeyStatsGrid company={company} trading={research.trading} />
        </div>

        <ResultsSummaryCard results={research.results} />
      </section>

      <section aria-label="Charts and technical analysis" className="space-y-3">
        <div className="grid grid-cols-1 gap-3 2xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,0.85fr)]">
          <LazyChartWorkspace
            exchangeSymbol={research.exchangeSymbol}
            companyName={company.name}
            symbol={company.symbol}
            priceHistory={company.priceHistory}
            quote={company.quote}
            overview={
              <span>
                {company.sector ?? "Equities"} · {research.exchangeSymbol}
              </span>
            }
            aiSummary={
              research.ai?.investmentThesis ? (
                <span className="line-clamp-3">
                  {research.ai.investmentThesis}
                </span>
              ) : (
                <span>Open AI Research cards for the full brief.</span>
              )
            }
            keyMetrics={
              <span>See Overview cards for PE, ROE and liquidity.</span>
            }
          />
          <div className="space-y-3">
            <TechnicalIndicatorsPanel
              symbol={company.symbol}
              technicals={research.technicals}
              support={research.ai.support}
              resistance={research.ai.resistance}
            />
          </div>
        </div>

        {research.swing.entryLow > 0 ? (
          <SwingTradePanel swing={research.swing} symbol={company.symbol} />
        ) : null}
      </section>

      <section aria-label="AI research summary">
        <AIAnalysisCard analysis={research.ai} thesis={thesis} />
      </section>
    </div>
  );
}
