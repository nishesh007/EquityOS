/**
 * Institutional Research Knowledge — presentation models (Sprint 10A.R4).
 * Notes, annotations, evidence, bookmarks, memory. Never surface null/undefined/NaN.
 */

import { safeWorkspaceText } from "../WorkspaceModels";

export const KNOWLEDGE_EMPTY = {
  noNotes: "No Notes",
  noEvidence: "No Evidence",
  noBookmarks: "No Bookmarks",
  awaitingResearch: "Awaiting Research",
  knowledgeBaseEmpty: "Knowledge Base Empty",
} as const;

export type KnowledgeEmptyMessage =
  (typeof KNOWLEDGE_EMPTY)[keyof typeof KNOWLEDGE_EMPTY];

export const NOTE_FORMATS = ["rich", "markdown"] as const;
export type NoteFormat = (typeof NOTE_FORMATS)[number];

export const ANNOTATION_TARGETS = [
  "metric",
  "chart",
  "ai_insight",
  "earnings",
  "alert",
  "screener",
] as const;
export type AnnotationTarget = (typeof ANNOTATION_TARGETS)[number];

export const EVIDENCE_KINDS = [
  "bull",
  "bear",
  "catalyst",
  "risk",
  "management",
  "financial",
  "technical",
  "news",
  "confidence",
] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

export const BOOKMARK_KINDS = [
  "company",
  "report",
  "research",
  "alert",
  "screen",
  "strategy",
  "workspace",
] as const;
export type BookmarkKind = (typeof BOOKMARK_KINDS)[number];

export interface NoteVersion {
  id: string;
  body: string;
  savedAt: string;
}

export interface ResearchNote {
  id: string;
  workspaceId: string;
  ticker: string | null;
  title: string;
  body: string;
  format: NoteFormat;
  pinned: boolean;
  favorite: boolean;
  autoSaved: boolean;
  versions: NoteVersion[];
  createdAt: string;
  updatedAt: string;
  empty: boolean;
  emptyMessage: KnowledgeEmptyMessage;
}

export interface ResearchAnnotation {
  id: string;
  workspaceId: string;
  ticker: string | null;
  target: AnnotationTarget;
  label: string;
  excerpt: string;
  route: string;
  createdAt: string;
  empty: boolean;
  emptyMessage: KnowledgeEmptyMessage;
}

export interface EvidenceItem {
  id: string;
  workspaceId: string;
  ticker: string | null;
  kind: EvidenceKind;
  label: string;
  summary: string;
  source: string;
  confidence: number;
  createdAt: string;
  empty: boolean;
  emptyMessage: KnowledgeEmptyMessage;
}

export interface ResearchBookmark {
  id: string;
  workspaceId: string;
  kind: BookmarkKind;
  label: string;
  target: string;
  route: string;
  ticker: string | null;
  createdAt: string;
  empty: boolean;
  emptyMessage: KnowledgeEmptyMessage;
}

export interface MemoryTimelineEntry {
  id: string;
  ticker: string | null;
  kind: "conclusion" | "decision" | "observation" | "note";
  label: string;
  detail: string;
  at: string;
  empty: boolean;
  emptyMessage: KnowledgeEmptyMessage;
}

export interface KnowledgeBaseView {
  linkedNotes: ResearchNote[];
  relatedCompanies: string[];
  relatedSectors: string[];
  relatedThemes: string[];
  researchHistory: MemoryTimelineEntry[];
  aiMemory: MemoryTimelineEntry[];
  empty: boolean;
  emptyMessage: KnowledgeEmptyMessage;
}

/** Build a fully-keyed evidence map without unsafe casting. */
export function emptyEvidenceByKind(): Record<EvidenceKind, EvidenceItem[]> {
  return {
    news: [],
    technical: [],
    risk: [],
    confidence: [],
    bull: [],
    bear: [],
    financial: [],
    management: [],
    catalyst: [],
  };
}

export interface EvidenceView {
  items: EvidenceItem[];
  byKind: Record<EvidenceKind, EvidenceItem[]>;
  bull: EvidenceItem[];
  bear: EvidenceItem[];
  catalysts: EvidenceItem[];
  risks: EvidenceItem[];
  empty: boolean;
  emptyMessage: KnowledgeEmptyMessage;
}

export interface KnowledgeView {
  notes: ResearchNote[];
  annotations: ResearchAnnotation[];
  bookmarks: ResearchBookmark[];
  knowledge: KnowledgeBaseView;
  evidence: EvidenceView;
  memory: MemoryTimelineEntry[];
  empty: boolean;
  emptyMessage: KnowledgeEmptyMessage;
  surfaceHints: {
    research: string;
    dashboard: string;
    company: string;
    results: string;
  };
}

export function emptyNote(
  message: KnowledgeEmptyMessage = KNOWLEDGE_EMPTY.noNotes
): ResearchNote {
  return {
    id: "",
    workspaceId: "",
    ticker: null,
    title: message,
    body: message,
    format: "markdown",
    pinned: false,
    favorite: false,
    autoSaved: false,
    versions: [],
    createdAt: "—",
    updatedAt: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeNote(
  input?: Partial<ResearchNote> | null,
  message: KnowledgeEmptyMessage = KNOWLEDGE_EMPTY.noNotes
): ResearchNote {
  if (!input) return emptyNote(message);
  const id = safeWorkspaceText(input.id, "").toLowerCase();
  const empty = !id || Boolean(input.empty);
  return {
    id,
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    title: empty && !id ? message : safeWorkspaceText(input.title, message),
    body: safeWorkspaceText(input.body, message),
    format: input.format === "rich" ? "rich" : "markdown",
    pinned: Boolean(input.pinned),
    favorite: Boolean(input.favorite),
    autoSaved: Boolean(input.autoSaved),
    versions: Array.isArray(input.versions)
      ? input.versions.map((v) => ({
          id: safeWorkspaceText(v.id, ""),
          body: safeWorkspaceText(v.body, ""),
          savedAt: safeWorkspaceText(v.savedAt, "—"),
        }))
      : [],
    createdAt: safeWorkspaceText(input.createdAt, "—"),
    updatedAt: safeWorkspaceText(input.updatedAt, "—"),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as KnowledgeEmptyMessage) ||
        message
      : KNOWLEDGE_EMPTY.awaitingResearch,
  };
}

export function emptyAnnotation(
  message: KnowledgeEmptyMessage = KNOWLEDGE_EMPTY.awaitingResearch
): ResearchAnnotation {
  return {
    id: "",
    workspaceId: "",
    ticker: null,
    target: "metric",
    label: message,
    excerpt: message,
    route: "/research",
    createdAt: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeAnnotation(
  input?: Partial<ResearchAnnotation> | null,
  message: KnowledgeEmptyMessage = KNOWLEDGE_EMPTY.awaitingResearch
): ResearchAnnotation {
  if (!input) return emptyAnnotation(message);
  const id = safeWorkspaceText(input.id, "").toLowerCase();
  const empty = !id || Boolean(input.empty);
  const target = normalizeAnnotationTarget(input.target);
  return {
    id,
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    target,
    label: safeWorkspaceText(input.label, message),
    excerpt: safeWorkspaceText(input.excerpt, message),
    route: safeWorkspaceText(input.route, "/research"),
    createdAt: safeWorkspaceText(input.createdAt, "—"),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as KnowledgeEmptyMessage) ||
        message
      : KNOWLEDGE_EMPTY.awaitingResearch,
  };
}

export function emptyEvidence(
  message: KnowledgeEmptyMessage = KNOWLEDGE_EMPTY.noEvidence
): EvidenceItem {
  return {
    id: "",
    workspaceId: "",
    ticker: null,
    kind: "bull",
    label: message,
    summary: message,
    source: "—",
    confidence: 0,
    createdAt: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeEvidence(
  input?: Partial<EvidenceItem> | null,
  message: KnowledgeEmptyMessage = KNOWLEDGE_EMPTY.noEvidence
): EvidenceItem {
  if (!input) return emptyEvidence(message);
  const id = safeWorkspaceText(input.id, "").toLowerCase();
  const empty = !id || Boolean(input.empty);
  return {
    id,
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    kind: normalizeEvidenceKind(input.kind),
    label: safeWorkspaceText(input.label, message),
    summary: safeWorkspaceText(input.summary, message),
    source: safeWorkspaceText(input.source, "—"),
    confidence: Math.max(0, Math.min(100, Number(input.confidence) || 0)),
    createdAt: safeWorkspaceText(input.createdAt, "—"),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as KnowledgeEmptyMessage) ||
        message
      : KNOWLEDGE_EMPTY.awaitingResearch,
  };
}

export function emptyBookmark(
  message: KnowledgeEmptyMessage = KNOWLEDGE_EMPTY.noBookmarks
): ResearchBookmark {
  return {
    id: "",
    workspaceId: "",
    kind: "company",
    label: message,
    target: "—",
    route: "/research",
    ticker: null,
    createdAt: "—",
    empty: true,
    emptyMessage: message,
  };
}

export function normalizeBookmark(
  input?: Partial<ResearchBookmark> | null,
  message: KnowledgeEmptyMessage = KNOWLEDGE_EMPTY.noBookmarks
): ResearchBookmark {
  if (!input) return emptyBookmark(message);
  const id = safeWorkspaceText(input.id, "").toLowerCase();
  const empty = !id || Boolean(input.empty);
  return {
    id,
    workspaceId: safeWorkspaceText(input.workspaceId, "").toLowerCase(),
    kind: normalizeBookmarkKind(input.kind),
    label: safeWorkspaceText(input.label, message),
    target: safeWorkspaceText(input.target, "—"),
    route: safeWorkspaceText(input.route, "/research"),
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    createdAt: safeWorkspaceText(input.createdAt, "—"),
    empty,
    emptyMessage: empty
      ? (safeWorkspaceText(input.emptyMessage, message) as KnowledgeEmptyMessage) ||
        message
      : KNOWLEDGE_EMPTY.awaitingResearch,
  };
}

export function emptyKnowledgeView(
  message: KnowledgeEmptyMessage = KNOWLEDGE_EMPTY.knowledgeBaseEmpty
): KnowledgeView {
  return {
    notes: [],
    annotations: [],
    bookmarks: [],
    knowledge: {
      linkedNotes: [],
      relatedCompanies: [],
      relatedSectors: [],
      relatedThemes: [],
      researchHistory: [],
      aiMemory: [],
      empty: true,
      emptyMessage: message,
    },
    evidence: {
      items: [],
      byKind: emptyEvidenceByKind(),
      bull: [],
      bear: [],
      catalysts: [],
      risks: [],
      empty: true,
      emptyMessage: KNOWLEDGE_EMPTY.noEvidence,
    },
    memory: [],
    empty: true,
    emptyMessage: message,
    surfaceHints: {
      research: "/research",
      dashboard: "/",
      company: "/company",
      results: "/results",
    },
  };
}

function normalizeAnnotationTarget(value?: string | null): AnnotationTarget {
  const text = safeWorkspaceText(value, "metric");
  return (ANNOTATION_TARGETS as readonly string[]).includes(text)
    ? (text as AnnotationTarget)
    : "metric";
}

function normalizeEvidenceKind(value?: string | null): EvidenceKind {
  const text = safeWorkspaceText(value, "bull");
  return (EVIDENCE_KINDS as readonly string[]).includes(text)
    ? (text as EvidenceKind)
    : "bull";
}

function normalizeBookmarkKind(value?: string | null): BookmarkKind {
  const text = safeWorkspaceText(value, "company");
  return (BOOKMARK_KINDS as readonly string[]).includes(text)
    ? (text as BookmarkKind)
    : "company";
}
