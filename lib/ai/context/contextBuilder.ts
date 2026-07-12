import {
  loadCompanyContexts,
  type CompanyContext,
} from "@/lib/ai/context/companyContext";
import { RESEARCH_SECTIONS, getResearchSystemPrompt } from "@/lib/ai/systemPrompt";
import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";
import { retrieveInstitutionalContext } from "@/lib/rag/retriever";
import {
  fetchAIMarketSummary,
  fetchMarketIndices,
} from "@/services/marketData";
import type { AIMarketSummary, MarketIndex } from "@/types";

export interface MarketContext {
  indices: MarketIndex[];
  aiSummary: AIMarketSummary;
  generatedAt: string;
}

export interface ResearchPromptInput {
  prompt: string;
  symbol: string | null;
}

export interface BuiltResearchPrompt {
  systemPrompt: string;
  userPrompt: string;
  companies: CompanyContext[];
  market: MarketContext;
  ragChunks: string;
}

async function loadMarketContext(): Promise<MarketContext> {
  return getCached(
    {
      key: cacheKey("ai-market-context"),
      ttlMs: CACHE_TTL.FIVE_MINUTES,
    },
    async () => {
      const [indices, aiSummary] = await Promise.all([
        fetchMarketIndices(),
        fetchAIMarketSummary(),
      ]);

      return {
        indices,
        aiSummary,
        generatedAt: new Date().toISOString(),
      };
    }
  );
}

function formatCompanyContexts(companies: CompanyContext[]): string {
  if (companies.length === 0) {
    return "No company-specific EquityOS context was resolved from the prompt. Use market context and clearly state assumptions when company-level data is unavailable.";
  }

  return companies
    .map((company) => {
      return `### ${company.profile.symbol} — ${company.profile.name}

\`\`\`json
${JSON.stringify(company, null, 2)}
\`\`\``;
    })
    .join("\n\n");
}

function buildResearchTemplate(): string {
  return RESEARCH_SECTIONS.map((section, index) => `${index + 1}. ${section}`).join(
    "\n"
  );
}

function buildUserPrompt(
  prompt: string,
  companies: CompanyContext[],
  market: MarketContext,
  ragContext: string
): string {
  const companyBlock = formatCompanyContexts(companies);
  const researchTemplate = buildResearchTemplate();

  return `# EquityOS Research Request

## User Question

${prompt}

## Market Context

\`\`\`json
${JSON.stringify(market, null, 2)}
\`\`\`

## Company Context

${companyBlock}

## Institutional RAG Context

The following excerpts were retrieved from indexed annual reports, quarterly filings, investor presentations, concall transcripts, corporate announcements, shareholding disclosures, and credit rating reports.

${ragContext}

## Research Template

Produce the final answer using these sections in order:

${researchTemplate}

## Instructions

- Ground every section in the supplied EquityOS company, financial intelligence, and RAG context.
- **Financial Intelligence is required in every section where relevant.** For each company with a financialIntelligence object, cite concrete metrics: ROE, ROCE, OPM, NPM, FCF, CFO/PAT, debt ratios, working capital days, cash conversion cycle, TTM figures, CAGR trends, and all composite scores (Financial Health, Quality, Risk).
- **Use Institutional RAG chunks as primary evidence** for management commentary, guidance, strategic priorities, and disclosure-backed claims. Cite source type, year/quarter, and page when available.
- When a metric is missing from context, explicitly note the gap instead of inventing values.
- For comparison questions, address each resolved company within the same section structure.
- End with a one-line disclaimer: *This is AI-generated research assistance, not investment advice.*`;
}

export async function buildResearchPrompt(
  input: ResearchPromptInput
): Promise<BuiltResearchPrompt> {
  const prompt = input.prompt.trim();
  const [companies, market, rag] = await Promise.all([
    loadCompanyContexts(prompt, input.symbol),
    loadMarketContext(),
    retrieveInstitutionalContext({
      prompt,
      symbol: input.symbol,
      limit: 10,
    }),
  ]);

  return {
    systemPrompt: getResearchSystemPrompt(),
    userPrompt: buildUserPrompt(prompt, companies, market, rag.formatted),
    companies,
    market,
    ragChunks: rag.formatted,
  };
}
