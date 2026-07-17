import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { PortfolioHoldingsTable } from "@/components/dashboard/PortfolioHoldingsTable";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { PortfolioEarningsPanel } from "@/components/dashboard/earnings";
import { PortfolioDoctor } from "@/components/portfolio/PortfolioDoctor";
import { InstitutionalPortfolioPanel } from "@/components/dashboard/institutional/InstitutionalPortfolioPanel";
import { ExecutiveInstitutionalDashboard } from "@/components/dashboard/institutional/ExecutiveInstitutionalDashboard";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  fetchPortfolioSummary,
  fetchWatchlist,
  fetchUpcomingResults,
} from "@/services/marketData";
import { fetchPortfolioEarningsRows } from "@/services/earningsCalendar";
import { fetchPortfolioDoctorAnalysis } from "@/services/portfolioAnalysisData";
import { fetchOpportunityEngineState } from "@/services/opportunityEngine";
import { fetchInstitutionalScreenerHealth } from "@/services/screenerData";
import { fetchResearchWorkspaceHealth } from "@/services/researchWorkspace";
import { MainGrid, PageContainer } from "@/src/design";

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
    fetchOpportunityEngineState(),
    fetchUpcomingResults(),
    fetchPortfolioEarningsRows(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
    Promise.resolve(fetchResearchWorkspaceHealth()),
  ]);

  return (
    <PageContainer>
      <PageHeader
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
              <div id="holdings">
                <PortfolioHoldingsTable holdings={portfolio.holdings} />
              </div>
              <PortfolioDoctor analysis={doctorAnalysis} />
            </>
          }
          secondary={
            <>
              <Watchlist initialItems={watchlist} />
              <PortfolioEarningsPanel rows={portfolioEarnings} />
            </>
          }
        />
      </section>
    </PageContainer>
  );
}
