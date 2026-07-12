/**
 * Unified EquityOS company registry — delegates to the centralized Company Master.
 */

import {
  getCompanyMasterRecords,
  lookupCompanyMaster,
  resetCompanyMasterCache,
  toRegistryEntry,
  type CompanyMasterRecord,
} from "@/lib/company-master";

export interface CompanyRegistryEntry {
  symbol: string;
  displaySymbol: string;
  name: string;
  sector: string;
  industry: string;
  bseCode: string | null;
}

export function getCompanyRegistry(): CompanyRegistryEntry[] {
  return getCompanyMasterRecords().map(toRegistryEntry);
}

export function lookupCompanyRegistry(
  symbol: string
): CompanyRegistryEntry | null {
  const record = lookupCompanyMaster(symbol);
  return record ? toRegistryEntry(record) : null;
}

export function listCompanyRegistrySymbols(): string[] {
  return getCompanyMasterRecords().map((record) => record.symbol);
}

export function resetCompanyRegistryCache(): void {
  resetCompanyMasterCache();
}

export type { CompanyMasterRecord as CompanyRegistrySourceRecord };
