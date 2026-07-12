import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchMarketIndices } from "@/services/marketData";
import {
  fetchMarketBreadth,
  fetchMarketPulse,
} from "@/services/researchDashboardData";

export default async function MarketsPage() {
  const [indices, pulse, breadth] = await Promise.all([
    fetchMarketIndices(),
    fetchMarketPulse(),
    fetchMarketBreadth(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Markets"
        subtitle="Live indices, market pulse and breadth across NSE & BSE"
      />

      <section className="mb-6 animate-fade-in-up [animation-delay:60ms]">
        <MarketOverviewCards indices={indices} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:120ms]">
        <MarketPulse pulse={pulse} />
      </section>

      <section className="animate-fade-in-up [animation-delay:180ms]">
        <MarketBreadth breadth={breadth} />
      </section>
    </div>
  );
}
