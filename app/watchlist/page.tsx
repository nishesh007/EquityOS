import { Watchlist } from "@/components/dashboard/Watchlist";
import { WatchlistEarningsPanel } from "@/components/dashboard/earnings";
import { MarketIntelligenceStrip, StrategySignalPanel, WatchlistStrategyMatches } from "@/components/market";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchWatchlist } from "@/services/marketData";
import { fetchWatchlistEarningsSurface } from "@/services/earningsCalendar";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  fetchStandardizedStrategySignals,
  fetchWatchlistStrategyMatches,
} from "@/services/opportunityEngine";
import { fetchInstitutionalScreenerHealth } from "@/services/screenerData";
import { fetchResearchWorkspaceHealth } from "@/services/researchWorkspace";
import {
  fetchWatchlistPlatformHealth,
  formatWatchlistPlatformSubtitle,
} from "@/services/watchlistPlatform";
import { MainGrid, PageContainer } from "@/src/design";

export default async function WatchlistPage() {
  const [
    watchlist,
    earningsSurface,
    screenerHealth,
    researchWorkspace,
    watchlistPlatform,
    marketIntelligence,
  ] = await Promise.all([
    fetchWatchlist(),
    fetchWatchlistEarningsSurface(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
    Promise.resolve(fetchResearchWorkspaceHealth()),
    Promise.resolve(fetchWatchlistPlatformHealth()),
    getMarketIntelligenceSnapshot(),
  ]);
  const strategySignals = fetchStandardizedStrategySignals(4);
  const strategyMatches = fetchWatchlistStrategyMatches(
    watchlist.map((item) => item.symbol)
  );

  return (
    <PageContainer>
      <PageHeader
        title="Watchlist"
        subtitle={`Track symbols, price action and upcoming earnings · ${formatWatchlistPlatformSubtitle(watchlistPlatform)} · ${screenerHealth.watchlistScreens} institutional watchlist screens · workspace ${screenerHealth.workspaceReady ? "ready" : screenerHealth.emptyMessage} · research ${researchWorkspace.ready ? `${researchWorkspace.openTabs} tabs · executive ${researchWorkspace.executiveReady ? `${researchWorkspace.decisionCount} decisions` : researchWorkspace.executiveEmptyMessage}` : researchWorkspace.emptyMessage}${researchWorkspace.sprint10AFrozen ? " · 10A FROZEN" : ""} · regime ${marketIntelligence.regime.regime}`}
      />

      <section className="mb-6 animate-fade-in-up">
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
      </section>
      <section className="mb-6 animate-fade-in-up">
        <StrategySignalPanel candidates={strategySignals} />
      </section>
      <section className="mb-6 animate-fade-in-up rounded-xl border border-surface-border-subtle bg-surface-card p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">
          Watchlist Strategy Matches
        </h2>
        <WatchlistStrategyMatches matches={strategyMatches} />
      </section>

      <section className="animate-fade-in-up">
        <MainGrid
          primary={<Watchlist initialItems={watchlist} />}
          secondary={<WatchlistEarningsPanel surface={earningsSurface} />}
        />
      </section>
    </PageContainer>
  );
}
