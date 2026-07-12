import { AIMarketSummary } from "@/components/dashboard/AIMarketSummary";
import {
  AIIntradayIdeas,
  AISwingTradeIdeas,
} from "@/components/dashboard/AITradeIdeas";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchAIMarketSummary } from "@/services/marketData";
import {
  fetchIntradayIdeas,
  fetchSwingTradeIdeas,
} from "@/services/researchDashboardData";
import Link from "next/link";

const aiTools = [
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
  const [summary, intradayIdeas, swingIdeas] = await Promise.all([
    fetchAIMarketSummary(),
    fetchIntradayIdeas(),
    fetchSwingTradeIdeas(),
  ]);

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="AI Insights"
        subtitle="Institutional AI research workspace"
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
        <AIMarketSummary summary={summary} />
      </section>

      <section>
        <AIIntradayIdeas ideas={intradayIdeas} />
      </section>

      <section>
        <AISwingTradeIdeas ideas={swingIdeas} />
      </section>
    </div>
  );
}
