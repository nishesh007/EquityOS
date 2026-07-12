/**
 * Validates company search against required symbol examples.
 * Usage: node scripts/validate-search.mjs
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const EXAMPLES = [
  "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK", "SBIN", "LT", "LTIM",
  "PERSISTENT", "COFORGE", "KPITTECH", "TATAELXSI", "VEDL", "NMDC", "HAL",
  "BEL", "RVNL", "IRFC", "IREDA", "NTPC", "POWERGRID", "ONGC", "IOC", "BPCL",
  "COALINDIA", "BHEL", "DLF", "LODHA", "ABB", "SIEMENS", "CGPOWER", "SUNPHARMA",
  "DIVISLAB", "PIDILITE", "ULTRACEMCO", "GRASIM", "MARUTI", "M&M", "BAJFINANCE",
  "INDHOTEL", "LEMONTREE", "BRIGADE", "VEDANTA", "KPIT",
];

const runnerPath = path.join(root, ".tmp-validate-search.ts");
fs.writeFileSync(
  runnerPath,
  `import { searchCompanies, preloadCompanySearch } from "./lib/company-master/search.ts";
preloadCompanySearch();
const examples = ${JSON.stringify(EXAMPLES)};
const missing = examples.filter((q) => searchCompanies(q, 1).length === 0);
if (missing.length) {
  console.error("Missing search results:", missing.join(", "));
  process.exit(1);
}
console.log(\`Search OK for \${examples.length} example symbols\`);
`
);

try {
  execSync(`npx tsx ${runnerPath}`, { cwd: root, stdio: "inherit" });
} finally {
  fs.unlinkSync(runnerPath);
}
