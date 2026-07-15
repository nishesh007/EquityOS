import { PageHeader } from "@/components/layout/PageHeader";
import Link from "next/link";
import {
  fetchInstitutionalScreenerHealth,
  fetchScreenerInitialData,
  runDiscoveryScan,
  toScreenUniverseCandidates,
} from "@/services/screenerData";

export default async function OpportunitiesPage() {
  const [{ universe }, health] = await Promise.all([
    fetchScreenerInitialData(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
  ]);

  const candidates = toScreenUniverseCandidates(universe.rows.slice(0, 40)).map(
    (c) => ({
      ticker: c.ticker,
      company: c.company,
      sector: c.sector,
      industry: c.industry,
      price: c.price,
      metrics: c.metrics,
      domain: "opportunity" as const,
      tags: ["swing", "opportunity"],
      themeTags: c.sector ? [String(c.sector).toLowerCase()] : [],
      aiConviction: 68,
      opportunityScore: 66,
      trustScore: 62,
      validationScore: 60,
      confidence: 64,
      momentum: 64,
      technical: 62,
      growth: 58,
      quality: 60,
      risk: 58,
      fundamentalStrength: 60,
      liquidity: 58,
      sectorStrength: 60,
      themeStrength: 55,
      marketBreadth: 55,
    })
  );

  const discovery = runDiscoveryScan(candidates, {
    resultLimit: 10,
    minDiscoveryScore: 35,
  });

  return (
    <div className="p-6">
      <PageHeader
        title="AI Opportunities"
        subtitle={`Sprint 9D FROZEN · Discovery · ${health.ideaKindsCount} idea kinds · ${health.themeCount} themes · executive ${
          health.executiveReady ? health.executiveSummary : health.emptyMessage
        }`}
      />

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

      {discovery.empty ? (
        <p className="rounded-xl border border-surface-border-subtle bg-surface-card p-4 text-sm text-text-muted">
          {discovery.emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
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
    </div>
  );
}
