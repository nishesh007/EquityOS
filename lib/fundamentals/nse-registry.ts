/**
 * NSE symbol metadata — resolved from Company Master + enrichment overlay.
 * Never carries LTP / change% — market prices come from market-data.
 */

import { getCompanyMasterRecords } from "@/lib/company-master";
import { getCompanyEnrichment } from "@/lib/company-master/enrichment";
import { lookupCompanyMaster } from "@/lib/company-master";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";

export interface NseSymbolMeta {
  name: string;
  sector: string;
  industry: string;
  /** Static enrichment label only. */
  marketCap: string;
  description?: string;
  website?: string;
}

export function getNseSymbolMeta(symbol: string): NseSymbolMeta | null {
  const normalized = normalizeNseSymbol(symbol);
  const master = lookupCompanyMaster(normalized);
  if (!master) return null;

  const enrichment = getCompanyEnrichment(normalized);
  if (enrichment) {
    return {
      name: master.name,
      sector: enrichment.sector,
      industry: enrichment.industry,
      marketCap: enrichment.marketCap,
      description: enrichment.description,
      website: enrichment.website,
    };
  }

  return {
    name: master.name,
    sector: master.sector,
    industry: master.industry,
    marketCap: "—",
  };
}

export function listNseRegistrySymbols(): string[] {
  return getCompanyMasterRecords().map((r) => r.symbol);
}
