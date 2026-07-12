/**
 * Domain contracts for company data and research.
 */

import type {
  CompanyProfile,
  CompanyResearch,
  EquityIntelligence,
} from "@/types";

export interface CompanyDataService {
  fetchProfile(symbol: string): Promise<CompanyProfile | null>;
}

export interface CompanyResearchService {
  fetchResearch(symbol: string): Promise<CompanyResearch | null>;
}

export interface EquityIntelligenceService {
  fetchIntelligence(symbol: string): Promise<EquityIntelligence | null>;
}

export type { CompanyProfile, CompanyResearch, EquityIntelligence };
