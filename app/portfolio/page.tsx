import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { PortfolioHoldingsTable } from "@/components/dashboard/PortfolioHoldingsTable";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { PortfolioDoctor } from "@/components/portfolio/PortfolioDoctor";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchPortfolioSummary, fetchWatchlist } from "@/services/marketData";
import { fetchPortfolioDoctorAnalysis } from "@/services/portfolioAnalysisData";

export default async function PortfolioPage() {
  const [portfolio, watchlist, doctorAnalysis] = await Promise.all([
    fetchPortfolioSummary(),
    fetchWatchlist(),
    fetchPortfolioDoctorAnalysis(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Portfolio"
        subtitle="Holdings, performance and monitored opportunities"
      />

      <section className="mb-6 animate-fade-in-up">
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

      <section className="mb-6 animate-fade-in-up [animation-delay:120ms]">
        <Watchlist initialItems={watchlist} />
      </section>

      <section className="animate-fade-in-up [animation-delay:180ms]">
        <PortfolioDoctor analysis={doctorAnalysis} />
      </section>
    </div>
  );
}
