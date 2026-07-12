/**
 * NSE symbol metadata — resolved from Company Master + enrichment overlay.
 */

import { getCompanyMasterRecords } from "@/lib/company-master";
import { getCompanyEnrichment } from "@/lib/company-master/enrichment";
import { lookupCompanyMaster } from "@/lib/company-master";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";

export interface NseSymbolMeta {
  name: string;
  sector: string;
  industry: string;
  price: number;
  changePercent: number;
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
      price: 0,
      changePercent: 0,
      marketCap: enrichment.marketCap,
      description: enrichment.description,
      website: enrichment.website,
    };
  }

  return {
    name: master.name,
    sector: master.sector,
    industry: master.industry,
    price: 0,
    changePercent: 0,
    marketCap: "—",
  };
}

export function listNseRegistrySymbols(): string[] {
  return getCompanyMasterRecords().map((record) => record.symbol);
}
