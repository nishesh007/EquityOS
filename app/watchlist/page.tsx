import { Watchlist } from "@/components/dashboard/Watchlist";
import { WatchlistEarningsPanel } from "@/components/dashboard/earnings";
import { MarketIntelligenceStrip } from "@/components/market";
import {
  RecommendationRefreshButton,
  SharedRecommendationPanel,
} from "@/components/recommendations";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchWatchlist } from "@/services/marketData";
import { fetchWatchlistEarningsSurface } from "@/services/earningsCalendar";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  ensureOpportunityEngineState,
  fetchRecommendationsForSymbols,
} from "@/services/opportunityEngine";
import { fetchInstitutionalScreenerHealth } from "@/services/screenerData";
import { fetchResearchWorkspaceHealth } from "@/services/researchWorkspace";
import {
  fetchWatchlistPlatformHealth,
  formatWatchlistPlatformSubtitle,
} from "@/services/watchlistPlatform";
import { MainGrid, PageContainer } from "@/src/design";

export const dynamic = "force-dynamic";

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
  await ensureOpportunityEngineState();
  const strategyRecommendationMap = fetchRecommendationsForSymbols(
    watchlist.map((item) => item.symbol)
  );
  const strategyRecommendations = [...strategyRecommendationMap.values()];

  return (
    <PageContainer>
      <PageHeader
        title="Watchlist"
        subtitle={`Track symbols, price action and upcoming earnings · ${formatWatchlistPlatformSubtitle(watchlistPlatform)} · ${screenerHealth.watchlistScreens} institutional watchlist screens · workspace ${screenerHealth.workspaceReady ? "ready" : screenerHealth.emptyMessage} · research ${researchWorkspace.ready ? `${researchWorkspace.openTabs} tabs · executive ${researchWorkspace.executiveReady ? `${researchWorkspace.decisionCount} decisions` : researchWorkspace.executiveEmptyMessage}` : researchWorkspace.emptyMessage}${researchWorkspace.sprint10AFrozen ? " · 10A FROZEN" : ""} · regime ${marketIntelligence.regime.regime}`}
      />

      <section className="mb-6 animate-fade-in-up">
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
      </section>
      <section className="mb-6 space-y-3 animate-fade-in-up">
        <div className="flex justify-end">
          <RecommendationRefreshButton />
        </div>
        <SharedRecommendationPanel
          recommendations={strategyRecommendations}
          title="Watchlist · Strategy Matches"
          emptyMessage="No validated strategy recommendation for watched stocks."
        />
      </section>

      <section className="animate-fade-in-up">
        <MainGrid
          primary={
            <Watchlist
              initialItems={watchlist}
              recommendations={Object.fromEntries(strategyRecommendationMap)}
            />
          }
          secondary={<WatchlistEarningsPanel surface={earningsSurface} />}
        />
      </section>
    </PageContainer>
  );
}
