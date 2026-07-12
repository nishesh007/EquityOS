import { Watchlist } from "@/components/dashboard/Watchlist";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchWatchlist } from "@/services/marketData";

export default async function WatchlistPage() {
  const watchlist = await fetchWatchlist();

  return (
    <div className="p-6">
      <PageHeader
        title="Watchlist"
        subtitle="Track symbols, price action and sector exposure"
      />

      <section className="animate-fade-in-up max-w-4xl">
        <Watchlist initialItems={watchlist} />
      </section>
    </div>
  );
}
