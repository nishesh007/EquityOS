import { Watchlist } from "@/components/dashboard/Watchlist";
import { WatchlistEarningsPanel } from "@/components/dashboard/earnings";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchWatchlist } from "@/services/marketData";
import { fetchWatchlistEarningsSurface } from "@/services/earningsCalendar";
import { fetchInstitutionalScreenerHealth } from "@/services/screenerData";

export default async function WatchlistPage() {
  const [watchlist, earningsSurface, screenerHealth] = await Promise.all([
    fetchWatchlist(),
    fetchWatchlistEarningsSurface(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Watchlist"
        subtitle={`Track symbols, price action and upcoming earnings · ${screenerHealth.watchlistScreens} institutional watchlist screens · workspace ${screenerHealth.workspaceReady ? "ready" : screenerHealth.emptyMessage}`}
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
