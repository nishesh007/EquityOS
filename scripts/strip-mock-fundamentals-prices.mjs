/**
 * One-shot: strip market-price fields from fundamentals mock seeds.
 */
import { readFileSync, writeFileSync } from "node:fs";

const path = "lib/fundamentals/mock-data.ts";
let s = readFileSync(path, "utf8");

s = s.replace(/^\s*price:\s*[^,\n]+,\s*\r?\n/gm, "");
s = s.replace(/^\s*change:\s*[^,\n]+,\s*\r?\n/gm, "");
s = s.replace(/^\s*changePercent:\s*[^,\n]+,\s*\r?\n/gm, "");

s = s.replace(
  'import type { CompanyProfile } from "@/types";',
  'import type { FundamentalsSeedProfile } from "@/lib/fundamentals/seed-types";'
);

s = s.replace(
  'export const MOCK_COMPANY_SEEDS: Record<string, Omit<CompanyProfile, "priceHistory">> = {',
  `/** Fundamentals-only seeds — never include LTP/OHLC/volume/change%. */
export const MOCK_COMPANY_SEEDS: Record<string, FundamentalsSeedProfile> = {`
);

s = s.replace(
  /export function getMockSeed\(symbol: string\): Omit<CompanyProfile, "priceHistory"> \| null \{[\s\S]*?\n\}/,
  `export function getMockSeed(symbol: string): FundamentalsSeedProfile | null {
  return MOCK_COMPANY_SEEDS[symbol.toUpperCase()] ?? null;
}`
);

writeFileSync(path, s);
console.log("stripped market fields from", path);
