import { PageHeader } from "@/components/layout/PageHeader";
import { SharedRecommendationPanel } from "@/components/recommendations";
import Link from "next/link";
import {
  fetchInstitutionalScreenerHealth,
  fetchScreenerInitialData,
  runIntelligenceScreen,
  toScreenUniverseCandidates,
} from "@/services/screenerData";
import { fetchSharedRecommendationsFresh } from "@/services/opportunityEngine";

export const dynamic = "force-dynamic";

export default async function AIScreenerPage() {
  const [{ universe }, health] = await Promise.all([
    fetchScreenerInitialData(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
  ]);

  const candidates = toScreenUniverseCandidates(universe.rows.slice(0, 80));
  const multi = runIntelligenceScreen("multi-factor", {
    universe: candidates,
    minTechnicalMatches: 1,
    minFundamentalMatches: 1,
    minAiScore: 40,
    resultLimit: 8,
  });

  const recommendations = await fetchSharedRecommendationsFresh(8);

  return (
    <div className="p-6">
      <PageHeader
        title="AI Screener"
        subtitle={`Sprint 9D FROZEN · ${health.technicalFilters} technical · ${health.fundamentalFilters} fundamental · ${health.portfolioScreens} portfolio · ${health.watchlistScreens} watchlist · ${health.strategyTemplateCount} strategy templates · discovery ${health.discoveryReady ? `${health.ideaKindsCount} kinds / ${health.themeCount} themes` : "pending"} · workspace ${health.workspaceReady ? `${health.savedScreenCount} saved / ${health.historyCount} history` : "pending"} · executive ${health.executiveReady ? health.executiveSummary : "pending"}`}
      />

      <div className="mb-4 flex flex-wrap gap-3 text-sm">
        <Link
          href="/screener"
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
        >
          Classic Screener
        </Link>
        <Link
          href="/ai/research"
          className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
        >
          Research
        </Link>
      </div>

      <section className="mb-8">
        <h2 className="mb-2 text-sm font-semibold text-text-primary">
          Multi-Factor Matches
        </h2>
        {multi.empty ? (
          <p className="text-sm text-text-muted">{multi.emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border-subtle">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-surface-border-subtle bg-surface-elevated text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">AI Score</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {multi.cards.map((card) => (
                  <tr
                    key={card.ticker}
                    className="border-b border-surface-border-subtle/60 last:border-0"
                  >
                    <td className="px-3 py-2 text-text-muted">{card.rank}</td>
                    <td className="px-3 py-2 font-medium text-text-primary">
                      <Link href={`/company/${card.ticker}`}>{card.ticker}</Link>
                    </td>
                    <td className="px-3 py-2">{card.aiScore}</td>
                    <td className="max-w-xs truncate px-3 py-2 text-text-muted">
                      {card.reasonSummary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <SharedRecommendationPanel
          recommendations={recommendations}
          title="Screened Strategy Recommendations"
        />
      </section>
    </div>
  );
}
