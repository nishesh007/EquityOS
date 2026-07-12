/**
 * Company Master types — provider-agnostic schema for NSE/BSE equity universe.
 * Replace `data/equity-universe.json` via `scripts/generate-company-master.mjs`
 * or future NSE/BSE/broker instrument feeds without changing consumers.
 */

/** Compact on-disk tuple: [symbol, bseCode|null, name, isin] */
export type CompanyMasterTuple = [string, string | null, string, string];

export interface CompanyMasterRecord {
  /** Primary routing symbol (NSE ticker when listed, else BSE scrip id) */
  symbol: string;
  displaySymbol: string;
  name: string;
  isin: string;
  bseCode: string | null;
  sector: string;
  industry: string;
}

export interface CompanyMasterSnapshot {
  version: 1;
  generatedAt: string;
  source: "nse-bse-static";
  count: number;
  records: CompanyMasterRecord[];
}

export interface CompanyMasterProvider {
  load(): Promise<CompanyMasterSnapshot> | CompanyMasterSnapshot;
}
