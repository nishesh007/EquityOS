/**
 * Institutional Research Knowledge — public exports (Sprint 10A.R4).
 */

export {
  KNOWLEDGE_EMPTY,
  NOTE_FORMATS,
  ANNOTATION_TARGETS,
  EVIDENCE_KINDS,
  BOOKMARK_KINDS,
  emptyNote,
  normalizeNote,
  emptyAnnotation,
  normalizeAnnotation,
  emptyEvidence,
  normalizeEvidence,
  emptyBookmark,
  normalizeBookmark,
  emptyKnowledgeView,
} from "./KnowledgePresentationModels";
export type {
  KnowledgeEmptyMessage,
  NoteFormat,
  AnnotationTarget,
  EvidenceKind,
  BookmarkKind,
  NoteVersion,
  ResearchNote,
  ResearchAnnotation,
  EvidenceItem,
  ResearchBookmark,
  MemoryTimelineEntry,
  KnowledgeBaseView,
  EvidenceView,
  KnowledgeView,
} from "./KnowledgePresentationModels";

export {
  createNote as createNoteRaw,
  updateNote as updateNoteRaw,
  deleteNote,
  getNote,
  listNotes,
  pinNote,
  favoriteNote,
  resetNotes,
  ResearchNotesEngine,
} from "./ResearchNotesEngine";
export type { CreateNoteInput, UpdateNoteInput } from "./ResearchNotesEngine";

export {
  createAnnotation as createAnnotationRaw,
  listAnnotations,
  deleteAnnotation,
  highlightMetric,
  highlightAiInsight,
  resetAnnotations,
  ResearchAnnotationEngine,
} from "./ResearchAnnotationEngine";
export type { CreateAnnotationInput } from "./ResearchAnnotationEngine";

export {
  addEvidence,
  listEvidence,
  getEvidence as readEvidence,
  ingestEvidenceBag,
  deleteEvidence,
  resetEvidence,
  EvidenceManager,
} from "./EvidenceManager";
export type { AddEvidenceInput } from "./EvidenceManager";

export {
  bookmarkResearch as bookmarkResearchRaw,
  listBookmarks,
  deleteBookmark,
  resetBookmarks,
  BookmarkEngine,
} from "./BookmarkEngine";
export type { BookmarkResearchInput } from "./BookmarkEngine";

export {
  recordConclusion,
  recordDecision,
  recordObservation,
  recordNoteMemory,
  getResearchTimeline,
  getPreviousConclusions,
  getHistoricalDecisions,
  getAiObservations,
  resetResearchMemory,
  ResearchMemoryEngine,
} from "./ResearchMemoryEngine";

export {
  buildKnowledgeBase,
  getKnowledge as readKnowledge,
  resetKnowledgeBase,
  KnowledgeBaseEngine,
} from "./KnowledgeBaseEngine";

import type { CreateAnnotationInput } from "./ResearchAnnotationEngine";
import type { CreateNoteInput, UpdateNoteInput } from "./ResearchNotesEngine";
import type { BookmarkResearchInput } from "./BookmarkEngine";
import type { ResearchAnnotation } from "./KnowledgePresentationModels";
import type { ResearchNote } from "./KnowledgePresentationModels";
import type { ResearchBookmark } from "./KnowledgePresentationModels";
import type { EvidenceView, KnowledgeView } from "./KnowledgePresentationModels";
import { createNote as createNoteRaw, updateNote as updateNoteRaw } from "./ResearchNotesEngine";
import { createAnnotation as createAnnotationRaw } from "./ResearchAnnotationEngine";
import { bookmarkResearch as bookmarkResearchRaw } from "./BookmarkEngine";
import { getKnowledge as readKnowledge } from "./KnowledgeBaseEngine";
import { getEvidence as readEvidence } from "./EvidenceManager";
import { recordNoteMemory } from "./ResearchMemoryEngine";
import { resetNotes } from "./ResearchNotesEngine";
import { resetAnnotations } from "./ResearchAnnotationEngine";
import { resetEvidence } from "./EvidenceManager";
import { resetBookmarks } from "./BookmarkEngine";
import { resetResearchMemory } from "./ResearchMemoryEngine";

/** Public API — Sprint 10A.R4 */

export function createNote(input: CreateNoteInput): ResearchNote {
  const note = createNoteRaw(input);
  if (!note.empty) {
    recordNoteMemory(note.ticker, note.title);
  }
  return note;
}

export function updateNote(id: string, patch: UpdateNoteInput): ResearchNote {
  return updateNoteRaw(id, patch);
}

export function createAnnotation(input: CreateAnnotationInput): ResearchAnnotation {
  return createAnnotationRaw(input);
}

export function bookmarkResearch(input: BookmarkResearchInput): ResearchBookmark {
  return bookmarkResearchRaw(input);
}

export function getKnowledge(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  sector?: string | null;
  themes?: string[] | null;
}): KnowledgeView {
  return readKnowledge(options);
}

export function getEvidence(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): EvidenceView {
  return readEvidence(options);
}

export function resetKnowledgeEngines(): void {
  resetNotes();
  resetAnnotations();
  resetEvidence();
  resetBookmarks();
  resetResearchMemory();
}
