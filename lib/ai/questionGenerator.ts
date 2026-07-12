/**
 * Intelligent question generator — context-aware research and follow-up questions.
 */

import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { ResearchMemoryEntry } from "@/lib/ai/researchMemory";
import { getRecentResearch, getResearchedSymbols } from "@/lib/ai/researchMemory";

export interface GeneratedQuestion {
  id: string;
  text: string;
  category: "valuation" | "growth" | "risk" | "technical" | "peer" | "earnings" | "general";
}

function createQuestion(
  text: string,
  category: GeneratedQuestion["category"],
  index: number
): GeneratedQuestion {
  return {
    id: `q-${category}-${index}`,
    text,
    category,
  };
}

function uniqueQuestions(questions: GeneratedQuestion[], limit: number): GeneratedQuestion[] {
  const seen = new Set<string>();
  const result: GeneratedQuestion[] = [];

  for (const question of questions) {
    const key = question.text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(question);
    if (result.length >= limit) break;
  }

  return result;
}

export function buildContextQuestions(
  context: CompanyContext | null,
  symbol: string | null
): GeneratedQuestion[] {
  if (!context && !symbol) return [];

  const name = context?.profile.name ?? symbol ?? "this company";
  const sym = context?.profile.symbol ?? symbol ?? "";
  const fi = context?.financialIntelligence;
  const questions: GeneratedQuestion[] = [];

  questions.push(
    createQuestion(`What is the institutional fair value thesis for ${name}?`, "valuation", 0),
    createQuestion(`What are the top risks investors should monitor for ${sym}?`, "risk", 1),
    createQuestion(`How sustainable is ${name}'s earnings growth trajectory?`, "growth", 2)
  );

  if (fi) {
    if (fi.cagr.revenue.cagr5Y != null) {
      questions.push(
        createQuestion(
          `Is ${sym}'s 5-year revenue CAGR of ${fi.cagr.revenue.cagr5Y.toFixed(1)}% durable?`,
          "growth",
          3
        )
      );
    }
    if (fi.scores.riskScore >= 55) {
      questions.push(
        createQuestion(
          `Why does ${sym} carry an elevated financial risk score of ${fi.scores.riskScore}/100?`,
          "risk",
          4
        )
      );
    }
    if (fi.ratios.pe != null) {
      questions.push(
        createQuestion(
          `Is ${sym} fairly valued at ${fi.ratios.pe.toFixed(1)}x P/E vs peers?`,
          "valuation",
          5
        )
      );
    }
  }

  if (context?.technicalIndicators) {
    questions.push(
      createQuestion(
        `What does the ${context.technicalIndicators.summary} technical setup imply for ${sym}?`,
        "technical",
        6
      )
    );
  }

  if (context?.latestResults) {
    questions.push(
      createQuestion(
        `How should investors interpret ${context.latestResults.quarter} results for ${sym}?`,
        "earnings",
        7
      )
    );
  }

  if (context && context.peerComparison.length > 0) {
    const peer = context.peerComparison[0];
    questions.push(
      createQuestion(
        `How does ${sym} compare with ${peer.symbol} on ROE and growth?`,
        "peer",
        8
      )
    );
  }

  return uniqueQuestions(questions, 8);
}

export function buildFollowUpQuestions(input: {
  prompt: string;
  answer: string;
  symbol: string | null;
  context: CompanyContext | null;
}): GeneratedQuestion[] {
  const { prompt, answer, symbol, context } = input;
  const name = context?.profile.name ?? symbol ?? "this company";
  const sym = context?.profile.symbol ?? symbol ?? "";
  const lowerPrompt = prompt.toLowerCase();
  const lowerAnswer = answer.toLowerCase();
  const questions: GeneratedQuestion[] = [];

  if (lowerAnswer.includes("undervalued") || lowerAnswer.includes("overvalued")) {
    questions.push(
      createQuestion(`What margin of safety exists in ${sym} at current prices?`, "valuation", 0)
    );
  }

  if (lowerAnswer.includes("risk") || lowerAnswer.includes("red flag")) {
    questions.push(
      createQuestion(`Which red flags matter most for ${name} over the next 12 months?`, "risk", 1)
    );
  }

  if (lowerAnswer.includes("growth") || lowerAnswer.includes("cagr")) {
    questions.push(
      createQuestion(`What could accelerate or derail ${sym}'s growth outlook?`, "growth", 2)
    );
  }

  if (lowerAnswer.includes("technical") || lowerAnswer.includes("momentum")) {
    questions.push(
      createQuestion(`What technical levels should traders watch on ${sym}?`, "technical", 3)
    );
  }

  if (lowerAnswer.includes("earnings") || lowerAnswer.includes("quarter")) {
    questions.push(
      createQuestion(`What should we expect in the next earnings print for ${sym}?`, "earnings", 4)
    );
  }

  if (lowerPrompt.includes("buy") || lowerPrompt.includes("sell")) {
    questions.push(
      createQuestion(`What position sizing framework fits ${sym} today?`, "general", 5)
    );
  }

  if (context?.peerComparison.length) {
    const peer = context.peerComparison.find((p) => !p.isCompany) ?? context.peerComparison[0];
    questions.push(
      createQuestion(`Should investors prefer ${sym} or ${peer.symbol} in this sector?`, "peer", 6)
    );
  }

  questions.push(
    createQuestion(`What catalysts could re-rate ${name} over the next 6–12 months?`, "general", 7),
    createQuestion(`What would invalidate the current thesis on ${sym}?`, "risk", 8),
    createQuestion(`Summarize the bull vs bear case for ${name} in one view.`, "general", 9)
  );

  const contextQuestions = buildContextQuestions(context, symbol);
  return uniqueQuestions([...questions, ...contextQuestions], 5);
}

export function buildAdaptiveSuggestions(input?: {
  symbol?: string | null;
  pageContext?: string | null;
  history?: ResearchMemoryEntry[];
}): string[] {
  const history = input?.history ?? getRecentResearch(12);
  const symbols = getResearchedSymbols(6);
  const suggestions: string[] = [];

  if (input?.symbol) {
    suggestions.push(`Analyse ${input.symbol}`);
    suggestions.push(`What are the key risks for ${input.symbol}?`);
    suggestions.push(`Is ${input.symbol} undervalued right now?`);
  }

  for (const entry of history.slice(0, 3)) {
    if (entry.symbol && !suggestions.some((s) => s.includes(entry.symbol!))) {
      suggestions.push(`Continue research on ${entry.symbol}`);
    }
  }

  for (const sym of symbols.slice(0, 2)) {
    if (!input?.symbol || sym !== input.symbol) {
      suggestions.push(`Compare ${input?.symbol ?? sym} vs ${sym}`);
    }
  }

  if (input?.pageContext === "company") {
    suggestions.push(`Explain the latest earnings trend`);
    suggestions.push(`What is the moat assessment?`);
  }

  if (input?.pageContext === "screener") {
    suggestions.push(`Which screened names have the best risk/reward?`);
  }

  if (input?.pageContext === "portfolio") {
    suggestions.push(`Which portfolio holdings need attention?`);
  }

  const defaults = [
    "Compare TCS vs INFY",
    "Best defence stocks in India",
    "Analyse Tata Motors",
    "Top banking stocks by ROE",
  ];

  for (const item of defaults) {
    suggestions.push(item);
  }

  const seen = new Set<string>();
  return suggestions.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}
