import universeData from "@/lib/company-master/data/equity-universe.json";
import { getCompanyEnrichment } from "@/lib/company-master/enrichment";
import { parseMasterTuples } from "@/lib/company-master/parse";
import type {
  CompanyMasterRecord,
  CompanyMasterSnapshot,
  CompanyMasterTuple,
} from "@/lib/company-master/types";
import { MOCK_COMPANY_SEEDS } from "@/lib/fundamentals/mock-data";
import { normalizeNseSymbol, toDisplaySymbol } from "@/lib/fundamentals/symbols";

interface MasterIndex {
  records: CompanyMasterRecord[];
  bySymbol: Map<string, CompanyMasterRecord>;
  byBse: Map<string, CompanyMasterRecord>;
}

let snapshotCache: CompanyMasterSnapshot | null = null;
let indexCache: MasterIndex | null = null;

function applyEnrichment(record: CompanyMasterRecord): CompanyMasterRecord {
  const enrichment = getCompanyEnrichment(record.symbol);
  if (!enrichment) return record;
  return {
    ...record,
    sector: enrichment.sector,
    industry: enrichment.industry,
  };
}

function applyMockSeed(record: CompanyMasterRecord): CompanyMasterRecord {
  const seed = MOCK_COMPANY_SEEDS[record.symbol];
  if (!seed) return record;
  return {
    ...record,
    name: seed.name,
    sector: seed.sector,
    industry: seed.industry,
  };
}

function buildIndex(records: CompanyMasterRecord[]): MasterIndex {
  const bySymbol = new Map<string, CompanyMasterRecord>();
  const byBse = new Map<string, CompanyMasterRecord>();

  for (const record of records) {
    bySymbol.set(record.symbol, record);
    if (record.bseCode) byBse.set(record.bseCode, record);
  }

  return { records, bySymbol, byBse };
}

export function getCompanyMasterSnapshot(): CompanyMasterSnapshot {
  if (snapshotCache) return snapshotCache;

  const tuples = universeData as CompanyMasterTuple[];
  const records = parseMasterTuples(tuples).map((record) =>
    applyMockSeed(applyEnrichment(record))
  );

  snapshotCache = {
    version: 1,
    generatedAt: "static",
    source: "nse-bse-static",
    count: records.length,
    records,
  };

  return snapshotCache;
}

export function getCompanyMasterIndex(): MasterIndex {
  if (indexCache) return indexCache;
  indexCache = buildIndex(getCompanyMasterSnapshot().records);
  return indexCache;
}

export function getCompanyMasterRecords(): CompanyMasterRecord[] {
  return getCompanyMasterIndex().records;
}

export function lookupCompanyMaster(symbolOrBse: string): CompanyMasterRecord | null {
  const trimmed = symbolOrBse.trim();
  const index = getCompanyMasterIndex();

  const aliasResolved = lookupWithAliases(trimmed, index);
  if (aliasResolved) return aliasResolved;

  if (/^\d+$/.test(trimmed)) {
    return index.byBse.get(trimmed) ?? null;
  }

  return null;
}

function lookupWithAliases(
  trimmed: string,
  index: MasterIndex
): CompanyMasterRecord | null {
  const normalized = normalizeNseSymbol(trimmed);
  const bySymbol = index.bySymbol.get(normalized);
  if (bySymbol) return bySymbol;

  const upper = trimmed.toUpperCase();
  const byDisplay = index.records.find(
    (record) => record.displaySymbol.toUpperCase() === upper
  );
  return byDisplay ?? null;
}

export function resetCompanyMasterCache(): void {
  snapshotCache = null;
  indexCache = null;
}

export type { CompanyMasterRecord };

export { getCompanyMasterIndex as getMasterSearchIndex };

export function toRegistryEntry(
  record: CompanyMasterRecord
): {
  symbol: string;
  displaySymbol: string;
  name: string;
  sector: string;
  industry: string;
  bseCode: string | null;
} {
  return {
    symbol: record.symbol,
    displaySymbol: toDisplaySymbol(record.symbol),
    name: record.name,
    sector: record.sector,
    industry: record.industry,
    bseCode: record.bseCode,
  };
}
