/**
 * Institutional RAG retriever — top-K chunk retrieval before AI research answers.
 */

import { CACHE_TTL, cacheKey, getCached } from "@/lib/cache";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";
import { resolveSymbolsFromPrompt } from "@/lib/ai/context/companyContext";
import { isRagConfigured, loadRagConfig } from "@/lib/rag/config";
import { embedQuery, EmbedderError } from "@/lib/rag/embedder";
import {
  similaritySearch,
  type VectorSearchResult,
} from "@/lib/rag/vectorStore";

export interface RetrievedChunk {
  id: string;
  content: string;
  company: string;
  source: string;
  year: number | null;
  quarter: string | null;
  page: number | null;
  heading: string | null;
  section: string | null;
  similarity: number;
}

export interface RetrievalInput {
  prompt: string;
  symbol: string | null;
  companies?: string[];
  limit?: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  queryEmbedded: boolean;
  configured: boolean;
}

function mapResult(result: VectorSearchResult): RetrievedChunk {
  return {
    id: result.id,
    content: result.content,
    company: result.company,
    source: result.source,
    year: result.year,
    quarter: result.quarter,
    page: result.page,
    heading: result.heading,
    section: result.section,
    similarity: result.similarity,
  };
}

function resolveCompanies(input: RetrievalInput): string[] {
  if (input.companies?.length) {
    return [...new Set(input.companies.map((company) => normalizeNseSymbol(company)))];
  }

  return resolveSymbolsFromPrompt(input.prompt, input.symbol);
}

export async function retrieveRelevantChunks(
  input: RetrievalInput
): Promise<RetrievalResult> {
  if (!isRagConfigured()) {
    return {
      chunks: [],
      queryEmbedded: false,
      configured: false,
    };
  }

  const companies = resolveCompanies(input);
  const limit = input.limit ?? loadRagConfig().topK;
  const cacheKeyValue = cacheKey(
    "rag-retrieval",
    input.prompt.slice(0, 200),
    companies.join(","),
    limit
  );

  try {
    const chunks = await getCached(
      { key: cacheKeyValue, ttlMs: CACHE_TTL.FIVE_MINUTES },
      async () => {
        const embedding = await embedQuery(input.prompt);
        const results = await similaritySearch(embedding, {
          companies: companies.length > 0 ? companies : undefined,
          limit,
        });
        return results.map(mapResult);
      }
    );

    return {
      chunks,
      queryEmbedded: true,
      configured: true,
    };
  } catch (error) {
    if (error instanceof EmbedderError) {
      return {
        chunks: [],
        queryEmbedded: false,
        configured: true,
      };
    }
    throw error;
  }
}

export function formatRetrievedChunks(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return "No institutional document chunks were retrieved from the vector store for this query.";
  }

  return chunks
    .map((chunk, index) => {
      const meta = [
        `company=${chunk.company}`,
        `source=${chunk.source}`,
        chunk.year ? `year=${chunk.year}` : null,
        chunk.quarter ? `quarter=${chunk.quarter}` : null,
        chunk.page ? `page=${chunk.page}` : null,
        chunk.heading ? `heading=${chunk.heading}` : null,
        `similarity=${chunk.similarity.toFixed(4)}`,
      ]
        .filter(Boolean)
        .join(" | ");

      return `### Chunk ${index + 1}
${meta}

${chunk.content}`;
    })
    .join("\n\n");
}

export async function retrieveInstitutionalContext(
  input: RetrievalInput
): Promise<{ chunks: RetrievedChunk[]; formatted: string; configured: boolean }> {
  const result = await retrieveRelevantChunks(input);
  return {
    chunks: result.chunks,
    formatted: formatRetrievedChunks(result.chunks),
    configured: result.configured,
  };
}
