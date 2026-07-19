import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { MarketIntelligenceStrip } from "@/components/market";
import {
  RecommendationRefreshButton,
  SharedRecommendationPanel,
} from "@/components/recommendations";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { fetchSharedRecommendationsFresh } from "@/services/opportunityEngine";
import { PageContainer } from "@/src/design";
import { Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  const [marketIntelligence, recommendations] = await Promise.all([
    getMarketIntelligenceSnapshot(),
    fetchSharedRecommendationsFresh(20),
  ]);

  return (
    <PageContainer>
      <PageHeader
        accent="blue"
        icon={<Sparkles className="h-5 w-5" />}
        title="AI Opportunities"
        subtitle={`Strategy Engine ranked · ${marketIntelligence.regime.regime} · ${marketIntelligence.context.marketTrend} · confidence ${Math.round(marketIntelligence.confidence)}%`}
      />

      <section className="mb-6">
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
      </section>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/ai/screener"
            className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
          >
            AI Screener
          </Link>
          <Link
            href="/research"
            className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
          >
            Research Workspace
          </Link>
        </div>
        <RecommendationRefreshButton />
      </div>

      <SharedRecommendationPanel
        recommendations={recommendations}
        title="Validated Opportunity Rankings"
      />
    </PageContainer>
  );
}
