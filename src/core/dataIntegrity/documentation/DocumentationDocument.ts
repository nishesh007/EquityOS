/**
 * Shared documentation document model.
 */

export type DocumentationDocumentKind =
  | "api"
  | "module"
  | "rule"
  | "architecture"
  | "pipeline"
  | "dependency"
  | "configuration"
  | "lifecycle"
  | "developer_onboarding"
  | "integration"
  | "extension"
  | "best_practices"
  | "examples"
  | "changelog"
  | "migration"
  | "guide";

export interface DocumentationSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface DocumentationDocument {
  documentId: string;
  kind: DocumentationDocumentKind;
  title: string;
  summary: string;
  sections: DocumentationSection[];
  relatedModules: string[];
  generatedAt: string;
  wordCount: number;
  qualityScore: number;
  warnings: string[];
  errors: string[];
}

export function buildDocument(input: {
  documentId: string;
  kind: DocumentationDocumentKind;
  title: string;
  summary: string;
  sections: DocumentationSection[];
  relatedModules?: string[];
  warnings?: string[];
  errors?: string[];
}): DocumentationDocument {
  const sections = input.sections.map((s) => ({
    ...s,
    bullets: s.bullets ? [...s.bullets] : undefined,
  }));
  const text = [
    input.title,
    input.summary,
    ...sections.flatMap((s) => [s.heading, s.body, ...(s.bullets ?? [])]),
  ].join(" ");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const qualityScore = clamp(
    Math.round(
      Math.min(100, sections.length * 12 + Math.min(40, wordCount / 8))
    ),
    0,
    100
  );
  return {
    documentId: input.documentId,
    kind: input.kind,
    title: input.title,
    summary: input.summary,
    sections,
    relatedModules: input.relatedModules ? [...input.relatedModules] : [],
    generatedAt: new Date().toISOString(),
    wordCount,
    qualityScore,
    warnings: input.warnings ? [...input.warnings] : [],
    errors: input.errors ? [...input.errors] : [],
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
