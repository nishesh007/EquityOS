/**
 * Research — beginner stock research page.
 * Focus: one company, plain English, answers buy / why / risks / price.
 */

import Link from "next/link";
import { BeginnerResearchView } from "@/components/research/BeginnerResearchView";
import { PageContainer } from "@/src/design";
import { buildBeginnerResearchModel } from "@/lib/research/beginner-model";
import { fetchCompanyProfile } from "@/services/companyData";
import { fetchEquityIntelligence } from "@/services/equityIntelligenceData";
import { fetchCompanyResearch } from "@/services/researchData";
import {
  fetchRecommendationForSymbol,
  ensureOpportunityEngineState,
} from "@/services/opportunityEngine";
import {
  ensureDefaultResearchWorkspace,
  fetchCompanyResearchWorkspaceView,
  fetchResearchTimelineView,
  fetchWorkspaceTemplatesView,
  fetchWorkspaceTasksView,
  fetchWorkspaceFavoritesView,
  openCompanyResearchWorkspace,
} from "@/services/researchWorkspace";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";

export const dynamic = "force-dynamic";

interface ResearchPageProps {
  searchParams?: Promise<{ symbol?: string }>;
}

export default async function ResearchPage({ searchParams }: ResearchPageProps) {
  const params = (await searchParams) ?? {};
  ensureDefaultResearchWorkspace({ name: "Research" });
  await ensureOpportunityEngineState();

  const active = fetchCompanyResearchWorkspaceView();
  const requested = params.symbol?.trim()
    ? normalizeNseSymbol(params.symbol)
    : "";
  const symbol =
    requested ||
    (!active.empty && active.overview.ticker
      ? active.overview.ticker
      : "");

  if (!symbol) {
    const emptyModel = buildBeginnerResearchModel({
      profile: null,
      intelligence: null,
      recommendation: null,
    });
    return (
      <PageContainer>
        <BeginnerResearchView model={emptyModel} />
      </PageContainer>
    );
  }

  const recommendation = fetchRecommendationForSymbol(symbol);
  const [profile, research, intelligence] = await Promise.all([
    fetchCompanyProfile(symbol),
    fetchCompanyResearch(symbol, recommendation),
    fetchEquityIntelligence(symbol),
  ]);

  if (profile && research) {
    openCompanyResearchWorkspace({
      profile,
      research,
      intelligence,
    });
  }

  const timeline = fetchResearchTimelineView({ ticker: symbol });
  const templates = fetchWorkspaceTemplatesView();
  const tasks = fetchWorkspaceTasksView();
  const favorites = fetchWorkspaceFavoritesView();

  const model = buildBeginnerResearchModel({
    profile,
    intelligence,
    recommendation,
    timelineEntries: timeline.entries.map((e) => ({
      id: e.id,
      kind: e.kind,
      label: e.label,
      at: e.at,
    })),
    lastUpdated: profile?.quote?.lastUpdatedIST?.replace("\n", " "),
  });

  return (
    <PageContainer>
      <BeginnerResearchView
        model={model}
        advanced={
          <div className="space-y-4">
            <p>
              These tools are for power users. Most investors can ignore this
              section.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <Link
                  href={`/company/${symbol}`}
                  className="text-accent hover:underline"
                >
                  Full company workspace
                </Link>
              </li>
              <li>
                Templates: {templates.templates.length || 0} · Tasks:{" "}
                {tasks.pending.length || 0} · Favorites:{" "}
                {favorites.favorites.length || 0}
              </li>
              <li>
                Timeline events (raw):{" "}
                {timeline.entries
                  .slice(0, 5)
                  .map((e) => e.kind)
                  .join(", ") || "none"}
              </li>
            </ul>
          </div>
        }
      />
    </PageContainer>
  );
}
