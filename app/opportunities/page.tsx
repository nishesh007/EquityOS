import { PageHeader } from "@/components/layout/PageHeader";
import {
  EligibilityBadge,
  MarketIntelligenceStrip,
} from "@/components/market";
import { PageContainer } from "@/src/design";
import Link from "next/link";
import { computeOpportunityScore } from "@/lib/opportunity-engine/opportunity-score";
import { getOpportunityState } from "@/lib/opportunity-engine";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import {
  fetchInstitutionalScreenerHealth,
  fetchScreenerInitialData,
  runDiscoveryScan,
  toScreenUniverseCandidates,
} from "@/services/screenerData";
import { fetchResearchWorkspaceHealth } from "@/services/researchWorkspace";

function metricNumber(
  metrics: Record<string, number | string | null | undefined> | undefined,
  ...keys: string[]
): number | null {
  if (!metrics) return null;
  for (const key of keys) {
    const value = metrics[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function riskQualityFromMode(riskMode: string): number {
  if (riskMode === "Risk On") return 72;
  if (riskMode === "Risk Off") return 42;
  return 58;
}

export default async function OpportunitiesPage() {
  const [{ universe }, health, researchWorkspace, marketIntelligence] =
    await Promise.all([
      fetchScreenerInitialData(),
      Promise.resolve(fetchInstitutionalScreenerHealth()),
      Promise.resolve(fetchResearchWorkspaceHealth()),
      getMarketIntelligenceSnapshot(),
    ]);

  const opportunityState = getOpportunityState();
  const pipelineRanked = Object.values(opportunityState.categories)
    .flat()
    .filter((c) => c.pipelineEligible !== false)
    .slice()
    .sort(
      (a, b) =>
        (b.opportunityScore ?? b.aiConvictionScore) -
        (a.opportunityScore ?? a.aiConvictionScore)
    )
    .slice(0, 12);

  const ctx = marketIntelligence.context;
  const riskQuality = riskQualityFromMode(ctx.riskMode);

  // Seed discovery from live metrics + Trading Pipeline context — no placeholders.
  const candidates = toScreenUniverseCandidates(universe.rows.slice(0, 40)).map(
    (c) => {
      const metrics = (c.metrics ?? {}) as Record<
        string,
        number | string | null | undefined
      >;
      const technical =
        metricNumber(metrics, "technical", "trend_score") ?? ctx.marketStrength;
      const momentum =
        metricNumber(metrics, "momentum") ?? Math.round(ctx.momentum);
      const aiConviction =
        metricNumber(metrics, "ai_conviction") ?? technical;
      const validation =
        metricNumber(metrics, "validation_score", "validation") ??
        marketIntelligence.pipelineHealth ??
        ctx.contextConfidence;
      const scored = computeOpportunityScore({
        strategy: Math.min(
          100,
          40 + marketIntelligence.eligibleStrategyCount * 8
        ),
        context: ctx.marketStrength,
        regime: marketIntelligence.regime.confidence,
        validation,
        risk: riskQuality,
        institutional: ctx.contextScore,
        aiConviction,
      });

      return {
        ...c,
        domain: "opportunity" as const,
        tags: ["swing", "opportunity"],
        themeTags: c.sector ? [String(c.sector).toLowerCase()] : [],
        aiConviction,
        opportunityScore: scored.score,
        trustScore:
          metricNumber(metrics, "trust_score", "trust") ??
          marketIntelligence.confidence,
        validationScore: validation,
        confidence: ctx.contextConfidence,
        momentum,
        technical,
        growth: metricNumber(metrics, "growth", "revenue_yoy", "eps_growth") ?? undefined,
        quality: metricNumber(metrics, "quality", "quality_score", "roce") ?? undefined,
        risk: metricNumber(metrics, "risk") ?? riskQuality,
        fundamentalStrength:
          metricNumber(metrics, "fundamental_strength", "fundamental_score") ??
          undefined,
        liquidity: metricNumber(metrics, "liquidity") ?? undefined,
        sectorStrength: ctx.sectorBreadth,
        themeStrength: undefined,
        marketBreadth: ctx.breadthScore,
      };
    }
  );

  const discovery = runDiscoveryScan(candidates, {
    resultLimit: 10,
    minDiscoveryScore: 35,
  });

  return (
    <PageContainer>
      <PageHeader
        title="AI Opportunities"
        subtitle={`Pipeline-ranked · Discovery · regime ${marketIntelligence.regime.regime} · ${health.ideaKindsCount} idea kinds · ${health.themeCount} themes · executive ${
          health.executiveReady ? health.executiveSummary : health.emptyMessage
        } · automation ${
          researchWorkspace.automationReady
            ? `${researchWorkspace.templateCount} templates`
            : researchWorkspace.automationEmptyMessage
        } · research executive ${
          researchWorkspace.executiveReady
            ? researchWorkspace.executiveSummary
            : researchWorkspace.executiveEmptyMessage
        }${researchWorkspace.sprint10AFrozen ? " · 10A FROZEN" : ""} · research copilot ${
          researchWorkspace.copilotReady
            ? "ready"
            : researchWorkspace.copilotEmptyMessage
        } · research timeline ${
          researchWorkspace.integrationReady
            ? `${researchWorkspace.timelineCount} events`
            : researchWorkspace.integrationEmptyMessage
        }`}
      />

      <section className="mb-6">
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
      </section>

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/ai/screener"
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
        >
          AI Screener
        </Link>
        <Link
          href="/screener"
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
        >
          Screener
        </Link>
      </div>

      {pipelineRanked.length > 0 && (
        <section className="mb-8 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Trading Pipeline Rankings
          </h2>
          <p className="text-xs text-text-muted">
            {opportunityState.pipeline
              ? `${opportunityState.pipeline.regime} · ${opportunityState.pipeline.eligibleStrategyCount} eligible strategies · conf ${opportunityState.pipeline.confidence}`
              : "Awaiting next scan"}
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {pipelineRanked.map((candidate) => (
              <li
                key={candidate.id}
                className="rounded-xl border border-surface-border-subtle bg-surface-card p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {candidate.symbol}{" "}
                    <span className="font-normal text-text-muted">
                      {candidate.company}
                    </span>
                  </h3>
                  <span className="text-xs text-text-muted">
                    #{candidate.rank} ·{" "}
                    {Math.round(
                      candidate.opportunityScore ?? candidate.aiConvictionScore
                    )}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {candidate.category} · {candidate.side}
                  {candidate.strategyName ? ` · ${candidate.strategyName}` : ""}
                </p>
                <EligibilityBadge candidate={candidate} />
                <p className="mt-2 text-sm text-text-secondary">
                  {candidate.reason.split("\n")[0]}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {discovery.empty ? (
        <p className="rounded-xl border border-surface-border-subtle bg-surface-card p-4 text-sm text-text-muted">
          {discovery.emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Discovery Ideas
          </h2>
          <p className="text-sm text-text-muted">
            {discovery.totalIdeas} ideas · {discovery.themes.length} themes ·{" "}
            {discovery.sectorRotation.length} sector rotation cards
          </p>
          <ul className="grid gap-3 md:grid-cols-2">
            {discovery.ideas.map((idea) => (
              <li
                key={`${idea.ticker}-${idea.rank}`}
                className="rounded-xl border border-surface-border-subtle bg-surface-card p-4"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-text-primary">
                    {idea.ticker}{" "}
                    <span className="font-normal text-text-muted">
                      {idea.company}
                    </span>
                  </h2>
                  <span className="text-xs text-text-muted">
                    #{idea.rank} · {Math.round(idea.discoveryScore)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-text-muted">
                  {idea.category} · {idea.kinds.slice(0, 2).join(" · ") || "—"}
                </p>
                <p className="mt-2 text-sm text-text-secondary">
                  {idea.reasonSummary}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </PageContainer>
  );
}
