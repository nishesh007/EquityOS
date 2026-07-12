import {
  getCompanyMasterIndex,
  lookupCompanyMaster,
  type CompanyMasterRecord,
} from "@/lib/company-master";
import { normalizeNseSymbol } from "@/lib/fundamentals/symbols";

export type SearchableCompany = CompanyMasterRecord;

function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s&]/g, " ")
    .replace(/\b(ltd|limited|inc|corp|corporation)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compact(text: string): string {
  return text.replace(/\s+/g, "");
}

function isSubsequence(needle: string, haystack: string): boolean {
  if (!needle) return true;
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) index += 1;
    if (index === needle.length) return true;
  }
  return index === needle.length;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[] = new Array(rows * cols);

  for (let i = 0; i < rows; i += 1) matrix[i * cols] = i;
  for (let j = 0; j < cols; j += 1) matrix[j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i * cols + j] = Math.min(
        matrix[(i - 1) * cols + j] + 1,
        matrix[i * cols + (j - 1)] + 1,
        matrix[(i - 1) * cols + (j - 1)] + cost
      );
    }
  }

  return matrix[(rows - 1) * cols + (cols - 1)];
}

function scoreMatch(company: CompanyMasterRecord, rawQuery: string): number {
  const query = normalizeSearchText(rawQuery);
  if (!query) return 0;

  const symbol = company.displaySymbol.toLowerCase();
  const canonical = company.symbol.toLowerCase();
  const bse = company.bseCode?.toLowerCase() ?? "";
  const name = normalizeSearchText(company.name);
  const compactQuery = compact(query);
  const compactSymbol = compact(symbol);
  const compactCanonical = compact(canonical);
  const compactName = compact(name);
  const normalizedQuerySymbol = normalizeNseSymbol(rawQuery).toLowerCase();

  if (
    query === symbol ||
    query === canonical ||
    query === bse ||
    compactQuery === compactSymbol ||
    compactQuery === compactCanonical ||
    compactQuery === bse ||
    normalizedQuerySymbol === canonical
  ) {
    return 100;
  }

  if (
    symbol.startsWith(query) ||
    canonical.startsWith(query) ||
    bse.startsWith(query)
  ) {
    return 90;
  }
  if (name.startsWith(query)) return 85;

  const nameWords = name.split(" ");
  if (nameWords.some((word) => word.startsWith(query))) return 80;

  if (
    symbol.includes(query) ||
    canonical.includes(query) ||
    bse.includes(query)
  ) {
    return 70;
  }
  if (name.includes(query)) return 65;

  if (query.length >= 2) {
    if (
      isSubsequence(compactQuery, compactSymbol) ||
      isSubsequence(compactQuery, compactCanonical) ||
      (bse && isSubsequence(compactQuery, bse))
    ) {
      return 58;
    }
  }

  if (query.length >= 3 && isSubsequence(compactQuery, compactName)) {
    return 52;
  }

  if (query.length >= 3) {
    const symbolDistance = Math.min(
      levenshtein(compactQuery, compactSymbol),
      levenshtein(compactQuery, compactCanonical),
      bse ? levenshtein(compactQuery, bse) : Number.POSITIVE_INFINITY
    );
    const maxSymbolDistance = query.length <= 4 ? 1 : 2;
    if (symbolDistance <= maxSymbolDistance) {
      return 48 - symbolDistance * 4;
    }
  }

  if (query.length >= 4) {
    const nameDistance = levenshtein(
      query,
      name.slice(0, Math.min(name.length, query.length + 4))
    );
    if (nameDistance <= 2) return 42 - nameDistance * 3;
  }

  return 0;
}

export function searchCompanies(query: string, limit = 8): SearchableCompany[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const direct = lookupCompanyMaster(trimmed);
  if (direct) return [direct];

  const index = getCompanyMasterIndex();

  return index.records
    .map((company) => ({
      company,
      score: scoreMatch(company, trimmed),
    }))
    .filter(({ score }) => score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.company.displaySymbol.localeCompare(b.company.displaySymbol)
    )
    .slice(0, limit)
    .map(({ company }) => company);
}

export function resolveSearchQuery(query: string): SearchableCompany | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const direct = lookupCompanyMaster(trimmed);
  if (direct) return direct;

  return searchCompanies(trimmed, 1)[0] ?? null;
}

export function preloadCompanySearch(): void {
  getCompanyMasterIndex();
}
