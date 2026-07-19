import { MarketOverviewCards } from "@/components/dashboard/MarketOverviewCards";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { MarketHeatmap } from "@/components/dashboard/market-heatmap";
import { MarketIntelligenceStrip } from "@/components/market";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchMarketIndices } from "@/services/marketData";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  fetchMarketBreadth,
  fetchMarketHeatmap,
  fetchMarketPulse,
} from "@/services/researchDashboardData";
import { LineChart } from "lucide-react";

export default async function MarketsPage() {
  const [indices, pulse, breadth, heatmap, marketIntelligence] =
    await Promise.all([
      fetchMarketIndices(),
      fetchMarketPulse(),
      fetchMarketBreadth(),
      fetchMarketHeatmap("nse"),
      getMarketIntelligenceSnapshot(),
    ]);

  return (
    <div className="p-6">
      <PageHeader
        accent="indigo"
        icon={<LineChart className="h-5 w-5" />}
        title="Markets"
        subtitle="Live indices, market internals, sector heatmap and pulse across NSE & BSE"
      />

      <section className="mb-6 animate-fade-in-up [animation-delay:40ms]">
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:60ms]">
        <MarketOverviewCards indices={indices} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:120ms]">
        <MarketPulse pulse={pulse} marketIntelligence={marketIntelligence} />
      </section>

      <section className="mb-6 animate-fade-in-up [animation-delay:160ms]">
        <MarketHeatmap initial={heatmap} />
      </section>

      <section className="animate-fade-in-up [animation-delay:180ms]">
        <MarketBreadth breadth={breadth} />
      </section>
    </div>
  );
}
