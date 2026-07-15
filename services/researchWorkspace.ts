/**
 * Research Workspace bridge — platform wiring for Sprint 10A.R1–R3.
 * Reuses existing routes/modules; does not rebuild Sprint 9 engines.
 */

import type { CompanyProfile, CompanyResearch, EquityIntelligence } from "@/types";
import {
  WORKSPACE_EMPTY,
  LAYOUT_EMPTY,
  COMPANY_WORKSPACE_EMPTY,
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
  type ResearchWorkspaceMetrics,
  type ResearchWorkspaceRecord,
  type ResearchWorkspaceView,
  type MultiTabWorkspaceView,
  type WorkspaceHistoryView,
  type CompanyWorkspaceView,
  type CompanyWorkspaceSnapshot,
} from "@/src/core/research/workspace";

export type ResearchWorkspaceHealth = {
  ready: boolean;
  workspaceCount: number;
  openSessions: number;
  pinned: number;
  researchCount: number;
  openTabs: number;
  companyReady: boolean;
  activeWorkspaceId: string;
  emptyMessage: string;
  layoutEmptyMessage: string;
  companyEmptyMessage: string;
  surface: {
    research: string;
    dashboard: string;
    company: string;
    results: string;
    portfolio: string;
    watchlist: string;
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
  ensureDefaultResearchWorkspace({
    name: `Research · ${snapshot.ticker}`,
    ticker: snapshot.ticker,
  });
  return openCompanyWorkspace(snapshot);
}

/** Health/status bridge for /research, /, /company, /results, /portfolio, /watchlist. */
export function fetchResearchWorkspaceHealth(): ResearchWorkspaceHealth {
  try {
    const metrics = getWorkspaceMetrics();
    const active = getActiveWorkspace();
    const workspaces = listWorkspaces({ includeArchived: true });
    const openTabs = active ? listOpenTabs(active.id).length : 0;
    const companyView = getCompanyWorkspaceView();
    return {
      ready: workspaces.length > 0 || !metrics.empty,
      workspaceCount: metrics.workspaceCount,
      openSessions: metrics.openSessions,
      pinned: metrics.pinned,
      researchCount: metrics.researchCount,
      openTabs,
      companyReady: !companyView.empty,
      activeWorkspaceId: active?.id ?? metrics.activeWorkspaceId,
      emptyMessage: metrics.empty
        ? WORKSPACE_EMPTY.noWorkspace
        : WORKSPACE_EMPTY.awaitingResearch,
      layoutEmptyMessage:
        openTabs > 0 ? LAYOUT_EMPTY.awaitingWorkspace : LAYOUT_EMPTY.noOpenTabs,
      companyEmptyMessage: companyView.empty
        ? COMPANY_WORKSPACE_EMPTY.noCompanySelected
        : COMPANY_WORKSPACE_EMPTY.awaitingAnalysis,
      surface: {
        research: "/research",
        dashboard: "/",
        company: "/company",
        results: "/results",
        portfolio: "/portfolio",
        watchlist: "/watchlist",
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
      activeWorkspaceId: "",
      emptyMessage: WORKSPACE_EMPTY.noWorkspace,
      layoutEmptyMessage: LAYOUT_EMPTY.awaitingWorkspace,
      companyEmptyMessage: COMPANY_WORKSPACE_EMPTY.noCompanySelected,
      surface: {
        research: "/research",
        dashboard: "/",
        company: "/company",
        results: "/results",
        portfolio: "/portfolio",
        watchlist: "/watchlist",
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
} from "@/src/core/research/workspace";
