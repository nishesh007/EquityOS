import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { PortfolioSummary } from "@/components/dashboard/PortfolioSummary";
import { Watchlist } from "@/components/dashboard/Watchlist";
import { AIMarketSummary } from "@/components/dashboard/AIMarketSummary";
import { LatestMarketNews } from "@/components/dashboard/LatestMarketNews";
import { UpcomingResultsCalendar } from "@/components/dashboard/UpcomingResultsCalendar";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import {
  AIIntradayIdeas,
  AISwingTradeIdeas,
} from "@/components/dashboard/AITradeIdeas";
import {
  fetchMarketIndices,
  fetchPortfolioSummary,
  fetchWatchlist,
  fetchAIMarketSummary,
  fetchMarketNews,
  fetchUpcomingResults,
} from "@/services/marketData";
import {
  fetchIntradayIdeas,
  fetchMarketBreadth,
  fetchMarketPulse,
  fetchSwingTradeIdeas,
} from "@/services/researchDashboardData";

export default async function DashboardPage() {
  const [
    indices,
    portfolio,
    watchlist,
    aiSummary,
    news,
    results,
    pulse,
    breadth,
    intradayIdeas,
    swingIdeas,
  ] = await Promise.all([
    fetchMarketIndices(),
    fetchPortfolioSummary(),
    fetchWatchlist(),
    fetchAIMarketSummary(),
    fetchMarketNews(),
    fetchUpcomingResults(),
    fetchMarketPulse(),
    fetchMarketBreadth(),
    fetchIntradayIdeas(),
    fetchSwingTradeIdeas(),
  ]);

  return (
    <div className="p-6">
      <div className="mb-6 animate-fade-in-up">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Equity Research Terminal
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Indian markets, institutional flow and AI-ranked opportunities ·{" "}
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      <section className="mb-6 animate-fade-in-up [animation-delay:60ms]">
        <MarketOverviewCards indices={indices} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:120ms]">
        <MarketPulse pulse={pulse} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:180ms]">
        <MarketBreadth breadth={breadth} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:240ms]">
        <AIIntradayIdeas ideas={intradayIdeas} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:300ms]">
        <AISwingTradeIdeas ideas={swingIdeas} />
      </section>

      <section className="mb-6 grid animate-fade-in-up grid-cols-1 gap-6 [animation-delay:360ms] xl:grid-cols-2">
        <PortfolioSummary portfolio={portfolio} />
        <Watchlist initialItems={watchlist} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:420ms]">
        <AIMarketSummary summary={aiSummary} />
      </section>

      <section className="grid animate-fade-in-up grid-cols-1 gap-6 [animation-delay:480ms] xl:grid-cols-2">
        <LatestMarketNews news={news} />
        <UpcomingResultsCalendar results={results} />
      </section>
    </div>
  );
}
