import { notFound } from "next/navigation";
import { CompanyBreadcrumb } from "@/components/company/CompanyBreadcrumb";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { ActionButtons } from "@/components/company/ActionButtons";
import { FinancialSummaryCards } from "@/components/company/FinancialSummaryCards";
import { CompanyTabs } from "@/components/company/CompanyTabs";
import { ResearchTerminal } from "@/components/company/research/ResearchTerminal";
import { EquityIntelligenceEngine } from "@/components/company/intelligence/EquityIntelligenceEngine";
import { fetchCompanyProfile } from "@/services/companyData";
import { fetchEquityIntelligence } from "@/services/equityIntelligenceData";
import { fetchCompanyResearch } from "@/services/researchData";
import { fetchSymbolScreenerInsight } from "@/services/screenerData";
import {
  fetchResearchKnowledgeView,
  fetchExecutiveResearchView,
  fetchResearchSummaryView,
  fetchWorkspaceAnalyticsView,
  fetchResearchTimelineView,
  fetchResearchWorkspaceHealth,
  openCompanyResearchWorkspace,
} from "@/services/researchWorkspace";
import {
  fetchWatchlistPlatformHealth,
  formatWatchlistPlatformSubtitle,
} from "@/services/watchlistPlatform";

interface CompanyPageProps {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: CompanyPageProps) {
  const { symbol } = await params;
  const company = await fetchCompanyProfile(symbol);

  if (!company) {
    return { title: "Company Not Found · EquityOS" };
  }

  return {
    title: `${company.name} (${company.symbol}) · EquityOS`,
    description: `Research ${company.name} — price, financials, valuation, and news.`,
  };
}

export default async function CompanyPage({ params }: CompanyPageProps) {
  const { symbol } = await params;
  const [company, research, intelligence] = await Promise.all([
    fetchCompanyProfile(symbol),
    fetchCompanyResearch(symbol),
    fetchEquityIntelligence(symbol),
  ]);

  if (!company || !research || !intelligence) {
    notFound();
  }

  const indicatorMap = Object.fromEntries(
    research.technicals.indicators.map((i) => [
      i.name.toLowerCase(),
      Number.parseFloat(String(i.value).replace(/[^0-9.\-]/g, "")),
    ])
  );
  const screenerInsight = fetchSymbolScreenerInsight({
    ticker: company.symbol,
    company: company.name,
    price: company.quote?.price ?? null,
    metrics: {
      pe: company.financials.pe,
      pb: company.financials.pb,
      roe: company.financials.roe,
      roce: company.financials.roce,
      debt_equity: company.financials.debtToEquity,
      revenue_yoy: company.financials.revenueGrowth,
      profit_yoy: company.financials.netProfitGrowth,
      rsi: Number.isFinite(indicatorMap.rsi) ? indicatorMap.rsi : null,
      macd: Number.isFinite(indicatorMap.macd) ? indicatorMap.macd : null,
      trend_score: research.technicals.score,
    },
  });

  const companyWorkspace = openCompanyResearchWorkspace({
    profile: company,
    research,
    intelligence,
  });
  const researchWorkspace = fetchResearchWorkspaceHealth();
  const watchlistPlatform = fetchWatchlistPlatformHealth();
  const knowledge = fetchResearchKnowledgeView({
    ticker: company.symbol,
  });
  const timeline = fetchResearchTimelineView({
    ticker: company.symbol,
  });
  const summary = fetchResearchSummaryView({
    ticker: company.symbol,
  });
  const analytics = fetchWorkspaceAnalyticsView();
  const executive = fetchExecutiveResearchView({ ticker: company.symbol });

  return (
    <div className="p-6">
      <div className="mb-6">
        <CompanyBreadcrumb symbol={company.symbol} name={company.name} />
        <p className="mt-1 text-xs text-text-muted">
          Company research workspace ·{" "}
          {companyWorkspace.empty
            ? companyWorkspace.emptyMessage
            : `${companyWorkspace.panels.length} panels · ${companyWorkspace.overview.aiRecommendation}`}{" "}
          · knowledge{" "}
          {knowledge.empty
            ? knowledge.emptyMessage
            : `${knowledge.notes.length} notes · ${knowledge.evidence.items.length} evidence`}{" "}
          · timeline{" "}
          {timeline.empty
            ? timeline.emptyMessage
            : `${timeline.entries.length} events`}{" "}
          · copilot{" "}
          {summary.empty ? summary.emptyMessage : summary.finalConclusion}{" "}
          · automation{" "}
          {analytics.empty
            ? analytics.emptyMessage
            : `${analytics.researchProductivity} productivity`}{" "}
          · executive{" "}
          {executive.empty
            ? executive.emptyMessage
            : executive.overview.researchProgress + "% progress"}{" "}
          ·{" "}
          {researchWorkspace.ready
            ? `${researchWorkspace.openSessions} sessions · ${researchWorkspace.openTabs} tabs`
            : researchWorkspace.emptyMessage}{" "}
          · watchlists {formatWatchlistPlatformSubtitle(watchlistPlatform)}
        </p>
        {!companyWorkspace.empty ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {companyWorkspace.quickActions.slice(0, 6).map((action) => (
              <a
                key={action.id}
                href={action.href}
                className="rounded-lg border border-surface-border-subtle px-2.5 py-1 text-[11px] font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
              >
                {action.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-6">
        <CompanyHeader company={company} />
        <ActionButtons symbol={company.symbol} />
        <ResearchTerminal
          company={company}
          research={research}
          screenerInsight={screenerInsight}
        />
        <EquityIntelligenceEngine
          intelligence={intelligence}
          symbol={company.symbol}
          initialQuote={company.quote}
        />
        <FinancialSummaryCards financials={company.financials} dataTransparency={intelligence.dataTransparency} />
        <CompanyTabs company={company} dataTransparency={intelligence.dataTransparency} />
      </div>
    </div>
  );
}
