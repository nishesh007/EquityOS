import { PageHeader } from "@/components/layout/PageHeader";
import { MarketIntelligenceStrip } from "@/components/market";
import { SharedRecommendationPanel } from "@/components/recommendations";
import { InstitutionalOpportunityDashboard } from "@/components/dashboard/institutional-opportunity/InstitutionalOpportunityDashboard";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  peekOpportunityEngineState,
  toSharedSnapshot,
  fetchSharedRecommendationsFresh,
} from "@/services/opportunityEngine";
import {
  INSTITUTIONAL_STRATEGY_IDS,
  INSTITUTIONAL_STRATEGY_META,
  parseInstitutionalStrategyId,
  selectInstitutionalStrategyDashboard,
  type InstitutionalStrategyId,
  type SharedRecommendation,
} from "@/lib/recommendations";
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

const STRATEGY_FILTER: Record<
  InstitutionalStrategyId,
  (recommendation: SharedRecommendation) => boolean
> = {
  intraday: (r) =>
    r.category === "intraday" && r.primaryStrategyId !== "scalping",
  swing: (r) => r.category === "swing",
  btst: (r) => r.category === "relative_volume",
  scalping: (r) => r.primaryStrategyId === "scalping",
  short_term: (r) =>
    r.category === "breakout" || r.category === "mean_reversion",
  medium_term: (r) => r.category === "momentum",
  long_term: (r) => r.category === "ai_high_conviction",
};

export default async function AIInsightsPage({
  searchParams,
}: {
  searchParams?: Promise<{ strategy?: string }>;
}) {
  const resolved = (await searchParams) ?? {};
  const selectedStrategy = parseInstitutionalStrategyId(resolved.strategy);

  const [marketIntelligence, recommendations] = await Promise.all([
    getMarketIntelligenceSnapshot(),
    fetchSharedRecommendationsFresh(12),
  ]);

  const state = peekOpportunityEngineState();
  const strategyDashboard = selectInstitutionalStrategyDashboard(
    state,
    toSharedSnapshot(marketIntelligence)
  );

  const intraday = recommendations.filter(
    (recommendation) => recommendation.category === "intraday"
  );
  const swing = recommendations.filter((recommendation) =>
    ["swing", "breakout", "momentum"].includes(recommendation.category)
  );

  const selectedRecommendations = selectedStrategy
    ? recommendations.filter(STRATEGY_FILTER[selectedStrategy])
    : null;
  const selectedMeta = selectedStrategy
    ? INSTITUTIONAL_STRATEGY_META[selectedStrategy]
    : null;

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

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Institutional Strategies
            </h2>
            <p className="text-sm text-text-muted">
              Rankings from the master market scan — select a horizon to focus
              research.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Strategy filters"
          >
            <Link
              href="/ai"
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                !selectedStrategy
                  ? "bg-surface-hover text-text-primary"
                  : "text-text-muted hover:bg-surface-hover/60"
              }`}
            >
              All
            </Link>
            {INSTITUTIONAL_STRATEGY_IDS.map((id) => {
              const meta = INSTITUTIONAL_STRATEGY_META[id];
              const active = selectedStrategy === id;
              return (
                <Link
                  key={id}
                  href={meta.href}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-surface-hover text-text-primary ring-1 ring-white/15"
                      : "text-text-muted hover:bg-surface-hover/60"
                  }`}
                >
                  {meta.emoji} {meta.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <InstitutionalOpportunityDashboard slots={strategyDashboard} />
      </section>

      {selectedStrategy && selectedMeta ? (
        <section>
          <SharedRecommendationPanel
            recommendations={selectedRecommendations ?? []}
            title={`${selectedMeta.emoji} ${selectedMeta.label} · Strategy Engine`}
          />
        </section>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
