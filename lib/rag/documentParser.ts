/**
 * Institutional document parser — extracts structured content from research documents.
 */

export type DocumentSource =
  | "annual_report"
  | "quarterly_report"
  | "investor_presentation"
  | "concall_transcript"
  | "corporate_announcement"
  | "shareholding_pdf"
  | "credit_rating_report";

export const DOCUMENT_SOURCE_LABELS: Record<DocumentSource, string> = {
  annual_report: "Annual Report",
  quarterly_report: "Quarterly Report",
  investor_presentation: "Investor Presentation",
  concall_transcript: "Concall Transcript",
  corporate_announcement: "Corporate Announcement",
  shareholding_pdf: "Shareholding Pattern",
  credit_rating_report: "Credit Rating Report",
};

export interface DocumentMetadata {
  company: string;
  source: DocumentSource;
  year?: number;
  quarter?: string;
  filename?: string;
  mimeType?: string;
  pageCount: number;
  parsedAt: string;
}

export interface ParsedHeading {
  text: string;
  level: number;
  page?: number;
  line: number;
}

export interface ParsedTable {
  page?: number;
  caption?: string;
  rows: string[][];
  markdown: string;
}

export interface ParsedSection {
  heading: string;
  level: number;
  page?: number;
  paragraphs: string[];
  tables: ParsedTable[];
}

export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface ParsedDocument {
  text: string;
  headings: ParsedHeading[];
  tables: ParsedTable[];
  sections: ParsedSection[];
  pages: ParsedPage[];
  metadata: DocumentMetadata;
}

export interface DocumentInput {
  company: string;
  source: DocumentSource;
  year?: number;
  quarter?: string;
  filename?: string;
  mimeType?: string;
  content: string;
}

export class DocumentParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentParseError";
  }
}

const HEADING_PATTERN = /^(#{1,6})\s+(.+)$/;
const MARKDOWN_TABLE_ROW = /^\|(.+)\|$/;
const PAGE_MARKER_PATTERN = /^(?:page\s*(\d+)|\[page\s*(\d+)\])$/i;
const SECTION_HEADING_PATTERN = /^([A-Z][A-Z0-9\s&/\-]{3,})$/;

function normalizeWhitespace(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\t/g, "    ").trim();
}

function detectPageNumber(line: string): number | null {
  const match = line.trim().match(PAGE_MARKER_PATTERN);
  if (!match) return null;
  const page = Number.parseInt(match[1] ?? match[2] ?? "", 10);
  return Number.isFinite(page) ? page : null;
}

function parseMarkdownHeading(line: string, lineNumber: number): ParsedHeading | null {
  const match = line.match(HEADING_PATTERN);
  if (!match) return null;
  return {
    text: match[2].trim(),
    level: match[1].length,
    line: lineNumber,
  };
}

function parseSectionHeading(line: string, lineNumber: number): ParsedHeading | null {
  const trimmed = line.trim();
  if (!SECTION_HEADING_PATTERN.test(trimmed)) return null;
  if (trimmed.length > 80) return null;
  return {
    text: trimmed,
    level: 2,
    line: lineNumber,
  };
}

function tableToMarkdown(rows: string[][]): string {
  if (rows.length === 0) return "";
  const header = rows[0];
  const separator = header.map(() => "---");
  const body = rows.slice(1);
  return [
    `| ${header.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ].join("\n");
}

function parseTableBlock(
  lines: string[],
  startIndex: number,
  page?: number
): { table: ParsedTable; endIndex: number } | null {
  const first = lines[startIndex]?.trim() ?? "";
  if (!MARKDOWN_TABLE_ROW.test(first)) return null;

  const rows: string[][] = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? "";
    if (!MARKDOWN_TABLE_ROW.test(line)) break;
    const cells = line
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim());
    if (!cells.every((cell) => /^-+$/.test(cell))) {
      rows.push(cells);
    }
    index += 1;
  }

  if (rows.length === 0) return null;

  return {
    table: {
      page,
      rows,
      markdown: tableToMarkdown(rows),
    },
    endIndex: index,
  };
}

function splitPages(lines: string[]): ParsedPage[] {
  const pages: ParsedPage[] = [];
  let currentPage = 1;
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join("\n").trim();
    if (text) pages.push({ pageNumber: currentPage, text });
    buffer = [];
  };

  for (const line of lines) {
    const pageNumber = detectPageNumber(line);
    if (pageNumber !== null) {
      flush();
      currentPage = pageNumber;
      continue;
    }
    buffer.push(line);
  }

  flush();

  if (pages.length === 0 && lines.length > 0) {
    pages.push({ pageNumber: 1, text: lines.join("\n").trim() });
  }

  return pages;
}

function buildSections(
  lines: string[],
  headings: ParsedHeading[],
  tables: ParsedTable[]
): ParsedSection[] {
  if (headings.length === 0) {
    const paragraphs = lines
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (paragraphs.length === 0) return [];
    return [
      {
        heading: "Document",
        level: 1,
        paragraphs,
        tables,
      },
    ];
  }

  const sorted = [...headings].sort((a, b) => a.line - b.line);
  const sections: ParsedSection[] = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const heading = sorted[index];
    const nextLine = sorted[index + 1]?.line ?? lines.length;
    const bodyLines = lines.slice(heading.line, nextLine - 1);

    const paragraphs = bodyLines
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !MARKDOWN_TABLE_ROW.test(line))
      .filter((line) => detectPageNumber(line) === null);

    const sectionTables = tables.filter(
      (table) => table.caption === heading.text || table.page === heading.page
    );

    sections.push({
      heading: heading.text,
      level: heading.level,
      page: heading.page,
      paragraphs,
      tables: sectionTables,
    });
  }

  return sections;
}

function assignHeadingPages(headings: ParsedHeading[], pages: ParsedPage[]): ParsedHeading[] {
  let lineOffset = 0;
  const pageByLine = new Map<number, number>();

  for (const page of pages) {
    const pageLines = page.text.split("\n");
    for (let i = 0; i < pageLines.length; i += 1) {
      pageByLine.set(lineOffset + i + 1, page.pageNumber);
    }
    lineOffset += pageLines.length;
  }

  return headings.map((heading) => ({
    ...heading,
    page: pageByLine.get(heading.line) ?? heading.page,
  }));
}

export function parseDocument(input: DocumentInput): ParsedDocument {
  const content = normalizeWhitespace(input.content);
  if (!content) {
    throw new DocumentParseError("Document content is empty.");
  }

  if (content.startsWith("%PDF")) {
    throw new DocumentParseError(
      "Binary PDF input is not supported directly. Supply pre-extracted text content from the ingestion pipeline."
    );
  }

  const lines = content.split("\n");
  const pages = splitPages(lines);
  const headings: ParsedHeading[] = [];
  const tables: ParsedTable[] = [];

  let currentPage = 1;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const pageNumber = detectPageNumber(line);
    if (pageNumber !== null) {
      currentPage = pageNumber;
      continue;
    }

    const markdownHeading = parseMarkdownHeading(line, index + 1);
    if (markdownHeading) {
      headings.push({ ...markdownHeading, page: currentPage });
      continue;
    }

    const sectionHeading = parseSectionHeading(line, index + 1);
    if (sectionHeading) {
      headings.push({ ...sectionHeading, page: currentPage });
      continue;
    }

    const tableBlock = parseTableBlock(lines, index, currentPage);
    if (tableBlock) {
      tables.push(tableBlock.table);
      index = tableBlock.endIndex - 1;
    }
  }

  const headingsWithPages = assignHeadingPages(headings, pages);
  const sections = buildSections(lines, headingsWithPages, tables);

  return {
    text: content,
    headings: headingsWithPages,
    tables,
    sections,
    pages,
    metadata: {
      company: input.company,
      source: input.source,
      year: input.year,
      quarter: input.quarter,
      filename: input.filename,
      mimeType: input.mimeType,
      pageCount: pages.length,
      parsedAt: new Date().toISOString(),
    },
  };
}

export function parseDocuments(inputs: DocumentInput[]): ParsedDocument[] {
  return inputs.map((input) => parseDocument(input));
}
