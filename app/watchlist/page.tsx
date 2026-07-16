import { Watchlist } from "@/components/dashboard/Watchlist";
import { WatchlistEarningsPanel } from "@/components/dashboard/earnings";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchWatchlist } from "@/services/marketData";
import { fetchWatchlistEarningsSurface } from "@/services/earningsCalendar";
import { fetchInstitutionalScreenerHealth } from "@/services/screenerData";
import { fetchResearchWorkspaceHealth } from "@/services/researchWorkspace";

export default async function WatchlistPage() {
  const [watchlist, earningsSurface, screenerHealth, researchWorkspace] =
    await Promise.all([
      fetchWatchlist(),
      fetchWatchlistEarningsSurface(),
      Promise.resolve(fetchInstitutionalScreenerHealth()),
      Promise.resolve(fetchResearchWorkspaceHealth()),
    ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Watchlist"
        subtitle={`Track symbols, price action and upcoming earnings · ${screenerHealth.watchlistScreens} institutional watchlist screens · workspace ${screenerHealth.workspaceReady ? "ready" : screenerHealth.emptyMessage} · research ${researchWorkspace.ready ? `${researchWorkspace.openTabs} tabs · executive ${researchWorkspace.executiveReady ? `${researchWorkspace.decisionCount} decisions` : researchWorkspace.executiveEmptyMessage}` : researchWorkspace.emptyMessage}${researchWorkspace.sprint10AFrozen ? " · 10A FROZEN" : ""}`}
      />

      <section className="mb-6 animate-fade-in-up max-w-4xl">
        <Watchlist initialItems={watchlist} />
      </section>

      <section className="animate-fade-in-up max-w-4xl">
        <WatchlistEarningsPanel surface={earningsSurface} />
      </section>
    </div>
  );
}
