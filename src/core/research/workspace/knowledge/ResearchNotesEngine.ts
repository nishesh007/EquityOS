/**
 * Research Notes engine (Sprint 10A.R4).
 * Rich/markdown notes, auto-save, version history, pin/favorite.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import {
  KNOWLEDGE_EMPTY,
  emptyNote,
  normalizeNote,
  type NoteFormat,
  type ResearchNote,
} from "./KnowledgePresentationModels";

export interface CreateNoteInput {
  workspaceId: string;
  ticker?: string | null;
  title?: string | null;
  body?: string | null;
  format?: NoteFormat | null;
  now?: Date | null;
}

export interface UpdateNoteInput {
  title?: string | null;
  body?: string | null;
  format?: NoteFormat | null;
  pinned?: boolean | null;
  favorite?: boolean | null;
  autoSave?: boolean | null;
  now?: Date | null;
}

const notes = new Map<string, ResearchNote>();
let noteSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function createNote(input: CreateNoteInput): ResearchNote {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptyNote(KNOWLEDGE_EMPTY.awaitingResearch);

  noteSeq += 1;
  const now = stamp(input.now);
  const id = `note-${noteSeq}-${Date.now()}`;
  const body = safeWorkspaceText(input.body, "");
  const note = normalizeNote({
    id,
    workspaceId,
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    title: safeWorkspaceText(input.title, `Research Note ${noteSeq}`),
    body: body || KNOWLEDGE_EMPTY.awaitingResearch,
    format: input.format ?? "markdown",
    pinned: false,
    favorite: false,
    autoSaved: true,
    versions: body
      ? [{ id: `ver-${id}-1`, body, savedAt: now }]
      : [],
    createdAt: now,
    updatedAt: now,
    empty: false,
  });
  notes.set(id, note);
  return note;
}

export function updateNote(
  id: string,
  patch: UpdateNoteInput
): ResearchNote {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const existing = notes.get(key);
  if (!existing || existing.empty) return emptyNote(KNOWLEDGE_EMPTY.noNotes);

  const now = stamp(patch.now);
  const nextBody =
    patch.body != null ? safeWorkspaceText(patch.body, existing.body) : existing.body;
  const versions = [...existing.versions];
  if (patch.body != null && nextBody !== existing.body) {
    versions.unshift({
      id: `ver-${key}-${versions.length + 1}`,
      body: existing.body,
      savedAt: now,
    });
    if (versions.length > 20) versions.length = 20;
  }

  const note = normalizeNote({
    ...existing,
    title: patch.title != null ? safeWorkspaceText(patch.title, existing.title) : existing.title,
    body: nextBody,
    format: patch.format ?? existing.format,
    pinned: patch.pinned != null ? Boolean(patch.pinned) : existing.pinned,
    favorite: patch.favorite != null ? Boolean(patch.favorite) : existing.favorite,
    autoSaved: patch.autoSave != null ? Boolean(patch.autoSave) : existing.autoSaved,
    versions,
    updatedAt: now,
    empty: false,
  });
  notes.set(key, note);
  return note;
}

export function deleteNote(id: string): boolean {
  const key = safeWorkspaceText(id, "").toLowerCase();
  if (!notes.has(key)) return false;
  notes.delete(key);
  return true;
}

export function getNote(id: string): ResearchNote | null {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const note = notes.get(key);
  if (!note || note.empty) return null;
  return note;
}

export function listNotes(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  pinnedOnly?: boolean;
  favoriteOnly?: boolean;
}): ResearchNote[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;

  return Array.from(notes.values())
    .filter((n) => {
      if (n.empty) return false;
      if (wid && n.workspaceId !== wid) return false;
      if (ticker && n.ticker !== ticker) return false;
      if (options?.pinnedOnly && !n.pinned) return false;
      if (options?.favoriteOnly && !n.favorite) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
}

export function pinNote(id: string, pinned = true): ResearchNote {
  return updateNote(id, { pinned });
}

export function favoriteNote(id: string, favorite = true): ResearchNote {
  return updateNote(id, { favorite });
}

export function resetNotes(): void {
  notes.clear();
  noteSeq = 0;
}

export class ResearchNotesEngine {
  createNote = createNote;
  updateNote = updateNote;
  deleteNote = deleteNote;
  listNotes = listNotes;
  reset = resetNotes;
}
