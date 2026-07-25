import { notFound } from "next/navigation";
import { CompanyBreadcrumb } from "@/components/company/CompanyBreadcrumb";
import { CompanyHeader } from "@/components/company/CompanyHeader";
import { ActionButtons } from "@/components/company/ActionButtons";
import { FinancialSummaryCards } from "@/components/company/FinancialSummaryCards";
import { CompanyTabs } from "@/components/company/CompanyTabs";
import { ResearchTerminal } from "@/components/company/research/ResearchTerminal";
import { CompanyNewsPanel } from "@/components/company/research/CompanyNewsPanel";
import { EquityIntelligenceEngine } from "@/components/company/intelligence/EquityIntelligenceEngine";
import { CompanyIntelligenceTimeline } from "@/components/company/intelligence/CompanyIntelligenceTimeline";
import { QuarterlyIntelligence } from "@/components/company/intelligence/QuarterlyIntelligence";
import { InstitutionalPeerComparison } from "@/components/company/intelligence/InstitutionalPeerComparison";
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
import { PageContainer } from "@/src/design/components/PageContainer";
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
  await ensureOpportunityEngineState();
  void getMarketIntelligenceSnapshot().catch(() => null);
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
      <div className="mb-3">
        <CompanyBreadcrumb symbol={company.symbol} name={company.name} />
        <p className="mt-1 text-[11px] text-text-muted">
          Research workspace
          {!companyWorkspace.empty
            ? ` · ${companyWorkspace.panels.length} panels`
            : ""}
          {knowledge.empty ? "" : ` · ${knowledge.notes.length} notes`}
          {timeline.empty ? "" : ` · ${timeline.entries.length} events`}
          {researchWorkspace.ready
            ? ` · ${researchWorkspace.openSessions} sessions`
            : ""}
          {" · "}
          {formatWatchlistPlatformSubtitle(watchlistPlatform)}
          {summary.empty && !executive.empty
            ? ` · ${executive.overview.researchProgress}% progress`
            : ""}
          {analytics.empty
            ? ""
            : ` · ${analytics.researchProductivity} productivity`}
        </p>
      </div>

      <div className="space-y-4">
        <CompanyHeader
          company={company}
          quickScore={intelligence?.score.overall ?? null}
          quickVerdict={intelligence?.summary.verdict ?? null}
        />
        <div className="sticky top-0 z-30 -mx-1 border-b border-surface-border-subtle/50 bg-surface/90 px-1 py-1.5 backdrop-blur-md">
          <ActionButtons symbol={company.symbol} />
        </div>

        <ResearchTerminal
          company={company}
          research={research}
          thesis={intelligence?.thesis}
          screenerInsight={screenerInsight}
        />

        {intelligence ? (
          <EquityIntelligenceEngine intelligence={intelligence} />
        ) : (
          <Card padding="md">
            <CardHeader
              title="Equity Intelligence"
              subtitle="Fundamentals · valuation · risk"
            />
            <EmptyStatePanel
              message="Live fundamentals for this symbol are not available yet. Overview and research panels above remain authoritative."
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

        <section aria-label="Financial statements" className="space-y-3">
          {intelligence ? (
            <QuarterlyIntelligence quarterly={intelligence.quarterly} />
          ) : null}
          <FinancialSummaryCards
            financials={company.financials}
            dataTransparency={intelligence?.dataTransparency}
          />
          <CompanyTabs
            company={company}
            dataTransparency={intelligence?.dataTransparency}
          />
        </section>

        {intelligence ? (
          <section aria-label="Peer comparison">
            <InstitutionalPeerComparison peers={intelligence.peers} />
          </section>
        ) : null}

        <section aria-label="News and events" className="space-y-3">
          <CompanyNewsPanel news={research.news} />
          {intelligence?.timeline?.length ? (
            <CompanyIntelligenceTimeline events={intelligence.timeline} />
          ) : null}
        </section>
      </div>
    </PageContainer>
  );
}
