import { PageHeader } from "@/components/layout/PageHeader";
import { ScrollToStrategyResearch } from "@/components/ai/insights/ScrollToStrategyResearch";
import { StrategyResearchSection } from "@/components/ai/insights/StrategyResearchSection";
import { InstitutionalOpportunityDashboard } from "@/components/dashboard/institutional-opportunity/InstitutionalOpportunityDashboard";
import {
  selectInsightsResearchTerminal,
} from "@/lib/ai/insights-research";
import { STRATEGY_RECOMMENDATION_TITLES } from "@/lib/recommendations/institutional-horizons";
import {
  INSTITUTIONAL_STRATEGY_IDS,
  INSTITUTIONAL_STRATEGY_META,
  parseInstitutionalStrategyId,
} from "@/lib/recommendations";
import { selectVerifiedConsensusStrategyDashboard } from "@/lib/recommendations/verification";
import { readPublishedFromState } from "@/lib/recommendations/published/client";
import {
  loadOpportunityEngineState,
  toSharedSnapshot,
} from "@/services/opportunityEngine";
import { getCachedMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
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

export default async function AIInsightsPage({
  searchParams,
}: {
  searchParams?: Promise<{ strategy?: string }>;
}) {
  const resolved = (await searchParams) ?? {};
  const selectedStrategy = parseInstitutionalStrategyId(resolved.strategy);

  const state = await loadOpportunityEngineState();
  // Cache-only MI for shared snapshot fallback — never runs trading pipeline.
  const marketIntelligence = getCachedMarketIntelligenceSnapshot();
  const shared = toSharedSnapshot(marketIntelligence);
  const published = readPublishedFromState(state);
  const strategyDashboard = selectVerifiedConsensusStrategyDashboard(
    published?.recommendations ?? [],
    published?.generatedAt ?? state.lastScannedAt ?? new Date(0).toISOString(),
    {
      breadthScore: marketIntelligence?.context?.breadthScore ?? null,
      asOf: published?.generatedAt ?? state.lastScannedAt ?? null,
      regime: marketIntelligence?.regime?.regime ?? null,
      marketTrend:
        marketIntelligence?.context?.marketTrend ??
        marketIntelligence?.regime?.regime ??
        null,
    }
  );
  const researchTerminal = selectInsightsResearchTerminal(state, shared);

  return (
    <div className="space-y-6 p-6">
      <ScrollToStrategyResearch strategyId={selectedStrategy} />
      <PageHeader
        accent="purple"
        icon={<Bot className="h-5 w-5" />}
        title="AI Insights"
        subtitle="Institutional strategy recommendations — complete workspace for every horizon"
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

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              EquityOS Recommendations
            </h2>
            <p className="text-sm text-text-muted">
              AI-powered recommendations across every investment horizon.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-2"
            aria-label="Strategy research anchors"
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

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            Complete Strategy Recommendations
          </h2>
          <p className="text-sm text-text-muted">
            Full Opportunity Engine recommendations for every institutional
            horizon — expand any row for explainability.
          </p>
        </div>

        {INSTITUTIONAL_STRATEGY_IDS.map((strategyId) => {
          const meta = INSTITUTIONAL_STRATEGY_META[strategyId];
          return (
            <StrategyResearchSection
              key={strategyId}
              strategyId={strategyId}
              title={STRATEGY_RECOMMENDATION_TITLES[strategyId]}
              emoji={meta.emoji}
              rows={researchTerminal[strategyId]}
              highlighted={selectedStrategy === strategyId}
              defaultView={
                selectedStrategy === strategyId ? "detailed" : "table"
              }
            />
          );
        })}
      </div>
    </div>
  );
}
