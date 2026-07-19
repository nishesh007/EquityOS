/**
 * Institutional Screener Workspace — presentation models (Sprint 9D.R7).
 * Empty states & cards. Never surface null / undefined / NaN.
 */

import { safeScreenNumber, safeScreenText } from "../ScreenModels";

export const WORKSPACE_EMPTY = {
  noSavedScreens: "No Saved Screens",
  noHistory: "No History",
  noComparisons: "No Comparisons",
  awaitingFirstScan: "Awaiting First Scan",
} as const;

export type WorkspaceEmptyMessage =
  (typeof WORKSPACE_EMPTY)[keyof typeof WORKSPACE_EMPTY];

export const QUICK_ACTIONS = [
  "add_watchlist",
  "add_portfolio",
  "open_research",
  "generate_report",
  "compare",
  "pin",
  "favorite",
  "archive",
  "export",
] as const;

export type QuickAction = (typeof QUICK_ACTIONS)[number];

export const SCORE_DELTAS = ["Improved", "Declined", "Unchanged"] as const;

export type ScoreDelta = (typeof SCORE_DELTAS)[number];

export type WorkspaceScreenOrigin =
  | "user"
  | "strategy"
  | "discovery"
  | "institutional"
  | "shared";

export interface InstitutionalScoresSummary {
  institutional: number;
  trust: number;
  validation: number;
  momentum: number;
  growth: number;
  quality: number;
  risk: number;
  aiConviction: number;
}

export interface SavedScreenRecord {
  id: string;
  name: string;
  strategyId: string;
  screenId: string;
  runAt: string;
  topTickers: string[];
  institutionalScores: InstitutionalScoresSummary;
  trustAvg: number;
  validationAvg: number;
  tags: string[];
  pinned: boolean;
  favorite: boolean;
  archived: boolean;
  origin: WorkspaceScreenOrigin;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface ScreenHistoryRun {
  id: string;
  runTime: string;
  marketSnapshot: string;
  sectorSnapshot: string;
  validationAvg: number;
  trustAvg: number;
  topResults: string[];
  executionTimeMs: number;
  strategyId: string;
  screenId: string;
  labels: string[];
  archived: boolean;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface ComparisonTickerDelta {
  ticker: string;
  leftScore: number;
  rightScore: number;
  delta: number;
  status: ScoreDelta;
}

export interface ScreenComparisonResult {
  leftLabel: string;
  rightLabel: string;
  winners: ComparisonTickerDelta[];
  losers: ComparisonTickerDelta[];
  unchanged: ComparisonTickerDelta[];
  summary: string;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface ScreenTimelineEntry {
  ticker: string;
  screenId: string;
  metric: string;
  previous: number;
  current: number;
  delta: number;
  status: ScoreDelta;
  drivers: string[];
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export type ResearchBridgeIntent =
  | "AI Research Report"
  | "Company Research"
  | "Research History"
  | "Institutional Notes"
  | "Opportunity Page"
  | "Alert History"
  | "Earnings History"
  | "Validation Report"
  | "Trust Report";

export interface ResearchBridgeTarget {
  ticker: string;
  intent: ResearchBridgeIntent;
  path: string;
  label: string;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WorkspaceCard {
  id: string;
  title: string;
  subtitle: string;
  kind: "recent" | "pinned" | "favorite" | "saved" | "template" | "activity";
  tags: string[];
  quickActions: QuickAction[];
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WorkspaceActivity {
  id: string;
  action: string;
  target: string;
  at: string;
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export interface WorkspaceView {
  recentScreens: WorkspaceCard[];
  pinned: WorkspaceCard[];
  favorites: WorkspaceCard[];
  savedResults: WorkspaceCard[];
  sharedTemplates: WorkspaceCard[];
  recentActivity: WorkspaceActivity[];
  empty: boolean;
  emptyMessage: WorkspaceEmptyMessage;
}

export function emptyInstitutionalScoresSummary(): InstitutionalScoresSummary {
  return {
    institutional: 0,
    trust: 0,
    validation: 0,
    momentum: 0,
    growth: 0,
    quality: 0,
    risk: 0,
    aiConviction: 0,
  };
}

export function normalizeInstitutionalScoresSummary(
  input?: Partial<InstitutionalScoresSummary> | null
): InstitutionalScoresSummary {
  const base = emptyInstitutionalScoresSummary();
  if (!input) return base;
  return {
    institutional: safeScreenNumber(input.institutional, 0),
    trust: safeScreenNumber(input.trust, 0),
    validation: safeScreenNumber(input.validation, 0),
    momentum: safeScreenNumber(input.momentum, 0),
    growth: safeScreenNumber(input.growth, 0),
    quality: safeScreenNumber(input.quality, 0),
    risk: safeScreenNumber(input.risk, 0),
    aiConviction: safeScreenNumber(input.aiConviction, 0),
  };
}

export function emptySavedScreenRecord(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noSavedScreens
): SavedScreenRecord {
  return {
    id: "",
    name: message,
    strategyId: "",
    screenId: "",
    runAt: "—",
    topTickers: [],
    institutionalScores: emptyInstitutionalScoresSummary(),
    trustAvg: 0,
    validationAvg: 0,
    tags: [],
    pinned: false,
    favorite: false,
    archived: false,
    origin: "user",
    empty: true,
    emptyMessage: message,
  };
}

/** Store inputs may carry null field values; every field is defaulted during normalization. */
export type SavedScreenRecordInput = {
  [K in keyof Omit<SavedScreenRecord, "institutionalScores">]?:
    | SavedScreenRecord[K]
    | null;
} & {
  institutionalScores?: Partial<InstitutionalScoresSummary> | null;
};

export function normalizeSavedScreenRecord(
  input?: SavedScreenRecordInput | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noSavedScreens
): SavedScreenRecord {
  if (!input) return emptySavedScreenRecord(message);
  const id = safeScreenText(input.id, "").toLowerCase();
  const name = safeScreenText(input.name, message);
  const empty = !id || Boolean(input.empty);
  return {
    id,
    name: empty && !id ? message : name,
    strategyId: safeScreenText(input.strategyId, ""),
    screenId: safeScreenText(input.screenId, ""),
    runAt: safeScreenText(input.runAt, "—"),
    topTickers: normalizeTickerList(input.topTickers),
    institutionalScores: normalizeInstitutionalScoresSummary(
      input.institutionalScores
    ),
    trustAvg: safeScreenNumber(input.trustAvg, 0),
    validationAvg: safeScreenNumber(input.validationAvg, 0),
    tags: normalizeStringList(input.tags),
    pinned: Boolean(input.pinned),
    favorite: Boolean(input.favorite),
    archived: Boolean(input.archived),
    origin: normalizeOrigin(input.origin),
    empty,
    emptyMessage: empty
      ? (safeScreenText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingFirstScan,
  };
}

export function emptyScreenHistoryRun(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noHistory
): ScreenHistoryRun {
  return {
    id: "",
    runTime: "—",
    marketSnapshot: "—",
    sectorSnapshot: "—",
    validationAvg: 0,
    trustAvg: 0,
    topResults: [],
    executionTimeMs: 0,
    strategyId: "",
    screenId: "",
    labels: [],
    archived: false,
    empty: true,
    emptyMessage: message,
  };
}

/** Store inputs may carry null field values; every field is defaulted during normalization. */
export type ScreenHistoryRunInput = {
  [K in keyof ScreenHistoryRun]?: ScreenHistoryRun[K] | null;
};

export function normalizeScreenHistoryRun(
  input?: ScreenHistoryRunInput | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noHistory
): ScreenHistoryRun {
  if (!input) return emptyScreenHistoryRun(message);
  const id = safeScreenText(input.id, "").toLowerCase();
  const empty = !id || Boolean(input.empty);
  return {
    id,
    runTime: safeScreenText(input.runTime, "—"),
    marketSnapshot: safeScreenText(input.marketSnapshot, "—"),
    sectorSnapshot: safeScreenText(input.sectorSnapshot, "—"),
    validationAvg: safeScreenNumber(input.validationAvg, 0),
    trustAvg: safeScreenNumber(input.trustAvg, 0),
    topResults: normalizeTickerList(input.topResults),
    executionTimeMs: Math.max(
      0,
      Math.floor(safeScreenNumber(input.executionTimeMs, 0))
    ),
    strategyId: safeScreenText(input.strategyId, ""),
    screenId: safeScreenText(input.screenId, ""),
    labels: normalizeStringList(input.labels),
    archived: Boolean(input.archived),
    empty,
    emptyMessage: empty
      ? (safeScreenText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingFirstScan,
  };
}

export function emptyComparisonTickerDelta(
  ticker?: string | null
): ComparisonTickerDelta {
  return {
    ticker: safeScreenText(ticker, "—").toUpperCase(),
    leftScore: 0,
    rightScore: 0,
    delta: 0,
    status: "Unchanged",
  };
}

export function normalizeComparisonTickerDelta(
  input?: Partial<ComparisonTickerDelta> | null
): ComparisonTickerDelta {
  if (!input) return emptyComparisonTickerDelta();
  const leftScore = safeScreenNumber(input.leftScore, 0);
  const rightScore = safeScreenNumber(input.rightScore, 0);
  const delta = safeScreenNumber(input.delta, rightScore - leftScore);
  return {
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    leftScore,
    rightScore,
    delta,
    status: normalizeScoreDelta(input.status, delta),
  };
}

export function emptyScreenComparisonResult(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noComparisons
): ScreenComparisonResult {
  return {
    leftLabel: message,
    rightLabel: message,
    winners: [],
    losers: [],
    unchanged: [],
    summary: message,
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeScreenComparisonResult(
  input?: Partial<ScreenComparisonResult> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.noComparisons
): ScreenComparisonResult {
  if (!input) return emptyScreenComparisonResult(message);
  const winners = Array.isArray(input.winners)
    ? input.winners.map(normalizeComparisonTickerDelta)
    : [];
  const losers = Array.isArray(input.losers)
    ? input.losers.map(normalizeComparisonTickerDelta)
    : [];
  const unchanged = Array.isArray(input.unchanged)
    ? input.unchanged.map(normalizeComparisonTickerDelta)
    : [];
  const empty =
    Boolean(input.empty) ||
    (winners.length === 0 && losers.length === 0 && unchanged.length === 0);
  return {
    leftLabel: safeScreenText(input.leftLabel, message),
    rightLabel: safeScreenText(input.rightLabel, message),
    winners,
    losers,
    unchanged,
    summary: safeScreenText(input.summary, message),
    empty,
    emptyMessage: empty
      ? (safeScreenText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingFirstScan,
  };
}

export function emptyScreenTimelineEntry(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingFirstScan
): ScreenTimelineEntry {
  return {
    ticker: "—",
    screenId: "",
    metric: "—",
    previous: 0,
    current: 0,
    delta: 0,
    status: "Unchanged",
    drivers: [],
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeScreenTimelineEntry(
  input?: Partial<ScreenTimelineEntry> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingFirstScan
): ScreenTimelineEntry {
  if (!input) return emptyScreenTimelineEntry(message);
  const previous = safeScreenNumber(input.previous, 0);
  const current = safeScreenNumber(input.current, 0);
  const delta = safeScreenNumber(input.delta, current - previous);
  const empty = Boolean(input.empty);
  return {
    ticker: safeScreenText(input.ticker, "—").toUpperCase(),
    screenId: safeScreenText(input.screenId, ""),
    metric: safeScreenText(input.metric, "—"),
    previous,
    current,
    delta,
    status: normalizeScoreDelta(input.status, delta),
    drivers: normalizeStringList(input.drivers),
    empty,
    emptyMessage: empty
      ? (safeScreenText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingFirstScan,
  };
}

export function emptyResearchBridgeTarget(
  ticker?: string | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingFirstScan
): ResearchBridgeTarget {
  return {
    ticker: safeScreenText(ticker, "—").toUpperCase(),
    intent: "Company Research",
    path: "/ai/research",
    label: message,
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeResearchBridgeTarget(
  input?: Partial<ResearchBridgeTarget> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingFirstScan
): ResearchBridgeTarget {
  if (!input) return emptyResearchBridgeTarget(undefined, message);
  const ticker = safeScreenText(input.ticker, "—").toUpperCase();
  const empty = !ticker || ticker === "—" || Boolean(input.empty);
  return {
    ticker,
    intent: normalizeResearchIntent(input.intent),
    path: safeScreenText(input.path, "/ai/research"),
    label: safeScreenText(input.label, message),
    empty,
    emptyMessage: empty
      ? (safeScreenText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingFirstScan,
  };
}

export function emptyWorkspaceCard(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingFirstScan
): WorkspaceCard {
  return {
    id: "",
    title: message,
    subtitle: message,
    kind: "saved",
    tags: [],
    quickActions: [],
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeWorkspaceCard(
  input?: Partial<WorkspaceCard> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingFirstScan
): WorkspaceCard {
  if (!input) return emptyWorkspaceCard(message);
  const id = safeScreenText(input.id, "");
  const empty = !id || Boolean(input.empty);
  return {
    id,
    title: safeScreenText(input.title, message),
    subtitle: safeScreenText(input.subtitle, message),
    kind: normalizeWorkspaceKind(input.kind),
    tags: normalizeStringList(input.tags),
    quickActions: normalizeQuickActions(input.quickActions),
    empty,
    emptyMessage: empty
      ? (safeScreenText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingFirstScan,
  };
}

export function emptyWorkspaceActivity(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingFirstScan
): WorkspaceActivity {
  return {
    id: "",
    action: message,
    target: "—",
    at: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeWorkspaceActivity(
  input?: Partial<WorkspaceActivity> | null,
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingFirstScan
): WorkspaceActivity {
  if (!input) return emptyWorkspaceActivity(message);
  const id = safeScreenText(input.id, "");
  const empty = !id || Boolean(input.empty);
  return {
    id,
    action: safeScreenText(input.action, message),
    target: safeScreenText(input.target, "—"),
    at: safeScreenText(input.at, "—"),
    empty,
    emptyMessage: empty
      ? (safeScreenText(input.emptyMessage, message) as WorkspaceEmptyMessage) ||
        message
      : WORKSPACE_EMPTY.awaitingFirstScan,
  };
}

export function emptyWorkspaceView(
  message: WorkspaceEmptyMessage = WORKSPACE_EMPTY.awaitingFirstScan
): WorkspaceView {
  return {
    recentScreens: [],
    pinned: [],
    favorites: [],
    savedResults: [],
    sharedTemplates: [],
    recentActivity: [],
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeScoreDelta(
  value?: string | null,
  deltaHint?: number
): ScoreDelta {
  const text = safeScreenText(value, "").trim();
  if (text === "Improved" || text === "Declined" || text === "Unchanged") {
    return text;
  }
  const delta = safeScreenNumber(deltaHint, 0);
  if (delta > 0) return "Improved";
  if (delta < 0) return "Declined";
  return "Unchanged";
}

function normalizeTickerList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => safeScreenText(v, "").toUpperCase())
    .filter(Boolean);
}

function normalizeStringList(values?: string[] | null): string[] {
  if (!Array.isArray(values)) return [];
  return values.map((v) => safeScreenText(v, "")).filter(Boolean);
}

function normalizeOrigin(
  value?: string | null
): WorkspaceScreenOrigin {
  const text = safeScreenText(value, "user").toLowerCase();
  if (
    text === "strategy" ||
    text === "discovery" ||
    text === "institutional" ||
    text === "shared"
  ) {
    return text;
  }
  return "user";
}

function normalizeResearchIntent(
  value?: string | null
): ResearchBridgeIntent {
  const text = safeScreenText(value, "Company Research");
  const intents: ResearchBridgeIntent[] = [
    "AI Research Report",
    "Company Research",
    "Research History",
    "Institutional Notes",
    "Opportunity Page",
    "Alert History",
    "Earnings History",
    "Validation Report",
    "Trust Report",
  ];
  return intents.includes(text as ResearchBridgeIntent)
    ? (text as ResearchBridgeIntent)
    : "Company Research";
}

function normalizeWorkspaceKind(
  value?: string | null
): WorkspaceCard["kind"] {
  const text = safeScreenText(value, "saved");
  if (
    text === "recent" ||
    text === "pinned" ||
    text === "favorite" ||
    text === "template" ||
    text === "activity"
  ) {
    return text;
  }
  return "saved";
}

function normalizeQuickActions(values?: QuickAction[] | null): QuickAction[] {
  if (!Array.isArray(values)) return [];
  return values.filter((v): v is QuickAction =>
    (QUICK_ACTIONS as readonly string[]).includes(safeScreenText(v, ""))
  );
}
