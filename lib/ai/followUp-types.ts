/**
 * Client-safe follow-up bundle types.
 * Server generation lives in `@/lib/ai/followUpEngine`.
 */

export interface RelatedCompany {
  symbol: string;
  name: string;
  sector: string;
  reason: string;
}

export interface RelatedSector {
  sector: string;
  reason: string;
  exampleSymbols: string[];
}

export interface FollowUpBundle {
  questions: Array<{ id: string; text: string; category: string }>;
  relatedCompanies: RelatedCompany[];
  relatedSectors: RelatedSector[];
  resolvedSymbol: string | null;
  generatedAt: string;
}
