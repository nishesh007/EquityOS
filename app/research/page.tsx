/**
 * Institutional Research Workspace — primary analyst surface (Sprint 10A.R1–R8).
 * Multi-tab terminal composing existing module routes.
 */

import Link from "next/link";
import {
  COMPANY_WORKSPACE_EMPTY,
  AUTOMATION_EMPTY,
  EXECUTIVE_RESEARCH_EMPTY,
  fetchExecutiveResearchView,
  COPILOT_EMPTY,
  INTEGRATION_EMPTY,
  KNOWLEDGE_EMPTY,
  LAYOUT_EMPTY,
  WORKSPACE_EMPTY,
  ensureDefaultResearchWorkspace,
  fetchCompanyResearchWorkspaceView,
  fetchDecisionAssistantView,
  fetchDecisionJournalView,
  fetchMultiTabWorkspaceView,
  fetchResearchKnowledgeView,
  fetchWorkspaceFavoritesView,
  fetchWorkspaceProductivityView,
  fetchWorkspaceTasksView,
  fetchWorkspaceTemplatesView,
  fetchWorkspaceAnalyticsView,
  fetchResearchRecommendationsView,
  fetchResearchSummaryView,
  fetchResearchTimelineView,
  fetchResearchWorkspaceHealth,
  fetchResearchWorkspaceView,
  fetchWorkspaceHistory,
  fetchWorkspaceInsightsView,
} from "@/services/researchWorkspace";
import {
  fetchWatchlistPlatformHealth,
  formatWatchlistPlatformSubtitle,
} from "@/services/watchlistPlatform";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { MarketIntelligenceStrip } from "@/components/market";
import { PageContainer } from "@/src/design";

export default async function ResearchPage() {
  const workspace = ensureDefaultResearchWorkspace({
    name: "Institutional Research Workspace",
  });
  const health = fetchResearchWorkspaceHealth();
  const watchlistPlatform = fetchWatchlistPlatformHealth();
  const view = fetchResearchWorkspaceView();
  const multi = fetchMultiTabWorkspaceView(workspace.id);
  const history = fetchWorkspaceHistory();
  const company = fetchCompanyResearchWorkspaceView();
  const knowledge = fetchResearchKnowledgeView({
    workspaceId: workspace.id,
    ticker: company.overview.ticker || undefined,
  });
  const timeline = fetchResearchTimelineView({
    workspaceId: workspace.id,
    ticker: company.overview.ticker || undefined,
  });
  const insights = fetchWorkspaceInsightsView({
    workspaceId: workspace.id,
    ticker: company.overview.ticker || undefined,
  });
  const decisions = fetchDecisionJournalView({
    workspaceId: workspace.id,
    ticker: company.overview.ticker || undefined,
  });
  const summary = fetchResearchSummaryView({
    workspaceId: workspace.id,
    ticker: company.overview.ticker || undefined,
  });
  const assistant = fetchDecisionAssistantView({
    workspaceId: workspace.id,
    ticker: company.overview.ticker || undefined,
  });
  const recommendations = fetchResearchRecommendationsView({
    workspaceId: workspace.id,
    ticker: company.overview.ticker || undefined,
  });
  const templates = fetchWorkspaceTemplatesView({ workspaceId: workspace.id });
  const tasks = fetchWorkspaceTasksView({ workspaceId: workspace.id });
  const favorites = fetchWorkspaceFavoritesView({ workspaceId: workspace.id });
  const productivity = fetchWorkspaceProductivityView({ workspaceId: workspace.id });
  const analytics = fetchWorkspaceAnalyticsView({ workspaceId: workspace.id });
  const executive = fetchExecutiveResearchView({
    workspaceId: workspace.id,
    ticker: company.overview.ticker || undefined,
  });
  const marketIntelligence = await getMarketIntelligenceSnapshot();

  return (
    <PageContainer>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          Institutional Research Workspace
        </h1>
        <p className="mt-0.5 text-sm text-text-muted">
          Multi-tab research terminal · regime {marketIntelligence.regime.regime} ·{" "}
          {health.workspaceCount > 0
            ? `${health.workspaceCount} workspace${health.workspaceCount === 1 ? "" : "s"}`
            : health.emptyMessage}{" "}
          · {health.openTabs} open tabs ·{" "}
          {health.openSessions} sessions · research{" "}
          {health.researchCount > 0
            ? health.researchCount
            : WORKSPACE_EMPTY.awaitingResearch}{" "}
          · company{" "}
          {company.empty
            ? COMPANY_WORKSPACE_EMPTY.noCompanySelected
            : `${company.overview.ticker} · ${company.panels.length} panels`}{" "}
          · knowledge{" "}
          {knowledge.empty
            ? KNOWLEDGE_EMPTY.knowledgeBaseEmpty
            : `${knowledge.notes.length} notes · ${knowledge.evidence.items.length} evidence`}{" "}
          · timeline{" "}
          {timeline.empty
            ? INTEGRATION_EMPTY.noTimeline
            : `${timeline.entries.length} events · ${decisions.entries.length} decisions`}{" "}
          · copilot{" "}
          {summary.empty
            ? COPILOT_EMPTY.noAiSummary
            : summary.finalConclusion}{" "}
          · automation{" "}
          {analytics.empty
            ? AUTOMATION_EMPTY.awaitingWorkspace
            : `${tasks.pending.length} tasks · ${templates.templates.length} templates`}{" "}
          · executive{" "}
          {executive.empty
            ? EXECUTIVE_RESEARCH_EMPTY.awaitingResearch
            : executive.homeStrip.executiveSummary}{" "}
          · watchlists {formatWatchlistPlatformSubtitle(watchlistPlatform)}
        </p>
      </div>

      <div className="mb-6">
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
      </div>

      {view.empty && multi.empty ? (
        <div className="rounded-lg border border-surface-border-subtle px-4 py-10 text-center text-sm text-text-muted">
          {multi.emptyMessage || view.emptyMessage}
        </div>
      ) : (
        <div className="space-y-6">
          {view.active ? (
            <section>
              <h2 className="mb-2 text-sm font-medium text-text-secondary">
                Active workspace
              </h2>
              <p className="text-sm text-text-primary">{view.active.title}</p>
              <p className="text-xs text-text-muted">{view.active.subtitle}</p>
            </section>
          ) : null}

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Open tabs
            </h2>
            {multi.tabs.length === 0 ? (
              <p className="text-sm text-text-muted">{LAYOUT_EMPTY.noOpenTabs}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {multi.tabs.map((tab) => (
                  <Link
                    key={tab.id}
                    href={tab.route}
                    className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
                  >
                    {tab.pinned ? "[pin] " : ""}
                    {tab.title}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Company research panels
            </h2>
            {company.empty ? (
              <p className="text-sm text-text-muted">
                {COMPANY_WORKSPACE_EMPTY.noCompanySelected}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-text-primary">
                  {company.overview.stickySummary}
                </p>
                <div className="flex flex-wrap gap-2">
                  {company.panels.map((panel) => (
                    <span
                      key={panel.id}
                      className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs text-text-muted"
                    >
                      {panel.title}
                      {panel.empty ? ` · ${panel.emptyMessage}` : ""}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {company.quickActions.slice(0, 6).map((action) => (
                    <Link
                      key={action.id}
                      href={action.href}
                      className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Research knowledge
            </h2>
            {knowledge.empty ? (
              <p className="text-sm text-text-muted">
                {KNOWLEDGE_EMPTY.knowledgeBaseEmpty}
              </p>
            ) : (
              <div className="space-y-2 text-sm text-text-primary">
                <p className="text-xs text-text-muted">
                  {knowledge.notes.length} notes · {knowledge.annotations.length}{" "}
                  annotations · {knowledge.bookmarks.length} bookmarks ·{" "}
                  {knowledge.evidence.items.length} evidence items
                </p>
                <ul className="space-y-1 text-xs text-text-muted">
                  {knowledge.notes.slice(0, 4).map((note) => (
                    <li key={note.id}>
                      {note.pinned ? "[pin] " : ""}
                      {note.title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Unified research timeline
            </h2>
            {timeline.empty ? (
              <p className="text-sm text-text-muted">{INTEGRATION_EMPTY.noTimeline}</p>
            ) : (
              <ul className="space-y-1 text-xs text-text-muted">
                {timeline.entries.slice(0, 6).map((entry) => (
                  <li key={entry.id}>
                    [{entry.module}] {entry.label} · {entry.kind}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Workspace insights
            </h2>
            {insights.empty ? (
              <p className="text-sm text-text-muted">
                {INTEGRATION_EMPTY.awaitingResearchActivity}
              </p>
            ) : (
              <div className="space-y-2 text-sm text-text-primary">
                <p className="text-xs text-text-muted">{insights.aiSummary}</p>
                <ul className="space-y-1 text-xs text-text-muted">
                  {insights.recommendedActions.slice(0, 4).map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Decision journal
            </h2>
            {decisions.empty ? (
              <p className="text-sm text-text-muted">{INTEGRATION_EMPTY.noDecisions}</p>
            ) : (
              <ul className="space-y-1 text-xs text-text-muted">
                {decisions.entries.slice(0, 4).map((entry) => (
                  <li key={entry.id}>
                    {entry.title} · {entry.kind}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              AI research copilot
            </h2>
            {summary.empty ? (
              <p className="text-sm text-text-muted">{COPILOT_EMPTY.awaitingAnalysis}</p>
            ) : (
              <div className="space-y-2 text-sm text-text-primary">
                <p className="text-xs text-text-muted">{summary.executiveSummary}</p>
                <p className="text-xs text-text-muted">
                  {summary.bullCase.length} bull · {summary.bearCase.length} bear ·{" "}
                  {summary.catalysts.length} catalysts
                </p>
                <p className="text-xs font-medium text-text-secondary">
                  {summary.finalConclusion}
                </p>
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Decision assistant
            </h2>
            {assistant.empty ? (
              <p className="text-sm text-text-muted">{COPILOT_EMPTY.awaitingAnalysis}</p>
            ) : (
              <ul className="space-y-1 text-xs text-text-muted">
                {assistant.guidance.slice(0, 5).map((item) => (
                  <li key={item.id}>
                    {item.label}: {item.recommendation}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Recommendations
            </h2>
            {recommendations.empty ? (
              <p className="text-sm text-text-muted">{COPILOT_EMPTY.awaitingAnalysis}</p>
            ) : (
              <ul className="space-y-1 text-xs text-text-muted">
                {recommendations.immediateActions.slice(0, 4).map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Workspace templates
            </h2>
            {templates.empty ? (
              <p className="text-sm text-text-muted">{AUTOMATION_EMPTY.noTemplates}</p>
            ) : (
              <ul className="space-y-1 text-xs text-text-muted">
                {templates.templates.slice(0, 5).map((tpl) => (
                  <li key={tpl.id}>
                    {tpl.name} · {tpl.kind}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Research tasks
            </h2>
            {tasks.empty ? (
              <p className="text-sm text-text-muted">{AUTOMATION_EMPTY.noTasks}</p>
            ) : (
              <ul className="space-y-1 text-xs text-text-muted">
                {tasks.pending.slice(0, 4).map((task) => (
                  <li key={task.id}>
                    [{task.priority}] {task.title}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Favorites & productivity
            </h2>
            {favorites.empty && productivity.recentActions.length === 0 ? (
              <p className="text-sm text-text-muted">{AUTOMATION_EMPTY.noFavorites}</p>
            ) : (
              <div className="space-y-1 text-xs text-text-muted">
                <p>
                  {favorites.favorites.length} favorites ·{" "}
                  {analytics.completionRate}% completion ·{" "}
                  {analytics.researchProductivity} productivity
                </p>
                {productivity.shortcuts.slice(0, 3).map((sc) => (
                  <p key={sc.id}>
                    {sc.keys} → {sc.label}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Executive Research Hub
            </h2>
            {executive.empty ? (
              <p className="text-sm text-text-muted">
                {EXECUTIVE_RESEARCH_EMPTY.awaitingResearch}
              </p>
            ) : (
              <div className="space-y-1 text-xs text-text-muted">
                <p>{executive.homeStrip.researchProgress}</p>
                <p>{executive.homeStrip.coverageSummary}</p>
                <p>
                  Health {executive.health.overallHealthLabel} ·{" "}
                  {executive.metrics.labels.companiesResearched} companies ·{" "}
                  {executive.metrics.labels.researchQuality} quality
                </p>
                {executive.health.layers.slice(0, 4).map((layer) => (
                  <p key={layer.id}>
                    {layer.label}: {layer.scoreLabel}
                  </p>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Docked panels
            </h2>
            {multi.dock ? (
              <p className="text-xs text-text-muted">
                Left {multi.dock.left.sizePct}% · Center {multi.dock.center.sizePct}% ·
                Right {multi.dock.right.sizePct}% · Bottom {multi.dock.bottom.sizePct}%
                {multi.dock.bottom.collapsed ? " (bottom collapsed)" : ""}
              </p>
            ) : (
              <p className="text-sm text-text-muted">{LAYOUT_EMPTY.awaitingWorkspace}</p>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Research panels
            </h2>
            {view.panels.length === 0 ? (
              <p className="text-sm text-text-muted">
                {WORKSPACE_EMPTY.awaitingResearch}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {view.panels.map((panel) => (
                  <Link
                    key={panel.id}
                    href={panel.route}
                    className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
                  >
                    {panel.label}
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Session history
            </h2>
            {history.empty ? (
              <p className="text-sm text-text-muted">{LAYOUT_EMPTY.noSessionHistory}</p>
            ) : (
              <ul className="space-y-1 text-sm text-text-primary">
                {[
                  ...history.recentTabs,
                  ...history.recentCompanies,
                  ...history.recentResearch,
                ]
                  .slice(0, 8)
                  .map((entry) => (
                    <li key={entry.id}>
                      <Link href={entry.route} className="hover:text-text-secondary">
                        {entry.label}
                      </Link>
                      <span className="ml-2 text-xs text-text-muted">
                        {entry.kind}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-text-secondary">
              Recent sessions
            </h2>
            {view.sessions.length === 0 ? (
              <p className="text-sm text-text-muted">
                {WORKSPACE_EMPTY.noRecentSessions}
              </p>
            ) : (
              <ul className="space-y-1 text-sm text-text-primary">
                {view.sessions.map((session) => (
                  <li key={session.id}>
                    {session.title}
                    <span className="ml-2 text-xs text-text-muted">
                      {session.subtitle}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </PageContainer>
  );
}
