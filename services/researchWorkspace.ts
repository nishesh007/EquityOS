/**
 * Research Workspace bridge — platform wiring for Sprint 10A.R1–R7.
 * Reuses existing routes/modules; does not rebuild Sprint 9 engines.
 */

import type { CompanyProfile, CompanyResearch, EquityIntelligence } from "@/types";
import {
  WORKSPACE_EMPTY,
  LAYOUT_EMPTY,
  COMPANY_WORKSPACE_EMPTY,
  KNOWLEDGE_EMPTY,
  INTEGRATION_EMPTY,
  COPILOT_EMPTY,
  AUTOMATION_EMPTY,
  createWorkspace,
  getActiveWorkspace,
  getResearchWorkspaceView,
  getWorkspaceMetrics,
  getMultiTabWorkspaceView,
  getWorkspaceHistory,
  getCompanyWorkspaceView,
  listRecentWorkspaces,
  listWorkspaces,
  listOpenTabs,
  openWorkspace,
  openTab,
  openCompanyWorkspace,
  ensurePersistedWorkspace,
  restoreSession,
  getKnowledge,
  ingestEvidenceBag,
  createNote,
  getResearchTimeline,
  getWorkspaceInsights,
  getDecisionJournal,
  getSnapshotTimeline,
  syncCrossModuleResearch,
  createSnapshot,
  recordDecision,
  askResearchQuestion,
  generateResearchSummary,
  compareResearch,
  buildDecisionAssistant,
  getResearchRecommendations,
  buildCopilotExplainability,
  createTemplate,
  applyTemplate,
  runAutomation,
  getWorkspaceAnalytics,
  getTasksView,
  getTemplateView,
  getFavoritesView,
  getProductivityView,
  trackCompanyResearched,
  type ResearchWorkspaceMetrics,
  type ResearchWorkspaceRecord,
  type ResearchWorkspaceView,
  type MultiTabWorkspaceView,
  type WorkspaceHistoryView,
  type CompanyWorkspaceView,
  type CompanyWorkspaceSnapshot,
  type KnowledgeView,
  type ResearchTimelineView,
  type WorkspaceInsights,
  type DecisionJournalView,
  type SnapshotTimelineView,
  type ResearchQuestionAnswer,
  type ResearchSummaryView,
  type ResearchComparisonView,
  type DecisionAssistantView,
  type ResearchRecommendationView,
  type CopilotExplainabilityView,
  type WorkspaceAnalytics,
  type TasksView,
  type TemplateView,
  type FavoritesView,
  type ProductivityView,
} from "@/src/core/research/workspace";

export type ResearchWorkspaceHealth = {
  ready: boolean;
  workspaceCount: number;
  openSessions: number;
  pinned: number;
  researchCount: number;
  openTabs: number;
  companyReady: boolean;
  knowledgeReady: boolean;
  integrationReady: boolean;
  copilotReady: boolean;
  automationReady: boolean;
  noteCount: number;
  evidenceCount: number;
  timelineCount: number;
  decisionCount: number;
  snapshotCount: number;
  templateCount: number;
  taskCount: number;
  favoriteCount: number;
  activeWorkspaceId: string;
  emptyMessage: string;
  layoutEmptyMessage: string;
  companyEmptyMessage: string;
  knowledgeEmptyMessage: string;
  integrationEmptyMessage: string;
  copilotEmptyMessage: string;
  automationEmptyMessage: string;
  surface: {
    research: string;
    dashboard: string;
    company: string;
    results: string;
    portfolio: string;
    watchlist: string;
    opportunities: string;
  };
};

/** Map existing profile/research/intelligence bags — no recalculation. */
export function buildCompanyWorkspaceSnapshot(input: {
  profile: CompanyProfile;
  research?: CompanyResearch | null;
  intelligence?: EquityIntelligence | null;
}): CompanyWorkspaceSnapshot {
  const { profile, research, intelligence } = input;
  const f = profile.financials;
  const tech = research?.technicals;
  const ai = research?.ai;
  const thesis = intelligence?.thesis;
  const valuation = intelligence?.valuation;
  const dcfModel = valuation?.models?.find((m) =>
    m.key.toLowerCase().includes("dcf")
  );

  const parseMoney = (value: string | number | null | undefined): number => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    if (!value) return 0;
    const n = Number.parseFloat(String(value).replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const rsiIndicator = tech?.indicators?.find(
    (i) => i.name.toLowerCase() === "rsi"
  );
  const macdIndicator = tech?.indicators?.find((i) =>
    i.name.toLowerCase().includes("macd")
  );
  const rsiRaw = rsiIndicator?.value;
  const rsi =
    typeof rsiRaw === "number"
      ? rsiRaw
      : Number.parseFloat(String(rsiRaw ?? "").replace(/[^0-9.\-]/g, "")) || 0;

  return {
    ticker: profile.symbol,
    name: profile.name,
    sector: profile.sector,
    industry: profile.industry,
    price: profile.price,
    changePercent: profile.changePercent ?? 0,
    marketCap: String(profile.marketCap ?? "—"),
    description: profile.description ?? profile.name,
    financials: {
      revenue: parseMoney(f.revenue),
      revenueGrowth: f.revenueGrowth ?? 0,
      netProfit: parseMoney(f.netProfit),
      netProfitGrowth: f.netProfitGrowth ?? 0,
      operatingMargin: research?.results?.operatingMargin ?? 0,
      netMargin: research?.results?.netMargin ?? 0,
      cashFlow: 0,
      pe: f.pe ?? 0,
      pb: f.pb ?? 0,
      evEbitda: valuation?.evEbitda?.value ?? 0,
      roe: f.roe ?? 0,
      roce: f.roce ?? 0,
      debtToEquity: f.debtToEquity ?? 0,
    },
    technicals: {
      trend: ai?.trend ?? COMPANY_WORKSPACE_EMPTY.noTechnicalData,
      momentum: ai?.momentum ?? COMPANY_WORKSPACE_EMPTY.noTechnicalData,
      support: ai?.support ?? 0,
      resistance: ai?.resistance ?? 0,
      rsi,
      macd: String(macdIndicator?.value ?? "—"),
      score: tech?.score ?? 0,
    },
    valuation: {
      pe: valuation?.pe?.value ?? f.pe ?? 0,
      pb: valuation?.pb?.value ?? f.pb ?? 0,
      evEbitda: valuation?.evEbitda?.value ?? 0,
      dcfFairValue: dcfModel?.fairValue ?? null,
      dcfAvailable: Boolean(dcfModel && dcfModel.fairValue > 0),
      dcfNote:
        dcfModel?.explanation ??
        "DCF reuses existing valuation models when available.",
      relativeSummary:
        valuation?.summary ??
        thesis?.valuationOpinion ??
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
      fairValue:
        valuation?.estimatedFairValue ?? thesis?.fairValue ?? profile.price,
      upsidePercent: valuation?.upsidePercent ?? 0,
    },
    quality: {
      moatVerdict: thesis?.moat ?? "—",
      moatScore: intelligence?.financialQuality?.overallScore ?? 0,
      capitalAllocation:
        intelligence?.summary?.summary ??
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
      roce: f.roce ?? 0,
      roe: f.roe ?? 0,
      managementQuality:
        thesis?.managementQuality ?? COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
      summary: thesis?.moat ?? COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
    },
    risk: {
      business: thesis?.keyRisks?.slice(0, 4) ?? [],
      financial:
        intelligence?.redFlags
          ?.filter((r) => r.severity !== "Low")
          .slice(0, 4)
          .map((r) => r.label) ?? [],
      valuation: thesis?.valuationOpinion ? [thesis.valuationOpinion] : [],
      sector: [`Sector: ${profile.sector}`],
      aggregateScore: intelligence?.score?.overall ?? 0,
      summary:
        intelligence?.summary?.summary ??
        COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
    },
    insights: {
      businessSummary:
        profile.description ||
        intelligence?.summary?.summary ||
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
      investmentThesis:
        thesis?.recommendationRationale ||
        ai?.investmentThesis ||
        COMPANY_WORKSPACE_EMPTY.noResearchAvailable,
      aiRecommendation: String(
        thesis?.recommendation ??
          intelligence?.decision?.recommendation ??
          "—"
      ),
      confidence:
        thesis?.confidence ?? intelligence?.researchConfidence?.overall ?? 0,
      confidenceLabel: `Confidence ${Math.round(
        thesis?.confidence ?? intelligence?.researchConfidence?.overall ?? 0
      )}`,
      bullCase: thesis?.bullCase ? [thesis.bullCase] : [],
      bearCase: thesis?.bearCase ? [thesis.bearCase] : [],
      catalysts: thesis?.keyCatalysts ?? [],
      headwinds: thesis?.keyRisks ?? [],
      keyTakeaways: intelligence?.summary?.reasons?.slice(0, 5) ?? [],
    },
    badges: {
      confidence: `Confidence ${Math.round(
        intelligence?.researchConfidence?.overall ?? thesis?.confidence ?? 0
      )}`,
      trust: "Trust attached",
      validation: "Validation attached",
    },
  };
}

export function openCompanyResearchWorkspace(input: {
  profile: CompanyProfile;
  research?: CompanyResearch | null;
  intelligence?: EquityIntelligence | null;
}): CompanyWorkspaceView {
  const snapshot = buildCompanyWorkspaceSnapshot(input);
  const workspace = ensureDefaultResearchWorkspace({
    name: `Research · ${snapshot.ticker}`,
    ticker: snapshot.ticker,
  });
  const view = openCompanyWorkspace(snapshot);

  if (!workspace.empty && snapshot.ticker) {
    ingestEvidenceBag({
      workspaceId: workspace.id,
      ticker: snapshot.ticker,
      bull: snapshot.insights.bullCase,
      bear: snapshot.insights.bearCase,
      catalysts: snapshot.insights.catalysts,
      risks: [
        ...snapshot.risk.business,
        ...snapshot.risk.financial,
        ...snapshot.risk.valuation,
      ],
      financial: snapshot.insights.keyTakeaways,
      technical: [snapshot.technicals.trend, snapshot.technicals.momentum].filter(
        (v) => v && v !== COMPANY_WORKSPACE_EMPTY.noTechnicalData
      ),
      confidence: [snapshot.badges.confidence, snapshot.badges.validation],
    });
    createNote({
      workspaceId: workspace.id,
      ticker: snapshot.ticker,
      title: `Research · ${snapshot.ticker}`,
      body: snapshot.insights.investmentThesis,
      format: "markdown",
    });
    syncCrossModuleResearch({
      workspaceId: workspace.id,
      ticker: snapshot.ticker,
      earningsLines: snapshot.insights.catalysts.slice(0, 3),
      alertLines: snapshot.risk.business.slice(0, 2),
      screenerLines: [snapshot.badges.validation].filter(Boolean),
      validationLines: [snapshot.badges.validation].filter(Boolean),
      trustLines: [snapshot.badges.trust].filter(Boolean),
      opportunityLines: snapshot.insights.keyTakeaways.slice(0, 2),
      portfolioLines: [`Portfolio context · ${snapshot.ticker}`],
      watchlistLines: [`Watchlist context · ${snapshot.ticker}`],
    });
    createSnapshot({
      workspaceId: workspace.id,
      ticker: snapshot.ticker,
      label: `Snapshot · ${snapshot.ticker}`,
    });
    recordDecision({
      workspaceId: workspace.id,
      ticker: snapshot.ticker,
      kind: "initial_thesis",
      body: snapshot.insights.investmentThesis,
      confidence: snapshot.quality.moatScore,
    });
    trackCompanyResearched(snapshot.ticker);
    const earningsTpl = createTemplate({
      workspaceId: workspace.id,
      kind: "company_deep_dive",
      ticker: snapshot.ticker,
    });
    runAutomation({
      workspaceId: workspace.id,
      ticker: snapshot.ticker,
      templateId: earningsTpl.id,
      rules: ["auto_open_research", "auto_load_notes"],
    });
  }

  return view;
}

/** Health/status bridge for /research, /, /company, /results, /portfolio, /watchlist. */
export function fetchResearchWorkspaceHealth(): ResearchWorkspaceHealth {
  try {
    const metrics = getWorkspaceMetrics();
    const active = getActiveWorkspace();
    const workspaces = listWorkspaces({ includeArchived: true });
    const openTabs = active ? listOpenTabs(active.id).length : 0;
    const companyView = getCompanyWorkspaceView();
    const knowledge = getKnowledge({
      workspaceId: active?.id,
      ticker: companyView.overview.ticker || undefined,
    });
    const timeline = getResearchTimeline({
      workspaceId: active?.id,
      ticker: companyView.overview.ticker || undefined,
    });
    const decisions = getDecisionJournal({
      workspaceId: active?.id,
      ticker: companyView.overview.ticker || undefined,
    });
    const snapshots = getSnapshotTimeline({
      workspaceId: active?.id,
      ticker: companyView.overview.ticker || undefined,
    });
    const summary = generateResearchSummary({
      workspaceId: active?.id,
      ticker: companyView.overview.ticker || undefined,
    });
    const analytics = getWorkspaceAnalytics({ workspaceId: active?.id });
    const tasks = getTasksView({ workspaceId: active?.id });
    const templates = getTemplateView({ workspaceId: active?.id });
    const favorites = getFavoritesView({ workspaceId: active?.id });
    return {
      ready: workspaces.length > 0 || !metrics.empty,
      workspaceCount: metrics.workspaceCount,
      openSessions: metrics.openSessions,
      pinned: metrics.pinned,
      researchCount: metrics.researchCount,
      openTabs,
      companyReady: !companyView.empty,
      knowledgeReady: !knowledge.empty,
      integrationReady: !timeline.empty,
      copilotReady: !summary.empty,
      automationReady: !analytics.empty,
      noteCount: knowledge.notes.length,
      evidenceCount: knowledge.evidence.items.length,
      timelineCount: timeline.entries.length,
      decisionCount: decisions.entries.length,
      snapshotCount: snapshots.snapshots.length,
      templateCount: templates.templates.length,
      taskCount: tasks.tasks.length,
      favoriteCount: favorites.favorites.length,
      activeWorkspaceId: active?.id ?? metrics.activeWorkspaceId,
      emptyMessage: metrics.empty
        ? WORKSPACE_EMPTY.noWorkspace
        : WORKSPACE_EMPTY.awaitingResearch,
      layoutEmptyMessage:
        openTabs > 0 ? LAYOUT_EMPTY.awaitingWorkspace : LAYOUT_EMPTY.noOpenTabs,
      companyEmptyMessage: companyView.empty
        ? COMPANY_WORKSPACE_EMPTY.noCompanySelected
        : COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
      knowledgeEmptyMessage: knowledge.empty
        ? KNOWLEDGE_EMPTY.knowledgeBaseEmpty
        : KNOWLEDGE_EMPTY.awaitingResearch,
      integrationEmptyMessage: timeline.empty
        ? INTEGRATION_EMPTY.noTimeline
        : INTEGRATION_EMPTY.awaitingResearchActivity,
      copilotEmptyMessage: summary.empty
        ? COPILOT_EMPTY.noAiSummary
        : COPILOT_EMPTY.awaitingAnalysis,
      automationEmptyMessage: analytics.empty
        ? AUTOMATION_EMPTY.awaitingWorkspace
        : AUTOMATION_EMPTY.noAutomationRules,
      surface: {
        research: "/research",
        dashboard: "/",
        company: "/company",
        results: "/results",
        portfolio: "/portfolio",
        watchlist: "/watchlist",
        opportunities: "/opportunities",
      },
    };
  } catch {
    return {
      ready: false,
      workspaceCount: 0,
      openSessions: 0,
      pinned: 0,
      researchCount: 0,
      openTabs: 0,
      companyReady: false,
      knowledgeReady: false,
      integrationReady: false,
      copilotReady: false,
      automationReady: false,
      noteCount: 0,
      evidenceCount: 0,
      timelineCount: 0,
      decisionCount: 0,
      snapshotCount: 0,
      templateCount: 0,
      taskCount: 0,
      favoriteCount: 0,
      activeWorkspaceId: "",
      emptyMessage: WORKSPACE_EMPTY.noWorkspace,
      layoutEmptyMessage: LAYOUT_EMPTY.awaitingWorkspace,
      companyEmptyMessage: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
      knowledgeEmptyMessage: KNOWLEDGE_EMPTY.knowledgeBaseEmpty,
      integrationEmptyMessage: INTEGRATION_EMPTY.noTimeline,
      copilotEmptyMessage: COPILOT_EMPTY.noAiSummary,
      automationEmptyMessage: AUTOMATION_EMPTY.awaitingWorkspace,
      surface: {
        research: "/research",
        dashboard: "/",
        company: "/company",
        results: "/results",
        portfolio: "/portfolio",
        watchlist: "/watchlist",
        opportunities: "/opportunities",
      },
    };
  }
}

export function fetchResearchWorkspaceView(): ResearchWorkspaceView {
  try {
    return getResearchWorkspaceView();
  } catch {
    return getResearchWorkspaceView();
  }
}

export function fetchMultiTabWorkspaceView(
  workspaceId?: string | null
): MultiTabWorkspaceView {
  const active = getActiveWorkspace();
  const id = workspaceId ?? active?.id ?? "";
  return getMultiTabWorkspaceView(id);
}

export function fetchWorkspaceHistory(): WorkspaceHistoryView {
  return getWorkspaceHistory();
}

export function fetchCompanyResearchWorkspaceView(
  ticker?: string | null
): CompanyWorkspaceView {
  return getCompanyWorkspaceView(ticker);
}

export function fetchResearchKnowledgeView(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  sector?: string | null;
}): KnowledgeView {
  const active = getActiveWorkspace();
  return getKnowledge({
    workspaceId: options?.workspaceId ?? active?.id,
    ticker: options?.ticker,
    sector: options?.sector,
  });
}

export function fetchResearchTimelineView(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): ResearchTimelineView {
  const active = getActiveWorkspace();
  return getResearchTimeline({
    workspaceId: options?.workspaceId ?? active?.id,
    ticker: options?.ticker,
  });
}

export function fetchWorkspaceInsightsView(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): WorkspaceInsights {
  const active = getActiveWorkspace();
  return getWorkspaceInsights({
    workspaceId: options?.workspaceId ?? active?.id,
    ticker: options?.ticker,
  });
}

export function fetchDecisionJournalView(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): DecisionJournalView {
  const active = getActiveWorkspace();
  return getDecisionJournal({
    workspaceId: options?.workspaceId ?? active?.id,
    ticker: options?.ticker,
  });
}

export function fetchSnapshotTimelineView(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): SnapshotTimelineView {
  const active = getActiveWorkspace();
  return getSnapshotTimeline({
    workspaceId: options?.workspaceId ?? active?.id,
    ticker: options?.ticker,
  });
}

export function fetchResearchSummaryView(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): ResearchSummaryView {
  const active = getActiveWorkspace();
  return generateResearchSummary({
    workspaceId: options?.workspaceId ?? active?.id,
    ticker: options?.ticker,
  });
}

export function fetchDecisionAssistantView(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): DecisionAssistantView {
  const active = getActiveWorkspace();
  return buildDecisionAssistant({
    workspaceId: options?.workspaceId ?? active?.id,
    ticker: options?.ticker,
  });
}

export function fetchResearchRecommendationsView(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  earningsLines?: string[] | null;
  alertLines?: string[] | null;
  portfolioLines?: string[] | null;
}): ResearchRecommendationView {
  const active = getActiveWorkspace();
  return getResearchRecommendations({
    workspaceId: options?.workspaceId ?? active?.id,
    ticker: options?.ticker,
    earningsLines: options?.earningsLines,
    alertLines: options?.alertLines,
    portfolioLines: options?.portfolioLines,
  });
}

export function fetchCopilotExplainabilityView(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  validationStatus?: string | null;
  trustScore?: string | null;
}): CopilotExplainabilityView {
  const active = getActiveWorkspace();
  return buildCopilotExplainability({
    workspaceId: options?.workspaceId ?? active?.id,
    ticker: options?.ticker,
    explainability: {
      validationStatus: options?.validationStatus,
      trustScore: options?.trustScore,
    },
  });
}

export function fetchWorkspaceAnalyticsView(options?: {
  workspaceId?: string | null;
}): WorkspaceAnalytics {
  const active = getActiveWorkspace();
  return getWorkspaceAnalytics({ workspaceId: options?.workspaceId ?? active?.id });
}

export function fetchWorkspaceTasksView(options?: {
  workspaceId?: string | null;
}): TasksView {
  const active = getActiveWorkspace();
  return getTasksView({ workspaceId: options?.workspaceId ?? active?.id });
}

export function fetchWorkspaceTemplatesView(options?: {
  workspaceId?: string | null;
}): TemplateView {
  const active = getActiveWorkspace();
  return getTemplateView({ workspaceId: options?.workspaceId ?? active?.id });
}

export function fetchWorkspaceFavoritesView(options?: {
  workspaceId?: string | null;
}): FavoritesView {
  const active = getActiveWorkspace();
  return getFavoritesView({ workspaceId: options?.workspaceId ?? active?.id });
}

export function fetchWorkspaceProductivityView(options?: {
  workspaceId?: string | null;
  query?: string | null;
}): ProductivityView {
  const active = getActiveWorkspace();
  return getProductivityView({
    workspaceId: options?.workspaceId ?? active?.id,
    query: options?.query,
  });
}

export function ensureDefaultResearchWorkspace(options?: {
  name?: string;
  ticker?: string | null;
}): ResearchWorkspaceRecord {
  const active = getActiveWorkspace();
  const workspace = active
    ? openWorkspace(active.id, { ticker: options?.ticker })
    : createWorkspace({
        name: options?.name ?? "Institutional Research Workspace",
        ticker: options?.ticker,
      });

  if (!workspace.empty) {
    ensurePersistedWorkspace(workspace.id, { ticker: options?.ticker });
    const tabs = listOpenTabs(workspace.id);
    if (tabs.length === 0) {
      openTab({
        workspaceId: workspace.id,
        kind: "research",
        ticker: options?.ticker,
      });
      if (options?.ticker) {
        openTab({
          workspaceId: workspace.id,
          kind: "company",
          ticker: options.ticker,
        });
      }
    }
  }

  return workspace;
}

export function restoreResearchWorkspaceSession(
  workspaceId?: string | null
): ReturnType<typeof restoreSession> {
  const active = getActiveWorkspace();
  const id = workspaceId ?? active?.id ?? "";
  return restoreSession(id);
}

export function fetchResearchWorkspaceMetrics(): ResearchWorkspaceMetrics {
  return getWorkspaceMetrics();
}

export function fetchRecentResearchWorkspaces(limit = 8): ResearchWorkspaceRecord[] {
  return listRecentWorkspaces(limit);
}

export {
  WORKSPACE_EMPTY,
  LAYOUT_EMPTY,
  COMPANY_WORKSPACE_EMPTY,
  KNOWLEDGE_EMPTY,
  INTEGRATION_EMPTY,
  COPILOT_EMPTY,
  AUTOMATION_EMPTY,
  createWorkspace,
  openWorkspace,
  listWorkspaces,
  getWorkspaceMetrics,
  openTab,
  closeTab,
  duplicateTab,
  pinTab,
  saveLayout,
  restoreLayout,
  restoreSession,
  getWorkspaceHistory,
  openCompanyWorkspace,
  refreshCompanyWorkspace,
  getCompanyOverview,
  getResearchPanels,
  syncWorkspacePanels,
  getKnowledge,
  createNote,
  bookmarkResearch,
  createAnnotation,
  getResearchTimeline,
  recordDecision,
  createSnapshot,
  compareSnapshots,
  getWorkspaceInsights,
  askResearchQuestion,
  generateResearchSummary,
  compareResearch,
  buildDecisionAssistant,
  getResearchRecommendations,
  buildCopilotExplainability,
  createTemplate,
  applyTemplate,
  runAutomation,
  getWorkspaceAnalytics,
} from "@/src/core/research/workspace";
