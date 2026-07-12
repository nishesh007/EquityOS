/**
 * Institutional document chunker — heading, section, and paragraph strategies.
 */

import type {
  DocumentMetadata,
  ParsedDocument,
  ParsedSection,
} from "@/lib/rag/documentParser";

export type ChunkStrategy = "heading" | "section" | "paragraph";

export interface RagChunkMetadata {
  company: string;
  year?: number;
  quarter?: string;
  source: DocumentMetadata["source"];
  page?: number;
  heading?: string;
  section?: string;
  strategy: ChunkStrategy;
  chunkIndex: number;
  filename?: string;
}

export interface RagChunk {
  id: string;
  content: string;
  metadata: RagChunkMetadata;
}

export interface ChunkerOptions {
  strategies?: ChunkStrategy[];
  maxChunkChars?: number;
  minChunkChars?: number;
}

const DEFAULT_STRATEGIES: ChunkStrategy[] = ["heading", "section", "paragraph"];
const DEFAULT_MAX_CHARS = 1800;
const DEFAULT_MIN_CHARS = 120;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function createChunkId(
  metadata: DocumentMetadata,
  strategy: ChunkStrategy,
  index: number,
  suffix = ""
): string {
  return [
    metadata.company,
    metadata.source,
    metadata.year ?? "na",
    metadata.quarter ?? "na",
    strategy,
    index,
    suffix,
  ]
    .join(":")
    .toUpperCase();
}

function splitParagraphs(text: string, maxChars: number): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buffer = "";

  for (const paragraph of paragraphs) {
    if ((buffer + "\n\n" + paragraph).length <= maxChars) {
      buffer = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
      continue;
    }

    if (buffer) chunks.push(buffer);
    if (paragraph.length <= maxChars) {
      buffer = paragraph;
      continue;
    }

    const sentences = paragraph.split(/(?<=[.!?])\s+/);
    let sentenceBuffer = "";
    for (const sentence of sentences) {
      if ((sentenceBuffer + " " + sentence).trim().length <= maxChars) {
        sentenceBuffer = sentenceBuffer ? `${sentenceBuffer} ${sentence}` : sentence;
      } else {
        if (sentenceBuffer) chunks.push(sentenceBuffer.trim());
        sentenceBuffer = sentence;
      }
    }
    buffer = sentenceBuffer;
  }

  if (buffer.trim()) chunks.push(buffer.trim());
  return chunks;
}

function sectionContent(section: ParsedSection): string {
  const parts: string[] = [`# ${section.heading}`];
  if (section.paragraphs.length > 0) {
    parts.push(section.paragraphs.join("\n\n"));
  }
  for (const table of section.tables) {
    parts.push(table.markdown);
  }
  return parts.join("\n\n").trim();
}

function pushChunk(
  chunks: RagChunk[],
  content: string,
  metadata: DocumentMetadata,
  strategy: ChunkStrategy,
  index: number,
  extra: Partial<RagChunkMetadata>,
  minChars: number
) {
  const trimmed = content.trim();
  if (trimmed.length < minChars) return;

  chunks.push({
    id: createChunkId(metadata, strategy, index, slugify(extra.heading ?? extra.section ?? "")),
    content: trimmed,
    metadata: {
      company: metadata.company,
      year: metadata.year,
      quarter: metadata.quarter,
      source: metadata.source,
      page: extra.page,
      heading: extra.heading,
      section: extra.section,
      strategy,
      chunkIndex: index,
      filename: metadata.filename,
    },
  });
}

function chunkByHeading(
  document: ParsedDocument,
  maxChars: number,
  minChars: number
): RagChunk[] {
  const chunks: RagChunk[] = [];

  document.headings.forEach((heading, index) => {
    const section = document.sections.find((item) => item.heading === heading.text);
    const content = section
      ? sectionContent(section)
      : `# ${heading.text}`;

    for (const [partIndex, part] of splitParagraphs(content, maxChars).entries()) {
      pushChunk(chunks, part, document.metadata, "heading", index * 100 + partIndex, {
        heading: heading.text,
        section: heading.text,
        page: heading.page,
      }, minChars);
    }
  });

  return chunks;
}

function chunkBySection(
  document: ParsedDocument,
  maxChars: number,
  minChars: number
): RagChunk[] {
  const chunks: RagChunk[] = [];

  document.sections.forEach((section, index) => {
    const content = sectionContent(section);
    for (const [partIndex, part] of splitParagraphs(content, maxChars).entries()) {
      pushChunk(chunks, part, document.metadata, "section", index * 100 + partIndex, {
        heading: section.heading,
        section: section.heading,
        page: section.page,
      }, minChars);
    }
  });

  return chunks;
}

function chunkByParagraph(
  document: ParsedDocument,
  maxChars: number,
  minChars: number
): RagChunk[] {
  const chunks: RagChunk[] = [];
  const paragraphs = document.text
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  paragraphs.forEach((paragraph, index) => {
    for (const [partIndex, part] of splitParagraphs(paragraph, maxChars).entries()) {
      pushChunk(chunks, part, document.metadata, "paragraph", index * 100 + partIndex, {
        section: "body",
      }, minChars);
    }
  });

  return chunks;
}

function dedupeChunks(chunks: RagChunk[]): RagChunk[] {
  const seen = new Set<string>();
  return chunks.filter((chunk) => {
    const key = `${chunk.metadata.strategy}:${chunk.content}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function chunkDocument(
  document: ParsedDocument,
  options: ChunkerOptions = {}
): RagChunk[] {
  const strategies = options.strategies ?? DEFAULT_STRATEGIES;
  const maxChars = options.maxChunkChars ?? DEFAULT_MAX_CHARS;
  const minChars = options.minChunkChars ?? DEFAULT_MIN_CHARS;

  const chunks: RagChunk[] = [];

  if (strategies.includes("heading")) {
    chunks.push(...chunkByHeading(document, maxChars, minChars));
  }
  if (strategies.includes("section")) {
    chunks.push(...chunkBySection(document, maxChars, minChars));
  }
  if (strategies.includes("paragraph")) {
    chunks.push(...chunkByParagraph(document, maxChars, minChars));
  }

  return dedupeChunks(chunks);
}

export function chunkDocuments(
  documents: ParsedDocument[],
  options?: ChunkerOptions
): RagChunk[] {
  return documents.flatMap((document) => chunkDocument(document, options));
}
