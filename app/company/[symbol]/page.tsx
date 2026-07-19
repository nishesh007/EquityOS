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
import { PageContainer } from "@/src/design";
import { SharedRecommendationPanel } from "@/components/recommendations";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { Card, CardHeader } from "@/components/ui/Card";
import {
  ensureOpportunityEngineState,
  fetchRecommendationForSymbol,
} from "@/services/opportunityEngine";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { Brain } from "lucide-react";
import Link from "next/link";

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
  // Warm OE state + shared Market Intelligence before sync recommendation
  // selectors so company cards never diverge from Dashboard regime/context.
  await Promise.all([
    ensureOpportunityEngineState(),
    getMarketIntelligenceSnapshot(),
  ]);
  const strategyRecommendation = fetchRecommendationForSymbol(symbol);
  const [company, research, intelligence] = await Promise.all([
    fetchCompanyProfile(symbol),
    fetchCompanyResearch(symbol, strategyRecommendation),
    fetchEquityIntelligence(symbol),
  ]);

  if (!company || !research) {
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
    <PageContainer>
      <div className="mb-6">
        <CompanyBreadcrumb symbol={company.symbol} name={company.name} />
        <p className="mt-1 text-xs text-text-muted">
          Company research workspace ·{" "}
          {companyWorkspace.empty
            ? companyWorkspace.emptyMessage
            : `${companyWorkspace.panels.length} panels · Strategy Engine ${
                strategyRecommendation?.action ?? "no active signal"
              }`}{" "}
          · knowledge{" "}
          {knowledge.empty
            ? knowledge.emptyMessage
            : `${knowledge.notes.length} notes · ${knowledge.evidence.items.length} evidence`}{" "}
          · timeline{" "}
          {timeline.empty
            ? timeline.emptyMessage
            : `${timeline.entries.length} events`}{" "}
          · copilot{" "}
          {strategyRecommendation
            ? `${strategyRecommendation.action} · ${strategyRecommendation.opportunityScore}/100`
            : summary.emptyMessage}{" "}
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
        <SharedRecommendationPanel
          recommendations={
            strategyRecommendation ? [strategyRecommendation] : []
          }
          title="Company Strategy Recommendation"
        />
        <CompanyHeader company={company} />
        <ActionButtons symbol={company.symbol} />
        <ResearchTerminal
          company={company}
          research={research}
          screenerInsight={screenerInsight}
        />
        {intelligence ? (
          <EquityIntelligenceEngine
            intelligence={intelligence}
            symbol={company.symbol}
            initialQuote={company.quote}
          />
        ) : (
          <Card padding="lg">
            <CardHeader
              title="Equity Intelligence"
              subtitle="Fundamentals · valuation · risk"
            />
            <EmptyStatePanel
              message="Live fundamentals for this symbol are not available yet. Overview, research and Strategy Engine panels above remain authoritative."
              source="Fundamentals providers · Equity Intelligence"
              icon={Brain}
              action={
                <Link
                  href="/research"
                  className="text-[11px] font-semibold text-accent"
                >
                  Open Research Workspace →
                </Link>
              }
            />
          </Card>
        )}
        <FinancialSummaryCards
          financials={company.financials}
          dataTransparency={intelligence?.dataTransparency}
        />
        <CompanyTabs
          company={company}
          dataTransparency={intelligence?.dataTransparency}
        />
      </div>
    </PageContainer>
  );
}
