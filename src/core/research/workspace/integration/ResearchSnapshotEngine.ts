/**
 * Research snapshot engine (Sprint 10A.R5).
 * Capture, restore, compare institutional research state.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getKnowledge } from "../knowledge/KnowledgeBaseEngine";
import { recordTimelineEvent } from "./ResearchTimelineEngine";
import {
  INTEGRATION_EMPTY,
  emptySnapshot,
  emptySnapshotTimelineView,
  normalizeSnapshot,
  type ResearchSnapshot,
  type ResearchSnapshotPayload,
  type SnapshotComparison,
  type SnapshotTimelineView,
} from "./ResearchIntegrationModels";

export interface CreateSnapshotInput {
  workspaceId: string;
  label?: string | null;
  ticker?: string | null;
  payload?: Partial<ResearchSnapshotPayload> | null;
  now?: Date | null;
}

const snapshots = new Map<string, ResearchSnapshot>();
let snapSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function buildPayloadFromKnowledge(
  workspaceId: string,
  ticker?: string | null
): ResearchSnapshotPayload {
  const knowledge = getKnowledge({ workspaceId, ticker });
  const evidence = knowledge.evidence;
  return {
    ticker: ticker ? safeWorkspaceText(ticker, "").toUpperCase() : null,
    thesis:
      knowledge.notes[0]?.body ?? INTEGRATION_EMPTY.awaitingResearchActivity,
    bullCase: evidence.bull.map((e) => e.summary).slice(0, 8),
    bearCase: evidence.bear.map((e) => e.summary).slice(0, 8),
    risks: evidence.risks.map((e) => e.summary).slice(0, 8),
    catalysts: evidence.catalysts.map((e) => e.summary).slice(0, 8),
    confidence:
      evidence.byKind.confidence[0]?.confidence ??
      Math.min(100, evidence.items.length * 10),
    noteCount: knowledge.notes.length,
    evidenceCount: evidence.items.length,
  };
}

export function createSnapshot(input: CreateSnapshotInput): ResearchSnapshot {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptySnapshot(INTEGRATION_EMPTY.noSnapshots);

  snapSeq += 1;
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const payload =
    input.payload != null
      ? {
          ...buildPayloadFromKnowledge(workspaceId, ticker),
          ...input.payload,
          ticker: input.payload.ticker
            ? safeWorkspaceText(input.payload.ticker, "").toUpperCase()
            : ticker,
        }
      : buildPayloadFromKnowledge(workspaceId, ticker);

  const snap = normalizeSnapshot({
    id: `snap-${snapSeq}-${Date.now()}`,
    workspaceId,
    label: safeWorkspaceText(input.label, `Snapshot ${snapSeq}`),
    payload,
    createdAt: stamp(input.now),
    empty: false,
  });
  snapshots.set(snap.id, snap);

  recordTimelineEvent({
    workspaceId,
    ticker,
    kind: "research_created",
    module: "research",
    label: `Snapshot captured · ${snap.label}`,
    detail: `${payload.noteCount} notes · ${payload.evidenceCount} evidence`,
    now: input.now,
  });

  return snap;
}

export function restoreSnapshot(id: string): ResearchSnapshot {
  const key = safeWorkspaceText(id, "").toLowerCase();
  const snap = snapshots.get(key);
  if (!snap || snap.empty) return emptySnapshot(INTEGRATION_EMPTY.noSnapshots);
  return snap;
}

export function listSnapshots(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): ResearchSnapshot[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;

  return Array.from(snapshots.values())
    .filter((s) => {
      if (s.empty) return false;
      if (wid && s.workspaceId !== wid) return false;
      if (ticker && s.payload.ticker !== ticker) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSnapshotTimeline(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): SnapshotTimelineView {
  try {
    const items = listSnapshots(options);
    if (items.length === 0) {
      return emptySnapshotTimelineView(INTEGRATION_EMPTY.noSnapshots);
    }
    return {
      snapshots: items,
      empty: false,
      emptyMessage: INTEGRATION_EMPTY.awaitingResearchActivity,
    };
  } catch {
    return emptySnapshotTimelineView(INTEGRATION_EMPTY.noSnapshots);
  }
}

function diffLines(left: string[], right: string[]): {
  added: string[];
  removed: string[];
} {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  return {
    added: right.filter((v) => !leftSet.has(v)),
    removed: left.filter((v) => !rightSet.has(v)),
  };
}

export function compareSnapshots(
  leftId: string,
  rightId: string
): SnapshotComparison {
  const left = restoreSnapshot(leftId);
  const right = restoreSnapshot(rightId);
  if (left.empty || right.empty) {
    return {
      leftId,
      rightId,
      thesisChanged: false,
      bullAdded: [],
      bullRemoved: [],
      bearAdded: [],
      bearRemoved: [],
      riskAdded: [],
      riskRemoved: [],
      confidenceDelta: 0,
      summary: INTEGRATION_EMPTY.noSnapshots,
      empty: true,
      emptyMessage: INTEGRATION_EMPTY.noSnapshots,
    };
  }

  const bull = diffLines(left.payload.bullCase, right.payload.bullCase);
  const bear = diffLines(left.payload.bearCase, right.payload.bearCase);
  const risks = diffLines(left.payload.risks, right.payload.risks);
  const thesisChanged = left.payload.thesis !== right.payload.thesis;
  const confidenceDelta = right.payload.confidence - left.payload.confidence;

  const parts: string[] = [];
  if (thesisChanged) parts.push("Thesis updated");
  if (bull.added.length) parts.push(`${bull.added.length} new bull factor(s)`);
  if (bear.added.length) parts.push(`${bear.added.length} new bear factor(s)`);
  if (risks.added.length) parts.push(`${risks.added.length} new risk(s)`);
  if (confidenceDelta !== 0) {
    parts.push(
      `Confidence ${confidenceDelta > 0 ? "up" : "down"} ${Math.abs(confidenceDelta)}`
    );
  }

  return {
    leftId: left.id,
    rightId: right.id,
    thesisChanged,
    bullAdded: bull.added,
    bullRemoved: bull.removed,
    bearAdded: bear.added,
    bearRemoved: bear.removed,
    riskAdded: risks.added,
    riskRemoved: risks.removed,
    confidenceDelta,
    summary: parts.length ? parts.join(" · ") : "No material changes",
    empty: false,
    emptyMessage: INTEGRATION_EMPTY.awaitingResearchActivity,
  };
}

export function resetResearchSnapshots(): void {
  snapshots.clear();
  snapSeq = 0;
}

export class ResearchSnapshotEngine {
  createSnapshot = createSnapshot;
  restoreSnapshot = restoreSnapshot;
  compareSnapshots = compareSnapshots;
  getSnapshotTimeline = getSnapshotTimeline;
  reset = resetResearchSnapshots;
}
