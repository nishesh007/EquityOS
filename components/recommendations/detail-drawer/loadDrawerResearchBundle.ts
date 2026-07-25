"use server";

import { fetchCompanyResearch } from "@/services/researchData";
import { fetchEquityIntelligence } from "@/services/equityIntelligenceData";
import type { CompanyResearch, EquityIntelligence } from "@/types";

export interface DrawerResearchBundle {
  symbol: string;
  research: CompanyResearch | null;
  intelligence: EquityIntelligence | null;
}

/**
 * Sprint 11A.3 — load existing research packages for the Recommendation Drawer.
 * Reuses company-page services only; does not modify engines or REST APIs.
 */
export async function loadDrawerResearchBundle(
  symbol: string
): Promise<DrawerResearchBundle | null> {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;

  try {
    const [research, intelligence] = await Promise.all([
      fetchCompanyResearch(normalized).catch(() => null),
      fetchEquityIntelligence(normalized).catch(() => null),
    ]);

    return {
      symbol: normalized,
      research,
      intelligence,
    };
  } catch {
    return {
      symbol: normalized,
      research: null,
      intelligence: null,
    };
  }
}
