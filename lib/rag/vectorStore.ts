/**
 * pgvector-backed institutional document vector store.
 */

import { Pool, type PoolClient, type QueryResultRow } from "pg";
import {
  isVectorStoreConfigured,
  loadRagConfig,
} from "@/lib/rag/config";
import type { RagChunk } from "@/lib/rag/chunker";

export class VectorStoreError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "VectorStoreError";
    this.status = status;
  }
}

export interface VectorDocument extends RagChunk {
  embedding: number[];
}

export interface VectorSearchFilter {
  companies?: string[];
  sources?: string[];
  year?: number;
  quarter?: string;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  company: string;
  year: number | null;
  quarter: string | null;
  source: string;
  page: number | null;
  heading: string | null;
  section: string | null;
  metadata: Record<string, unknown>;
  similarity: number;
}

const TABLE_NAME = "rag_document_chunks";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getDatabaseUrl(): string {
  const url = loadRagConfig().databaseUrl;
  if (!url) {
    throw new VectorStoreError(
      "DATABASE_URL is not configured. pgvector store is unavailable.",
      503
    );
  }
  return url;
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
    });
  }
  return pool;
}

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

async function ensureSchema(client: PoolClient): Promise<void> {
  const dimensions = loadRagConfig().embeddingDimensions;

  await client.query("CREATE EXTENSION IF NOT EXISTS vector");
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      year INTEGER,
      quarter TEXT,
      source TEXT NOT NULL,
      page INTEGER,
      heading TEXT,
      section TEXT,
      content TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      embedding vector(${dimensions}) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await client.query(
    `CREATE INDEX IF NOT EXISTS ${TABLE_NAME}_company_idx ON ${TABLE_NAME} (company)`
  );
  await client.query(
    `CREATE INDEX IF NOT EXISTS ${TABLE_NAME}_source_idx ON ${TABLE_NAME} (source)`
  );

  try {
    await client.query(`
      CREATE INDEX IF NOT EXISTS ${TABLE_NAME}_embedding_idx
      ON ${TABLE_NAME}
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
  } catch {
    // IVFFlat index requires sufficient rows; created after ingestion.
  }
}

async function withSchema<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    if (!schemaReady) {
      schemaReady = ensureSchema(client);
    }
    await schemaReady;
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function insertDocuments(documents: VectorDocument[]): Promise<number> {
  if (!isVectorStoreConfigured()) {
    throw new VectorStoreError("Vector store is not configured.", 503);
  }
  if (documents.length === 0) return 0;

  return withSchema(async (client) => {
    await client.query("BEGIN");

    try {
      for (const document of documents) {
        await client.query(
          `
          INSERT INTO ${TABLE_NAME} (
            id, company, year, quarter, source, page, heading, section, content, metadata, embedding
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::vector
          )
          ON CONFLICT (id) DO UPDATE SET
            company = EXCLUDED.company,
            year = EXCLUDED.year,
            quarter = EXCLUDED.quarter,
            source = EXCLUDED.source,
            page = EXCLUDED.page,
            heading = EXCLUDED.heading,
            section = EXCLUDED.section,
            content = EXCLUDED.content,
            metadata = EXCLUDED.metadata,
            embedding = EXCLUDED.embedding
          `,
          [
            document.id,
            document.metadata.company,
            document.metadata.year ?? null,
            document.metadata.quarter ?? null,
            document.metadata.source,
            document.metadata.page ?? null,
            document.metadata.heading ?? null,
            document.metadata.section ?? null,
            document.content,
            JSON.stringify(document.metadata),
            toVectorLiteral(document.embedding),
          ]
        );
      }

      await client.query("COMMIT");
      return documents.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  });
}

export async function deleteCompany(company: string): Promise<number> {
  if (!isVectorStoreConfigured()) {
    throw new VectorStoreError("Vector store is not configured.", 503);
  }

  return withSchema(async (client) => {
    const result = await client.query(
      `DELETE FROM ${TABLE_NAME} WHERE company = $1`,
      [company.toUpperCase()]
    );
    return result.rowCount ?? 0;
  });
}

function mapSearchRow(row: QueryResultRow): VectorSearchResult {
  return {
    id: String(row.id),
    content: String(row.content),
    company: String(row.company),
    year: row.year === null ? null : Number(row.year),
    quarter: row.quarter === null ? null : String(row.quarter),
    source: String(row.source),
    page: row.page === null ? null : Number(row.page),
    heading: row.heading === null ? null : String(row.heading),
    section: row.section === null ? null : String(row.section),
    metadata:
      typeof row.metadata === "object" && row.metadata !== null
        ? (row.metadata as Record<string, unknown>)
        : {},
    similarity: Number(row.similarity),
  };
}

export async function search(
  embedding: number[],
  filter: VectorSearchFilter = {},
  limit = 10
): Promise<VectorSearchResult[]> {
  if (!isVectorStoreConfigured()) {
    return [];
  }

  const conditions: string[] = [];
  const params: unknown[] = [toVectorLiteral(embedding), limit];
  let paramIndex = 3;

  if (filter.companies?.length) {
    conditions.push(`company = ANY($${paramIndex}::text[])`);
    params.push(filter.companies.map((company) => company.toUpperCase()));
    paramIndex += 1;
  }

  if (filter.sources?.length) {
    conditions.push(`source = ANY($${paramIndex}::text[])`);
    params.push(filter.sources);
    paramIndex += 1;
  }

  if (filter.year !== undefined) {
    conditions.push(`year = $${paramIndex}`);
    params.push(filter.year);
    paramIndex += 1;
  }

  if (filter.quarter) {
    conditions.push(`quarter = $${paramIndex}`);
    params.push(filter.quarter);
    paramIndex += 1;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  return withSchema(async (client) => {
    const result = await client.query(
      `
      SELECT
        id,
        company,
        year,
        quarter,
        source,
        page,
        heading,
        section,
        content,
        metadata,
        1 - (embedding <=> $1::vector) AS similarity
      FROM ${TABLE_NAME}
      ${whereClause}
      ORDER BY embedding <=> $1::vector
      LIMIT $2
      `,
      params
    );

    return result.rows.map(mapSearchRow);
  });
}

export async function similaritySearch(
  queryEmbedding: number[],
  options: {
    companies?: string[];
    sources?: string[];
    limit?: number;
  } = {}
): Promise<VectorSearchResult[]> {
  return search(
    queryEmbedding,
    {
      companies: options.companies,
      sources: options.sources,
    },
    options.limit ?? loadRagConfig().topK
  );
}

export async function closeVectorStore(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = null;
  }
}
