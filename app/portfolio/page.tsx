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
    <div className="p-6">
      <PageHeader
        title="Portfolio"
        subtitle={`Holdings, performance and monitored opportunities · ${screenerHealth.portfolioScreens} institutional portfolio screens · workspace ${screenerHealth.workspaceReady ? "ready" : screenerHealth.emptyMessage} · research ${researchWorkspace.ready ? `${researchWorkspace.openTabs} tabs · automation ${researchWorkspace.automationReady ? `${researchWorkspace.templateCount} templates` : researchWorkspace.automationEmptyMessage}` : researchWorkspace.emptyMessage}`}
      />

      <section className="mb-6 animate-fade-in-up">
        <ExecutiveInstitutionalDashboard
          portfolio={portfolio}
          doctor={doctorAnalysis}
          opportunityState={opportunityState}
          earnings={results}
          compact
        />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:40ms]">
        <InstitutionalPortfolioPanel
          portfolio={portfolio}
          doctor={doctorAnalysis}
          title="Institutional Portfolio Management"
        />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:40ms]">
        <PortfolioSummary
          portfolio={portfolio}
          showTopHoldings={false}
          showViewAllLink={false}
        />
      </section>

      <section
        id="holdings"
        className="mb-6 animate-fade-in-up [animation-delay:60ms]"
      >
        <PortfolioHoldingsTable holdings={portfolio.holdings} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:90ms]">
        <PortfolioEarningsPanel rows={portfolioEarnings} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:120ms]">
        <Watchlist initialItems={watchlist} />
      </section>

      <section className="animate-fade-in-up [animation-delay:180ms]">
        <PortfolioDoctor analysis={doctorAnalysis} />
      </section>
    </div>
  );
}
