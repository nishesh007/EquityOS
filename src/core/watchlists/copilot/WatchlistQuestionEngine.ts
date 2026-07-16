/**
 * Watchlist Question Engine — natural language Q&A (Sprint 10B.R6).
 * Template answers from R3/R5 + Sprint 9E explainability compose.
 */

import { buildCopilotExplainability } from "@/src/core/research/workspace/copilot/ResearchCopilotEngine";
import { getWatchlistRecommendations, getWatchlistSummary } from "../intelligence";
import type { WatchlistIntelligenceContext } from "../intelligence";
import { getAIReview } from "../analytics";
import type { WatchlistAnalyticsContext } from "../analytics";
import {
  WATCHLIST_COPILOT_EMPTY,
  safeCopilotNumber,
  safeCopilotText,
  type CopilotAnswer,
  type CopilotQuestionKind,
  type WatchlistCopilotContext,
} from "./WatchlistCopilotModels";

function detectKind(question: string): CopilotQuestionKind | "custom" {
  const q = question.toLowerCase();
  if (q.includes("why") && q.includes("here")) return "why_here";
  if (q.includes("added")) return "why_added";
  if (q.includes("removed") || q.includes("remove")) return "why_removed";
  if (q.includes("conviction") && (q.includes("fall") || q.includes("drop"))) {
    return "why_conviction_falling";
  }
  if (q.includes("recommend") || q.includes("ai")) return "why_ai_recommending";
  return "custom";
}

function extractTicker(
  question: string,
  context?: WatchlistCopilotContext | null
): string {
  const explicit = safeCopilotText(context?.ticker, "").toUpperCase();
  if (explicit) return explicit;
  const symbols = (context?.symbols ?? []).map((s) => s.toUpperCase());
  for (const sym of symbols) {
    if (question.toUpperCase().includes(sym)) return sym;
  }
  return symbols[0] ?? "";
}

export function askWatchlist(
  context?: WatchlistCopilotContext | null
): CopilotAnswer {
  const question = safeCopilotText(context?.question, "");
  if (!question) {
    return {
      question: "",
      answer: WATCHLIST_COPILOT_EMPTY.noQuestions,
      kind: "custom",
      ticker: "",
      empty: true,
    };
  }

  const ticker = extractTicker(question, context);
  const kind = detectKind(question);
  const snapshots = context?.snapshots ?? {};
  const prior = context?.priorSnapshots ?? {};
  const snap = ticker ? snapshots[ticker] : undefined;
  const prev = ticker ? prior[ticker] : undefined;

  if (!snap && kind !== "custom") {
    return {
      question,
      answer: WATCHLIST_COPILOT_EMPTY.awaitingAiSummary,
      kind,
      ticker,
      empty: true,
    };
  }

  let answer = "";

  switch (kind) {
    case "why_here":
      answer = `${ticker} is on the watchlist with conviction ${safeCopilotNumber(snap?.convictionScore)} and trust ${safeCopilotNumber(snap?.trustScore)} — tracked for institutional review.`;
      break;
    case "why_added":
      answer = `${ticker} was added to capture ${snap?.category ?? "thesis"} exposure with ${safeCopilotNumber(snap?.changePercent)}% recent move.`;
      break;
    case "why_removed":
      answer = `${ticker} removal would be considered if conviction falls below threshold or trust deteriorates — current trust ${safeCopilotNumber(snap?.trustScore)}.`;
      break;
    case "why_conviction_falling": {
      const cur = safeCopilotNumber(snap?.convictionScore);
      const old = prev ? safeCopilotNumber(prev.convictionScore, cur) : cur;
      const delta = cur - old;
      answer = `${ticker} conviction moved ${delta >= 0 ? "+" : ""}${delta} to ${cur} — ${delta < 0 ? "monitor for thesis drift" : "conviction stable or improving"}.`;
      break;
    }
    case "why_ai_recommending": {
      const recs = getWatchlistRecommendations(context as WatchlistIntelligenceContext);
      const rec = recs.items.find((r) => r.ticker === ticker);
      const review = getAIReview(context as WatchlistAnalyticsContext);
      answer = rec
        ? `AI recommends ${rec.action} on ${ticker}: ${rec.reason}`
        : review.suggestedImprovements[0] ??
          `${ticker} aligns with current watchlist screening criteria.`;
      break;
    }
    default: {
      const summary = getWatchlistSummary(context as WatchlistIntelligenceContext);
      const explain = buildCopilotExplainability({
        workspaceId: context?.workspaceId,
        ticker,
        explainability: context?.explainability as never,
      });
      answer =
        explain.factorContributions[0] ||
        explain.decisionTrace[0] ||
        summary.narrative ||
        WATCHLIST_COPILOT_EMPTY.awaitingAiSummary;
    }
  }

  return {
    question,
    answer: safeCopilotText(answer, WATCHLIST_COPILOT_EMPTY.awaitingAiSummary),
    kind,
    ticker,
    empty: false,
  };
}

export class WatchlistQuestionEngine {
  askWatchlist = askWatchlist;
}
