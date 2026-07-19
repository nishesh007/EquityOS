import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { PortfolioHoldingsTable } from "@/components/dashboard/PortfolioHoldingsTable";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { PortfolioEarningsPanel } from "@/components/dashboard/earnings";
import { PortfolioDoctor } from "@/components/portfolio/PortfolioDoctor";
import { InstitutionalPortfolioPanel } from "@/components/dashboard/institutional/InstitutionalPortfolioPanel";
import { ExecutiveInstitutionalDashboard } from "@/components/dashboard/institutional/ExecutiveInstitutionalDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import { SharedRecommendationPanel } from "@/components/recommendations";
import {
  fetchPortfolioSummary,
  fetchWatchlist,
  fetchUpcomingResults,
} from "@/services/marketData";
import { fetchPortfolioEarningsRows } from "@/services/earningsCalendar";
import { fetchPortfolioDoctorAnalysis } from "@/services/portfolioAnalysisData";
import {
  fetchRecommendationsForSymbols,
  ensureOpportunityEngineState,
} from "@/services/opportunityEngine";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { fetchInstitutionalScreenerHealth } from "@/services/screenerData";
import { fetchResearchWorkspaceHealth } from "@/services/researchWorkspace";
import { MainGrid, PageContainer } from "@/src/design";
import { Briefcase } from "lucide-react";

export default async function PortfolioPage() {
  const [
    portfolio,
    watchlist,
    doctorAnalysis,
    opportunityState,
    results,
    portfolioEarnings,
    screenerHealth,
    researchWorkspace,
  ] = await Promise.all([
    fetchPortfolioSummary(),
    fetchWatchlist(),
    fetchPortfolioDoctorAnalysis(),
    ensureOpportunityEngineState(),
    fetchUpcomingResults(),
    fetchPortfolioEarningsRows(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
    Promise.resolve(fetchResearchWorkspaceHealth()),
  ]);
  // Warm shared Market Intelligence before sync recommendation selectors.
  await getMarketIntelligenceSnapshot();
  const holdingRecommendationMap = fetchRecommendationsForSymbols(
    portfolio.holdings.map((holding) => holding.symbol)
  );
  const holdingRecommendations = [...holdingRecommendationMap.values()];
  const watchlistRecommendations = Object.fromEntries(
    fetchRecommendationsForSymbols(
      watchlist.map((item) => item.symbol)
    )
  );

  return (
    <PageContainer>
      <PageHeader
        accent="amber"
        icon={<Briefcase className="h-5 w-5" />}
        title="Portfolio"
        subtitle={`Holdings, performance and monitored opportunities · ${screenerHealth.portfolioScreens} institutional portfolio screens · workspace ${screenerHealth.workspaceReady ? "ready" : screenerHealth.emptyMessage} · research ${researchWorkspace.ready ? `${researchWorkspace.openTabs} tabs · executive ${researchWorkspace.executiveReady ? researchWorkspace.executiveSummary : researchWorkspace.executiveEmptyMessage}` : researchWorkspace.emptyMessage}${researchWorkspace.sprint10AFrozen ? " · 10A FROZEN" : ""}`}
      />

      <section className="animate-fade-in-up">
        <MainGrid
          primary={
            <>
              <ExecutiveInstitutionalDashboard
                portfolio={portfolio}
                doctor={doctorAnalysis}
                opportunityState={opportunityState}
                earnings={results}
                compact
              />
              <InstitutionalPortfolioPanel
                portfolio={portfolio}
                doctor={doctorAnalysis}
                title="Institutional Portfolio Management"
              />
              <PortfolioSummary
                portfolio={portfolio}
                showTopHoldings={false}
                showViewAllLink={false}
              />
              <SharedRecommendationPanel
                recommendations={holdingRecommendations}
                title="Portfolio Strategy · Upgrades, Downgrades & Exit Signals"
                emptyMessage="No validated strategy change for current holdings."
              />
              <div id="holdings">
                <PortfolioHoldingsTable
                  holdings={portfolio.holdings}
                  recommendations={Object.fromEntries(
                    holdingRecommendationMap
                  )}
                />
              </div>
              {doctorAnalysis ? (
                <PortfolioDoctor analysis={doctorAnalysis} />
              ) : null}
            </>
          }
          secondary={
            <>
              <Watchlist
                initialItems={watchlist}
                recommendations={watchlistRecommendations}
              />
              <PortfolioEarningsPanel rows={portfolioEarnings} />
            </>
          }
        />
      </section>
    </PageContainer>
  );
}
