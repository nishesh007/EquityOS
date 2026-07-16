/**
 * Research Memory engine (Sprint 10A.R4).
 * Previous conclusions, decisions, AI observations, timeline.
 * Composition layer — does not rebuild lib/ai/researchMemory calculations.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import {
  KNOWLEDGE_EMPTY,
  type MemoryTimelineEntry,
} from "./KnowledgePresentationModels";

const timeline: MemoryTimelineEntry[] = [];
const MAX_ENTRIES = 100;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function pushEntry(input: {
  ticker?: string | null;
  kind: MemoryTimelineEntry["kind"];
  label: string;
  detail: string;
  now?: Date | null;
}): MemoryTimelineEntry {
  const entry: MemoryTimelineEntry = {
    id: `mem-${Date.now()}-${timeline.length}`,
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    kind: input.kind,
    label: safeWorkspaceText(input.label, KNOWLEDGE_EMPTY.awaitingResearch),
    detail: safeWorkspaceText(input.detail, KNOWLEDGE_EMPTY.awaitingResearch),
    at: stamp(input.now),
    empty: false,
    emptyMessage: KNOWLEDGE_EMPTY.awaitingResearch,
  };
  timeline.unshift(entry);
  if (timeline.length > MAX_ENTRIES) timeline.length = MAX_ENTRIES;
  return entry;
}

export function recordConclusion(
  ticker: string,
  conclusion: string,
  now?: Date | null
): MemoryTimelineEntry {
  return pushEntry({
    ticker,
    kind: "conclusion",
    label: `Conclusion · ${safeWorkspaceText(ticker, "").toUpperCase()}`,
    detail: conclusion,
    now,
  });
}

export function recordDecision(
  ticker: string,
  decision: string,
  now?: Date | null
): MemoryTimelineEntry {
  return pushEntry({
    ticker,
    kind: "decision",
    label: `Decision · ${safeWorkspaceText(ticker, "").toUpperCase()}`,
    detail: decision,
    now,
  });
}

export function recordObservation(
  ticker: string | null,
  observation: string,
  now?: Date | null
): MemoryTimelineEntry {
  return pushEntry({
    ticker,
    kind: "observation",
    label: "AI Observation",
    detail: observation,
    now,
  });
}

export function recordNoteMemory(
  ticker: string | null,
  noteTitle: string,
  now?: Date | null
): MemoryTimelineEntry {
  return pushEntry({
    ticker,
    kind: "note",
    label: safeWorkspaceText(noteTitle, "Note"),
    detail: "Note saved to research memory",
    now,
  });
}

export function getResearchTimeline(options?: {
  ticker?: string | null;
  limit?: number;
}): MemoryTimelineEntry[] {
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;
  const limit = Math.max(1, options?.limit ?? 40);

  return timeline
    .filter((e) => !e.empty && (!ticker || e.ticker === ticker))
    .slice(0, limit);
}

export function getPreviousConclusions(ticker: string): MemoryTimelineEntry[] {
  return getResearchTimeline({ ticker }).filter((e) => e.kind === "conclusion");
}

export function getHistoricalDecisions(ticker: string): MemoryTimelineEntry[] {
  return getResearchTimeline({ ticker }).filter((e) => e.kind === "decision");
}

export function getAiObservations(ticker?: string | null): MemoryTimelineEntry[] {
  return getResearchTimeline({ ticker: ticker ?? undefined }).filter(
    (e) => e.kind === "observation"
  );
}

export function resetResearchMemory(): void {
  timeline.length = 0;
}

export class ResearchMemoryEngine {
  recordConclusion = recordConclusion;
  recordDecision = recordDecision;
  getResearchTimeline = getResearchTimeline;
  reset = resetResearchMemory;
}
