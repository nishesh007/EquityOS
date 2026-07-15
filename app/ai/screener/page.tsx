import { PageHeader } from "@/components/layout/PageHeader";
import Link from "next/link";
import {
  fetchInstitutionalScreenerHealth,
  fetchScreenerInitialData,
  runEventIntelligenceScreen,
  runIntelligenceScreen,
  toScreenUniverseCandidates,
} from "@/services/screenerData";

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

  const eventScreen = runEventIntelligenceScreen({
    events: candidates.slice(0, 40).map((c) => ({
      ticker: c.ticker,
      company: c.company,
      sector: c.sector,
      upcomingEvent: "Watchlist Event",
      domain: "earnings" as const,
      tags: ["upcoming_earnings", "this_week"],
      opportunityScore: 55,
      trustScore: 50,
      validationScore: 50,
      confidence: 52,
      eventStrength: 58,
      earningsStrength: 58,
    })),
    minEventScore: 35,
    resultLimit: 8,
  });

  return (
    <div className="p-6">
      <PageHeader
        title="AI Screener"
        subtitle={`Sprint 9D · ${health.technicalFilters} technical · ${health.fundamentalFilters} fundamental · ${health.earningsScreens} earnings · ${health.newsScreens} news screens`}
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

      <section>
        <h2 className="mb-2 text-sm font-semibold text-text-primary">
          Event Intelligence
        </h2>
        {eventScreen.empty ? (
          <p className="text-sm text-text-muted">{eventScreen.emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border-subtle">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-surface-border-subtle bg-surface-elevated text-xs uppercase text-text-muted">
                <tr>
                  <th className="px-3 py-2">Rank</th>
                  <th className="px-3 py-2">Ticker</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Event Score</th>
                  <th className="px-3 py-2">Reason</th>
                </tr>
              </thead>
              <tbody>
                {eventScreen.cards.map((card) => (
                  <tr
                    key={`${card.ticker}-${card.rank}`}
                    className="border-b border-surface-border-subtle/60 last:border-0"
                  >
                    <td className="px-3 py-2 text-text-muted">{card.rank}</td>
                    <td className="px-3 py-2 font-medium text-text-primary">
                      <Link href={`/company/${card.ticker}`}>{card.ticker}</Link>
                    </td>
                    <td className="px-3 py-2">{card.upcomingEvent}</td>
                    <td className="px-3 py-2">{card.eventScore}</td>
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
    </div>
  );
}
