/**
 * Evidence Manager (Sprint 10A.R4).
 * Bull/bear/catalysts/risks and module-sourced evidence bags — no recalculation.
 */

import { safeWorkspaceText } from "../WorkspaceModels";
import {
  EVIDENCE_KINDS,
  KNOWLEDGE_EMPTY,
  emptyEvidence,
  emptyEvidenceByKind,
  normalizeEvidence,
  type EvidenceItem,
  type EvidenceKind,
  type EvidenceView,
} from "./KnowledgePresentationModels";

export interface AddEvidenceInput {
  workspaceId: string;
  ticker?: string | null;
  kind: EvidenceKind;
  label: string;
  summary: string;
  source?: string | null;
  confidence?: number | null;
  now?: Date | null;
}

const evidence = new Map<string, EvidenceItem>();
let evSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

export function addEvidence(input: AddEvidenceInput): EvidenceItem {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptyEvidence(KNOWLEDGE_EMPTY.awaitingResearch);

  evSeq += 1;
  const id = `ev-${evSeq}-${Date.now()}`;
  const item = normalizeEvidence({
    id,
    workspaceId,
    ticker: input.ticker ? safeWorkspaceText(input.ticker, "").toUpperCase() : null,
    kind: input.kind,
    label: safeWorkspaceText(input.label, "Evidence"),
    summary: safeWorkspaceText(input.summary, KNOWLEDGE_EMPTY.noEvidence),
    source: safeWorkspaceText(input.source, "workspace"),
    confidence: input.confidence ?? 0,
    createdAt: stamp(input.now),
    empty: false,
  });
  evidence.set(id, item);
  return item;
}

export function listEvidence(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  kind?: EvidenceKind | null;
}): EvidenceItem[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;

  return Array.from(evidence.values())
    .filter((e) => {
      if (e.empty) return false;
      if (wid && e.workspaceId !== wid) return false;
      if (ticker && e.ticker !== ticker) return false;
      if (options?.kind && e.kind !== options.kind) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getEvidence(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
}): EvidenceView {
  const items = listEvidence(options);
  if (items.length === 0) {
    return {
      items: [],
      byKind: emptyEvidenceByKind(),
      bull: [],
      bear: [],
      catalysts: [],
      risks: [],
      empty: true,
      emptyMessage: KNOWLEDGE_EMPTY.noEvidence,
    };
  }

  const byKind = Object.fromEntries(
    EVIDENCE_KINDS.map((k) => [k, items.filter((i) => i.kind === k)])
  ) as Record<EvidenceKind, EvidenceItem[]>;

  return {
    items,
    byKind,
    bull: byKind.bull,
    bear: byKind.bear,
    catalysts: byKind.catalyst,
    risks: byKind.risk,
    empty: false,
    emptyMessage: KNOWLEDGE_EMPTY.awaitingResearch,
  };
}

export function ingestEvidenceBag(input: {
  workspaceId: string;
  ticker?: string | null;
  bull?: string[] | null;
  bear?: string[] | null;
  catalysts?: string[] | null;
  risks?: string[] | null;
  management?: string[] | null;
  financial?: string[] | null;
  technical?: string[] | null;
  news?: string[] | null;
  confidence?: string[] | null;
}): EvidenceItem[] {
  const created: EvidenceItem[] = [];
  const wid = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;

  const push = (kind: EvidenceKind, lines?: string[] | null, source?: string) => {
    if (!Array.isArray(lines)) return;
    for (const line of lines) {
      const summary = safeWorkspaceText(line, "");
      if (!summary) continue;
      created.push(
        addEvidence({
          workspaceId: wid,
          ticker,
          kind,
          label: summary.slice(0, 80),
          summary,
          source: source ?? kind,
        })
      );
    }
  };

  push("bull", input.bull, "insights");
  push("bear", input.bear, "insights");
  push("catalyst", input.catalysts, "insights");
  push("risk", input.risks, "risk");
  push("management", input.management, "earnings");
  push("financial", input.financial, "financials");
  push("technical", input.technical, "technicals");
  push("news", input.news, "news");
  push("confidence", input.confidence, "validation");

  return created;
}

export function deleteEvidence(id: string): boolean {
  return evidence.delete(safeWorkspaceText(id, "").toLowerCase());
}

export function resetEvidence(): void {
  evidence.clear();
  evSeq = 0;
}

export class EvidenceManager {
  addEvidence = addEvidence;
  listEvidence = listEvidence;
  getEvidence = getEvidence;
  ingestEvidenceBag = ingestEvidenceBag;
  reset = resetEvidence;
}
