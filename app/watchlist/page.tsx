import { Watchlist } from "@/components/dashboard/Watchlist";
import { WatchlistEarningsPanel } from "@/components/dashboard/earnings";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchWatchlist } from "@/services/marketData";
import { fetchWatchlistEarningsSurface } from "@/services/earningsCalendar";

export default async function WatchlistPage() {
  const [watchlist, earningsSurface] = await Promise.all([
    fetchWatchlist(),
    fetchWatchlistEarningsSurface(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Watchlist"
        subtitle="Track symbols, price action and upcoming earnings"
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
