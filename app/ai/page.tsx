import { PageHeader } from "@/components/layout/PageHeader";
import { MarketIntelligenceStrip } from "@/components/market";
import { SharedRecommendationPanel } from "@/components/recommendations";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { fetchSharedRecommendationsFresh } from "@/services/opportunityEngine";
import { Bot } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const aiTools = [
  {
    href: "/ai/screener",
    title: "AI Screener",
    description: "Technical, fundamental & multi-factor screens",
  },
  {
    href: "/ai/research",
    title: "AI Research Analyst",
    description: "Ask anything about any listed company.",
  },
  {
    href: "/ai/earnings",
    title: "Earnings Engine",
    description: "Quarterly result analysis",
  },
  {
    href: "/ai/compare",
    title: "AI Compare",
    description: "Compare up to 5 companies",
  },
  {
    href: "/ai/watch",
    title: "AI Watchlist",
    description: "Monitor companies automatically",
  },
] as const;

export default async function AIInsightsPage() {
  const [marketIntelligence, recommendations] = await Promise.all([
    getMarketIntelligenceSnapshot(),
    fetchSharedRecommendationsFresh(12),
  ]);
  const intraday = recommendations.filter(
    (recommendation) => recommendation.category === "intraday"
  );
  const swing = recommendations.filter((recommendation) =>
    ["swing", "breakout", "momentum"].includes(recommendation.category)
  );

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        accent="purple"
        icon={<Bot className="h-5 w-5" />}
        title="AI Insights"
        subtitle="Investment intelligence and AI research workspace"
      />

      <div className="grid gap-4 md:grid-cols-4">
        {aiTools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="glass-card p-5 transition hover:bg-surface-hover/60 hover:shadow-lg"
          >
            <h3 className="text-lg font-semibold text-text-primary">
              {tool.title}
            </h3>
            <p className="mt-2 text-sm text-text-muted">{tool.description}</p>
          </Link>
        ))}
      </div>

      <section>
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
      </section>

      <section>
        <SharedRecommendationPanel
          recommendations={intraday}
          title="AI Intraday Ideas · Strategy Engine"
        />
      </section>

      <section>
        <SharedRecommendationPanel
          recommendations={swing}
          title="AI Swing Ideas · Strategy Engine"
        />
      </section>
    </div>
  );
}
