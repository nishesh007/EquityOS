/**
 * Research Annotation engine (Sprint 10A.R4).
 * Highlights for metrics, charts, AI insights, earnings, alerts, screener.
 */

import { resolvePanelRoute, safeWorkspaceText } from "../WorkspaceModels";
import {
  KNOWLEDGE_EMPTY,
  emptyAnnotation,
  normalizeAnnotation,
  type AnnotationTarget,
  type ResearchAnnotation,
} from "./KnowledgePresentationModels";

export interface CreateAnnotationInput {
  workspaceId: string;
  ticker?: string | null;
  target: AnnotationTarget;
  label: string;
  excerpt: string;
  route?: string | null;
  now?: Date | null;
}

const annotations = new Map<string, ResearchAnnotation>();
let annSeq = 0;

function stamp(now?: Date | null): string {
  return (now ?? new Date()).toISOString();
}

function defaultRoute(target: AnnotationTarget, ticker?: string | null): string {
  const symbol = ticker ? safeWorkspaceText(ticker, "").toUpperCase() : null;
  switch (target) {
    case "metric":
    case "chart":
      return symbol ? resolvePanelRoute("company", symbol) : "/research";
    case "ai_insight":
      return symbol
        ? `/ai/research?ticker=${encodeURIComponent(symbol)}`
        : "/ai/research";
    case "earnings":
      return symbol
        ? `/results?earnings=1&ticker=${encodeURIComponent(symbol)}`
        : "/results?earnings=1";
    case "alert":
      return symbol
        ? `/results?alerts=1&ticker=${encodeURIComponent(symbol)}`
        : "/results?alerts=1";
    case "screener":
      return symbol
        ? `/screener?ticker=${encodeURIComponent(symbol)}`
        : "/screener";
    default:
      return "/research";
  }
}

export function createAnnotation(input: CreateAnnotationInput): ResearchAnnotation {
  const workspaceId = safeWorkspaceText(input.workspaceId, "").toLowerCase();
  if (!workspaceId) return emptyAnnotation(KNOWLEDGE_EMPTY.awaitingResearch);

  annSeq += 1;
  const ticker = input.ticker
    ? safeWorkspaceText(input.ticker, "").toUpperCase()
    : null;
  const id = `ann-${annSeq}-${Date.now()}`;
  const ann = normalizeAnnotation({
    id,
    workspaceId,
    ticker,
    target: input.target,
    label: safeWorkspaceText(input.label, "Annotation"),
    excerpt: safeWorkspaceText(input.excerpt, KNOWLEDGE_EMPTY.awaitingResearch),
    route: safeWorkspaceText(
      input.route,
      defaultRoute(input.target, ticker)
    ),
    createdAt: stamp(input.now),
    empty: false,
  });
  annotations.set(id, ann);
  return ann;
}

export function listAnnotations(options?: {
  workspaceId?: string | null;
  ticker?: string | null;
  target?: AnnotationTarget | null;
}): ResearchAnnotation[] {
  const wid = options?.workspaceId
    ? safeWorkspaceText(options.workspaceId, "").toLowerCase()
    : null;
  const ticker = options?.ticker
    ? safeWorkspaceText(options.ticker, "").toUpperCase()
    : null;

  return Array.from(annotations.values())
    .filter((a) => {
      if (a.empty) return false;
      if (wid && a.workspaceId !== wid) return false;
      if (ticker && a.ticker !== ticker) return false;
      if (options?.target && a.target !== options.target) return false;
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function deleteAnnotation(id: string): boolean {
  const key = safeWorkspaceText(id, "").toLowerCase();
  return annotations.delete(key);
}

export function resetAnnotations(): void {
  annotations.clear();
  annSeq = 0;
}

/** Convenience highlight helpers — compose existing routes only. */
export function highlightMetric(
  workspaceId: string,
  ticker: string,
  label: string,
  excerpt: string
): ResearchAnnotation {
  return createAnnotation({
    workspaceId,
    ticker,
    target: "metric",
    label,
    excerpt,
  });
}

export function highlightAiInsight(
  workspaceId: string,
  ticker: string,
  excerpt: string
): ResearchAnnotation {
  return createAnnotation({
    workspaceId,
    ticker,
    target: "ai_insight",
    label: `AI Insight · ${ticker}`,
    excerpt,
  });
}

export class ResearchAnnotationEngine {
  createAnnotation = createAnnotation;
  listAnnotations = listAnnotations;
  reset = resetAnnotations;
}
