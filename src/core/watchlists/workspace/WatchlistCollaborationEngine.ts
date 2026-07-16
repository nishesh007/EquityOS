/**
 * Watchlist Collaboration Engine (Sprint 10B.R4).
 */

import { getWatchlistRecord } from "../WatchlistRegistry";
import {
  WORKSPACE_EMPTY,
  safeWorkspaceText,
  type WatchlistCollaborationView,
  type WatchlistCollaborator,
  type WatchlistComment,
} from "./WatchlistWorkspaceModels";
import { recordTimelineEvent } from "./WatchlistActivityTimeline";

const shares = new Map<string, WatchlistCollaborator[]>();
const comments = new Map<string, WatchlistComment[]>();
const activityLogs = new Map<string, string[]>();
let commentSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function shareWatchlist(input: {
  watchlistId: string;
  collaborators: Array<{ name: string; role?: "owner" | "editor" | "viewer" }>;
  readOnly?: boolean;
  now?: Date | null;
}): WatchlistCollaborationView {
  const id = safeWorkspaceText(input.watchlistId, "").toLowerCase();
  const record = getWatchlistRecord(id);
  if (!record) {
    return {
      shared: false,
      collaborators: [],
      comments: [],
      activityLog: [],
      readOnly: false,
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noSharedUsers,
    };
  }

  const collaborators: WatchlistCollaborator[] = input.collaborators.map((c, i) => ({
    id: `collab-${i + 1}`,
    name: safeWorkspaceText(c.name, `User ${i + 1}`),
    role: c.role ?? "viewer",
    readOnly: input.readOnly ?? c.role === "viewer",
  }));

  shares.set(id, collaborators);
  const log = activityLogs.get(id) ?? [];
  log.unshift(`Shared with ${collaborators.length} users at ${stamp(input.now)}`);
  activityLogs.set(id, log.slice(0, 50));

  recordTimelineEvent({
    watchlistId: id,
    kind: "added",
    summary: `Watchlist shared with ${collaborators.length} collaborators`,
    actor: "owner",
    now: input.now,
  });

  return getCollaborationView(id);
}

export function addWatchlistComment(input: {
  watchlistId: string;
  author: string;
  body: string;
  mentions?: string[];
  now?: Date | null;
}): WatchlistComment {
  const id = safeWorkspaceText(input.watchlistId, "").toLowerCase();
  commentSeq += 1;
  const comment: WatchlistComment = {
    id: `cmt-${commentSeq}`,
    watchlistId: id,
    author: safeWorkspaceText(input.author, "analyst"),
    body: safeWorkspaceText(input.body, ""),
    mentions: (input.mentions ?? []).map((m) => m.toUpperCase()),
    at: stamp(input.now),
  };
  const list = comments.get(id) ?? [];
  list.unshift(comment);
  comments.set(id, list);

  const log = activityLogs.get(id) ?? [];
  log.unshift(`Comment by ${comment.author}`);
  activityLogs.set(id, log.slice(0, 50));

  return comment;
}

export function getCollaborationView(
  watchlistId: string
): WatchlistCollaborationView {
  const id = safeWorkspaceText(watchlistId, "").toLowerCase();
  const collaborators = shares.get(id) ?? [];
  const watchComments = comments.get(id) ?? [];
  const log = activityLogs.get(id) ?? [];

  if (collaborators.length === 0) {
    return {
      shared: false,
      collaborators: [],
      comments: watchComments,
      activityLog: log,
      readOnly: false,
      empty: true,
      emptyMessage: WORKSPACE_EMPTY.noSharedUsers,
    };
  }

  const readOnly = collaborators.every((c) => c.readOnly || c.role === "viewer");

  return {
    shared: true,
    collaborators,
    comments: watchComments,
    activityLog: log,
    readOnly,
    empty: false,
    emptyMessage: WORKSPACE_EMPTY.noSharedUsers,
  };
}

export function resetWatchlistCollaboration(): void {
  shares.clear();
  comments.clear();
  activityLogs.clear();
  commentSeq = 0;
}

export class WatchlistCollaborationEngine {
  shareWatchlist = shareWatchlist;
  addWatchlistComment = addWatchlistComment;
  getCollaborationView = getCollaborationView;
  reset = resetWatchlistCollaboration;
}
