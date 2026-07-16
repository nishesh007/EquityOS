/**
 * Unified research timeline engine (Sprint 10A.R5).
 * Composes workspace events + R4 memory — no duplicated module calculations.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import { getMemoryTimeline } from "../knowledge/ResearchMemoryEngine";
import {
  INTEGRATION_EMPTY,
  emptyTimelineView,
  normalizeTimelineEntry,
  type ResearchTimelineEntry,
  type ResearchTimelineView,
  type TimelineEventKind,
} from "./ResearchIntegrationModels";

const timeline: ResearchTimelineEntry[] = [];
const MAX_ENTRIES = 200;
let seq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function moduleRoute(module: ResearchTimelineEntry["module"], ticker?: string | null): string {
  switch (module) {
    case "earnings":
      return "/results";
    case "alerts":
      return "/alerts";
    case "screener":
      return "/ai/screener";
    case "portfolio":
      return "/portfolio";
    case "watchlist":
      return "/watchlist";
    case "opportunity":
      return "/opportunities";
    case "validation":
      return "/validation";
    case "trust":
      return "/validation";
    case "research":
      return ticker ? `/company/${ticker}` : "/research";
    default:
      return "/research";
  }
}

function memoryKindToTimeline(kind: string): TimelineEventKind {
  switch (kind) {
    case "decision":
      return "decision_recorded";
    case "conclusion":
      return "conclusion_recorded";
    case "observation":
      return "observation_recorded";
    case "note":
      return "note_saved";
    default:
      return "research_created";
  }
}

export function recordTimelineEvent(input: {
  workspaceId?: string | null;
  ticker?: string | null;
  kind: TimelineEventKind;
  module?: ResearchTimelineEntry["module"];
  label: string;
  detail?: string | null;
  route?: string | null;
  now?: Date | null;
}): ResearchTimelineEntry {
  seq += 1;
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const module = input.module ?? "research";
  const entry = normalizeTimelineEntry({
    id: `tl-${seq}-${Date.now()}`,
    workspaceId: input.workspaceId
      ? safeWorkspaceText(input.workspaceId, "").toLowerCase()
      : null,
    ticker,
    kind: input.kind,
    module,
    label: input.label,
    detail: input.detail ?? input.label,
    route: input.route ?? moduleRoute(module, ticker),
    at: stamp(input.now),
    empty: false,
  });
  timeline.unshift(entry);
  if (timeline.length > MAX_ENTRIES) timeline.length = MAX_ENTRIES;
  return entry;
}

function mapMemoryEntries(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): ResearchTimelineEntry[] {
  const memory = getMemoryTimeline({
    ticker: options?.ticker ?? undefined,
  });
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;

  return memory.map((m) =>
    normalizeTimelineEntry({
      id: `mem-tl-${m.id}`,
      workspaceId: wid,
      ticker: m.ticker,
      kind: memoryKindToTimeline(m.kind),
      module: "research",
      label: m.label,
      detail: m.detail,
      route: m.ticker ? `/company/${m.ticker}` : "/research",
      at: m.at,
      empty: false,
    })
  );
}

export function listTimelineEvents(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  limit?: number;
}): ResearchTimelineEntry[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;
  const limit = Math.max(1, options?.limit ?? 60);

  const local = timeline.filter((e) => {
    if (e.empty) return false;
    if (wid && e.workspaceId && e.workspaceId !== wid) return false;
    if (ticker && e.ticker && e.ticker !== ticker) return false;
    return true;
  });

  const merged = [...local, ...mapMemoryEntries({ workspaceId: wid, ticker })].sort(
    (a, b) => b.at.localeCompare(a.at)
  );

  const seen = new Set<string>();
  const deduped: ResearchTimelineEntry[] = [];
  for (const entry of merged) {
    const key = `${entry.kind}:${entry.label}:${entry.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(entry);
    if (deduped.length >= limit) break;
  }
  return deduped;
}

export function getResearchTimeline(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  limit?: number;
}): ResearchTimelineView {
  try {
    const entries = listTimelineEvents(options);
    if (entries.length === 0) {
      return emptyTimelineView(INTEGRATION_EMPTY.noTimeline);
    }
    return {
      entries,
      empty: false,
      emptyMessage: INTEGRATION_EMPTY.awaitingResearchActivity,
    };
  } catch {
    return emptyTimelineView(INTEGRATION_EMPTY.noTimeline);
  }
}

export function resetResearchTimeline(): void {
  timeline.length = 0;
  seq = 0;
}

export class ResearchTimelineEngine {
  recordTimelineEvent = recordTimelineEvent;
  getResearchTimeline = getResearchTimeline;
  reset = resetResearchTimeline;
}
