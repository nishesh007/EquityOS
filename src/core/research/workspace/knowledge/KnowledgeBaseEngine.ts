/**
 * Knowledge Base engine (Sprint 10A.R4).
 * Linked notes, related companies/sectors/themes, research history, AI memory.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { listNotes } from "./ResearchNotesEngine";
import { listAnnotations } from "./ResearchAnnotationEngine";
import { listBookmarks } from "./BookmarkEngine";
import { getEvidence } from "./EvidenceManager";
import {
  getAiObservations,
  getResearchTimeline,
} from "./ResearchMemoryEngine";
import {
  KNOWLEDGE_EMPTY,
  emptyKnowledgeView,
  type KnowledgeBaseView,
  type KnowledgeView,
} from "./KnowledgePresentationModels";

export function buildKnowledgeBase(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  sector?: string | null;
  themes?: string[] | null;
}): KnowledgeBaseView {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;

  const linkedNotes = listNotes({ workspaceId: wid ?? undefined, ticker: ticker ?? undefined });
  const relatedCompanies = Array.from(
    new Set(
      [
        ...linkedNotes.map((n) => n.ticker),
        ...listBookmarks({ workspaceId: wid ?? undefined, ticker: ticker ?? undefined }).map(
          (b) => b.ticker
        ),
        ...listAnnotations({
          workspaceId: wid ?? undefined,
          ticker: ticker ?? undefined,
        }).map((a) => a.ticker),
      ].filter((t): t is string => Boolean(t))
    )
  );

  const relatedSectors = options?.sector
    ? [safeWorkspaceText(options.sector, "")]
    : [];
  const relatedThemes = Array.isArray(options?.themes)
    ? options.themes.map((t) => safeWorkspaceText(t, "")).filter(Boolean)
    : [];

  const researchHistory = getResearchTimeline({ ticker: ticker ?? undefined });
  const aiMemory = getAiObservations(ticker);

  const empty =
    linkedNotes.length === 0 &&
    relatedCompanies.length === 0 &&
    researchHistory.length === 0 &&
    aiMemory.length === 0;

  return {
    linkedNotes,
    relatedCompanies,
    relatedSectors,
    relatedThemes,
    researchHistory,
    aiMemory,
    empty,
    emptyMessage: empty
      ? KNOWLEDGE_EMPTY.knowledgeBaseEmpty
      : KNOWLEDGE_EMPTY.awaitingResearch,
  };
}

export function getKnowledge(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  sector?: string | null;
  themes?: string[] | null;
}): KnowledgeView {
  try {
    const wid = options?.workspaceId
      ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
      : null;
    const ticker = options?.ticker
      ? safeWorkspaceText(options.ticker, "").toUpperCase()
      : null;

    const notes = listNotes({ workspaceId: wid ?? undefined, ticker: ticker ?? undefined });
    const annotations = listAnnotations({
      workspaceId: wid ?? undefined,
      ticker: ticker ?? undefined,
    });
    const bookmarks = listBookmarks({
      workspaceId: wid ?? undefined,
      ticker: ticker ?? undefined,
    });
    const knowledge = buildKnowledgeBase(options);
    const evidence = getEvidence({ workspaceId: wid ?? undefined, ticker: ticker ?? undefined });
    const memory = getResearchTimeline({ ticker: ticker ?? undefined });

    const empty =
      notes.length === 0 &&
      annotations.length === 0 &&
      bookmarks.length === 0 &&
      knowledge.empty &&
      evidence.empty;

    if (empty) {
      return emptyKnowledgeView(KNOWLEDGE_EMPTY.knowledgeBaseEmpty);
    }

    return {
      notes,
      annotations,
      bookmarks,
      knowledge,
      evidence,
      memory,
      empty: false,
      emptyMessage: KNOWLEDGE_EMPTY.awaitingResearch,
      surfaceHints: {
        research: "/research",
        dashboard: "/",
        company: ticker ? `/company/${ticker}` : "/company",
        results: "/results",
      },
    };
  } catch {
    return emptyKnowledgeView(KNOWLEDGE_EMPTY.knowledgeBaseEmpty);
  }
}

export function resetKnowledgeBase(): void {
  /* composed stores reset via resetKnowledgeEngines */
}

export class KnowledgeBaseEngine {
  getKnowledge = getKnowledge;
  buildKnowledgeBase = buildKnowledgeBase;
}
