/**
 * Decision journal engine (Sprint 10A.R5).
 * Thesis, bull/bear, risk/confidence changes, actions, outcomes.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { recordTimelineEvent } from "./ResearchTimelineEngine";
import {
  DECISION_KINDS,
  INTEGRATION_EMPTY,
  emptyDecisionEntry,
  emptyDecisionView,
  normalizeDecisionEntry,
  type DecisionJournalEntry,
  type DecisionJournalView,
  type DecisionKind,
} from "./ResearchIntegrationModels";

export interface RecordDecisionInput {
  workspaceId: string;
  ticker?: string | null;
  kind?: DecisionKind | null;
  title?: string | null;
  body?: string | null;
  reason?: string | null;
  outcome?: string | null;
  confidence?: number | null;
  now?: Date | null;
}

const journal: DecisionJournalEntry[] = [];
let journalSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function defaultTitle(kind: DecisionKind, ticker?: string | null): string {
  const sym = ticker ? safeWorkspaceText(ticker, "").toUpperCase() : "Workspace";
  const labels: Record<DecisionKind, string> = {
    initial_thesis: `Initial thesis · ${sym}`,
    updated_thesis: `Updated thesis · ${sym}`,
    bull_case: `Bull case · ${sym}`,
    bear_case: `Bear case · ${sym}`,
    risk_change: `Risk change · ${sym}`,
    confidence_change: `Confidence change · ${sym}`,
    action_taken: `Action taken · ${sym}`,
    reason: `Decision reason · ${sym}`,
    outcome: `Outcome · ${sym}`,
  };
  return labels[kind];
}

export function recordDecision(input: RecordDecisionInput): DecisionJournalEntry {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptyDecisionEntry(INTEGRATION_EMPTY.awaitingResearchActivity);

  const kind = DECISION_KINDS.includes(input.kind as DecisionKind)
    ? (input.kind as DecisionKind)
    : "initial_thesis";
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const now = stamp(input.now);
  journalSeq += 1;

  const entry = normalizeDecisionEntry({
    id: `dj-${journalSeq}-${Date.now()}`,
    workspaceId,
    ticker,
    kind,
    title: safeWorkspaceText(input.title, defaultTitle(kind, ticker)),
    body: safeWorkspaceText(input.body, INTEGRATION_EMPTY.awaitingResearchActivity),
    reason: safeWorkspaceText(input.reason, ""),
    outcome: safeWorkspaceText(input.outcome, ""),
    confidence: input.confidence ?? 0,
    createdAt: now,
    updatedAt: now,
    empty: false,
  });
  journal.unshift(entry);
  if (journal.length > 120) journal.length = 120;

  recordTimelineEvent({
    workspaceId,
    ticker,
    kind: "decision_recorded",
    module: "research",
    label: entry.title,
    detail: entry.body,
    now: input.now,
  });

  return entry;
}

export function listDecisions(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  kind?: DecisionKind | null;
}): DecisionJournalEntry[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;

  return journal.filter((e) => {
    if (e.empty) return false;
    if (wid && e.workspaceId !== wid) return false;
    if (ticker && e.ticker !== ticker) return false;
    if (options?.kind && e.kind !== options.kind) return false;
    return true;
  });
}

export function getDecisionJournal(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): DecisionJournalView {
  try {
    const entries = listDecisions(options);
    if (entries.length === 0) {
      return emptyDecisionView(INTEGRATION_EMPTY.noDecisions);
    }
    return {
      entries,
      empty: false,
      emptyMessage: INTEGRATION_EMPTY.awaitingResearchActivity,
    };
  } catch {
    return emptyDecisionView(INTEGRATION_EMPTY.noDecisions);
  }
}

export function resetDecisionJournal(): void {
  journal.length = 0;
  journalSeq = 0;
}

export class DecisionJournalEngine {
  recordDecision = recordDecision;
  getDecisionJournal = getDecisionJournal;
  reset = resetDecisionJournal;
}
