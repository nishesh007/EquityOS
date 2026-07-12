/**
 * Decision catalyst engine — upcoming catalysts from opportunities, filings, and earnings.
 */

import type { CompanyContext } from "@/lib/ai/context/companyContext";
import type { RetrievedChunk } from "@/lib/rag/retriever";
import type { EquityIntelligence, Opportunity } from "@/types";

export interface DecisionCatalyst {
  title: string;
  description: string;
  source: string;
  timing?: string;
}

function catalystsFromOpportunities(opportunities: Opportunity[]): DecisionCatalyst[] {
  return opportunities.map((item) => ({
    title: item.label,
    description: item.description,
    source: "EquityOS Opportunity Engine",
    timing: "Near to medium term",
  }));
}

function catalystsFromIntelligence(intelligence: EquityIntelligence | null): DecisionCatalyst[] {
  if (!intelligence) return [];
  return intelligence.thesis.keyCatalysts.map((catalyst) => ({
    title: "Strategic Catalyst",
    description: catalyst,
    source: "Equity Intelligence Thesis",
    timing: "6–18 months",
  }));
}

function catalystsFromRag(chunks: RetrievedChunk[]): DecisionCatalyst[] {
  return chunks.slice(0, 4).map((chunk) => ({
    title: chunk.heading ?? chunk.source,
    description: chunk.content.slice(0, 220).trim() + (chunk.content.length > 220 ? "…" : ""),
    source: `RAG · ${chunk.source}`,
    timing: chunk.quarter ?? (chunk.year ? String(chunk.year) : undefined),
  }));
}

function catalystsFromEarnings(context: CompanyContext): DecisionCatalyst[] {
  const latest = context.latestResults;
  if (!latest) return [];

  return [
    {
      title: `${latest.quarter} Results`,
      description: `${latest.commentary} Revenue ${latest.revenue} (${latest.revenueGrowthYoY > 0 ? "+" : ""}${latest.revenueGrowthYoY}% YoY).`,
      source: "Latest Results Summary",
      timing: latest.reportedOn,
    },
  ];
}

function catalystsFromCorporateActions(context: CompanyContext): DecisionCatalyst[] {
  return context.corporateActions.slice(0, 3).map((action) => ({
    title: action.title,
    description: action.description,
    source: `Corporate Action · ${action.type}`,
    timing: action.date,
  }));
}

export function buildDecisionCatalysts(input: {
  context: CompanyContext;
  intelligence: EquityIntelligence | null;
  opportunities: Opportunity[];
  ragChunks: RetrievedChunk[];
}): DecisionCatalyst[] {
  const merged = [
    ...catalystsFromEarnings(input.context),
    ...catalystsFromIntelligence(input.intelligence),
    ...catalystsFromOpportunities(input.opportunities),
    ...catalystsFromCorporateActions(input.context),
    ...catalystsFromRag(input.ragChunks),
  ];

  const seen = new Set<string>();
  return merged
    .filter((item) => {
      const key = `${item.title}:${item.description.slice(0, 80)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

export function formatCatalysts(catalysts: DecisionCatalyst[]): string[] {
  return catalysts.map((item) => {
    const timing = item.timing ? ` (${item.timing})` : "";
    return `**${item.title}**${timing} — ${item.description} _[${item.source}]_`;
  });
}
