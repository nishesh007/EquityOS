import type { CompanyMasterRecord, CompanyMasterTuple } from "@/lib/company-master/types";
import { toDisplaySymbol } from "@/lib/fundamentals/symbols";

export function parseMasterTuple(tuple: CompanyMasterTuple): CompanyMasterRecord {
  const [symbol, bseCode, name, isin] = tuple;
  return {
    symbol,
    displaySymbol: toDisplaySymbol(symbol),
    name,
    isin,
    bseCode,
    sector: "Equities",
    industry: "Listed Company",
  };
}

export function parseMasterTuples(tuples: CompanyMasterTuple[]): CompanyMasterRecord[] {
  return tuples.map(parseMasterTuple);
}
