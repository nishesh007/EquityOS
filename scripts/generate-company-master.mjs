/**
 * Generates lib/company-master/data/equity-universe.json from NSE + BSE masters.
 *
 * Usage: node scripts/generate-company-master.mjs
 *
 * Data sources (public exchange archives):
 * - NSE EQUITY_L.csv
 * - BSE ListofScripData API
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "lib", "company-master", "data", "equity-universe.json");

const NSE_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv";
const BSE_URL =
  "https://api.bseindia.com/BseIndiaAPI/api/ListofScripData/w?Group=&Scripcode=&industry=&segment=Equity&status=Active";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (EquityOS Company Master Generator)",
};

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

async function fetchText(url, extraHeaders = {}) {
  const response = await fetch(url, { headers: { ...HEADERS, ...extraHeaders } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
}

async function fetchJson(url, extraHeaders = {}) {
  const response = await fetch(url, { headers: { ...HEADERS, ...extraHeaders } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

function loadLocalOrFetch(localName, fetcher) {
  const localPath = path.join(root, localName);
  if (fs.existsSync(localPath)) {
    return fs.readFileSync(localPath, "utf8");
  }
  return fetcher();
}

async function loadNseCsv() {
  const text = await loadLocalOrFetch(".tmp-equity-l.csv", () => fetchText(NSE_URL));
  const lines = text.trim().split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const symbolIdx = header.indexOf("SYMBOL");
  const nameIdx = header.indexOf("NAME OF COMPANY");
  const seriesIdx = header.indexOf("SERIES");
  const isinIdx = header.indexOf("ISIN NUMBER");

  const records = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cols = parseCsvLine(line);
    const series = cols[seriesIdx];
    if (series !== "EQ") continue;
    records.push({
      symbol: cols[symbolIdx].toUpperCase(),
      name: cols[nameIdx],
      isin: cols[isinIdx],
    });
  }
  return records;
}

async function loadBseJson() {
  const data = await loadLocalOrFetch(".tmp-bse.json", () =>
    fetchJson(BSE_URL, { Referer: "https://www.bseindia.com/" }).then((json) =>
      JSON.stringify(json)
    ).then((text) => JSON.parse(text))
  );

  const parsed = typeof data === "string" ? JSON.parse(data) : data;
  return parsed
    .filter((row) => row.Segment === "Equity" && row.Status === "Active")
    .map((row) => ({
      bseCode: row.SCRIP_CD,
      symbol: (row.scrip_id || "").toUpperCase(),
      name: row.Scrip_Name || row.Issuer_Name,
      isin: row.ISIN_NUMBER,
    }));
}

function mergeMasters(nseRecords, bseRecords) {
  const byIsin = new Map();
  const bySymbol = new Map();

  for (const nse of nseRecords) {
    const record = {
      symbol: nse.symbol,
      name: nse.name,
      isin: nse.isin,
      bse: null,
    };
    byIsin.set(nse.isin, record);
    bySymbol.set(nse.symbol, record);
  }

  for (const bse of bseRecords) {
    if (!bse.isin) continue;
    const existing = byIsin.get(bse.isin);
    if (existing) {
      existing.bse = bse.bseCode;
      continue;
    }

    const symbol = bse.symbol || `BSE${bse.bseCode}`;
    if (bySymbol.has(symbol)) {
      const conflict = bySymbol.get(symbol);
      if (!conflict.bse) conflict.bse = bse.bseCode;
      continue;
    }

    const record = {
      symbol,
      name: bse.name,
      isin: bse.isin,
      bse: bse.bseCode,
    };
    byIsin.set(bse.isin, record);
    bySymbol.set(symbol, record);
  }

  return Array.from(byIsin.values()).sort((a, b) =>
    a.symbol.localeCompare(b.symbol)
  );
}

function toCompact(records) {
  return records.map((record) => [
    record.symbol,
    record.bse,
    record.name,
    record.isin,
  ]);
}

async function main() {
  console.log("Fetching NSE master...");
  const nseRecords = await loadNseCsv();
  console.log(`NSE EQ listings: ${nseRecords.length}`);

  console.log("Fetching BSE master...");
  const bseRecords = await loadBseJson();
  console.log(`BSE equity listings: ${bseRecords.length}`);

  const merged = mergeMasters(nseRecords, bseRecords);
  console.log(`Merged universe: ${merged.length}`);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(toCompact(merged)));

  console.log(`Wrote ${outPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
