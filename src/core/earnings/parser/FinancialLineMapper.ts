/**
 * Vendor alias mapper — maps heterogeneous line labels to canonical keys.
 */

export type CanonicalLineKey =
  | "revenue"
  | "otherIncome"
  | "operatingExpenses"
  | "ebitda"
  | "depreciation"
  | "ebit"
  | "financeCost"
  | "pbt"
  | "tax"
  | "pat"
  | "minorityInterest"
  | "eps"
  | "dilutedEps"
  | "totalAssets"
  | "currentAssets"
  | "nonCurrentAssets"
  | "cash"
  | "investments"
  | "inventory"
  | "receivables"
  | "fixedAssets"
  | "cwip"
  | "intangibleAssets"
  | "currentLiabilities"
  | "nonCurrentLiabilities"
  | "debt"
  | "leaseLiabilities"
  | "tradePayables"
  | "totalLiabilities"
  | "shareCapital"
  | "reserves"
  | "netWorth"
  | "bookValue"
  | "sharesOutstanding"
  | "operatingCashFlow"
  | "investingCashFlow"
  | "financingCashFlow"
  | "capex"
  | "dividendPaid"
  | "freeCashFlow"
  | "netCashChange"
  | "openingCash"
  | "closingCash";

const ALIAS_TABLE: Record<CanonicalLineKey, string[]> = {
  revenue: [
    "revenue",
    "sales",
    "income",
    "net sales",
    "netsales",
    "operating revenue",
    "operatingrevenue",
    "business income",
    "businessincome",
    "total revenue",
    "totalrevenue",
    "turnover",
    "netrevenue",
  ],
  otherIncome: ["other income", "otherincome", "other income net", "non operating income"],
  operatingExpenses: [
    "operating expenses",
    "operatingexpenses",
    "opex",
    "total operating expenses",
    "operating costs",
  ],
  ebitda: ["ebitda", "operating profit before da", "opbdita"],
  depreciation: [
    "depreciation",
    "depreciation and amortisation",
    "depreciation and amortization",
    "da",
    "d&a",
  ],
  ebit: ["ebit", "operating profit", "operating income", "operatingprofit"],
  financeCost: [
    "finance cost",
    "financecost",
    "interest expense",
    "interest",
    "finance costs",
    "interest cost",
  ],
  pbt: ["pbt", "profit before tax", "profitbeforetax", "pre tax profit", "earnings before tax"],
  tax: ["tax", "tax expense", "income tax", "provision for tax", "taxes"],
  pat: [
    "pat",
    "profit after tax",
    "net profit",
    "netprofit",
    "net income",
    "netincome",
    "profit after tax attributable",
  ],
  minorityInterest: [
    "minority interest",
    "minorityinterest",
    "nci",
    "non controlling interest",
  ],
  eps: ["eps", "earnings per share", "basic eps", "basiceps"],
  dilutedEps: ["diluted eps", "dilutedeps", "diluted earnings per share"],
  totalAssets: ["total assets", "totalassets", "assets"],
  currentAssets: ["current assets", "currentassets"],
  nonCurrentAssets: [
    "non current assets",
    "noncurrentassets",
    "non-current assets",
    "fixed and non current assets",
  ],
  cash: [
    "cash",
    "cash and cash equivalents",
    "cashandcashequivalents",
    "cash and bank",
    "cashandbank",
  ],
  investments: ["investments", "current investments", "non current investments"],
  inventory: ["inventory", "inventories", "stock"],
  receivables: [
    "receivables",
    "trade receivables",
    "tradereceivables",
    "accounts receivable",
    "debtors",
  ],
  fixedAssets: [
    "fixed assets",
    "fixedassets",
    "ppe",
    "property plant and equipment",
    "tangible assets",
  ],
  cwip: ["cwip", "capital work in progress", "capitalworkinprogress"],
  intangibleAssets: ["intangible assets", "intangibleassets", "intangibles", "goodwill"],
  currentLiabilities: ["current liabilities", "currentliabilities"],
  nonCurrentLiabilities: [
    "non current liabilities",
    "noncurrentliabilities",
    "non-current liabilities",
  ],
  debt: [
    "debt",
    "total debt",
    "totaldebt",
    "borrowings",
    "total borrowings",
    "long term borrowings",
    "short term borrowings",
  ],
  leaseLiabilities: ["lease liabilities", "leaseliabilities", "lease liability"],
  tradePayables: [
    "trade payables",
    "tradepayables",
    "accounts payable",
    "payables",
    "creditors",
  ],
  totalLiabilities: ["total liabilities", "totalliabilities", "liabilities"],
  shareCapital: ["share capital", "sharecapital", "equity share capital", "paid up capital"],
  reserves: ["reserves", "reserves and surplus", "other equity", "retained earnings"],
  netWorth: [
    "net worth",
    "networth",
    "shareholders equity",
    "shareholdersequity",
    "total equity",
    "totalequity",
    "equity",
  ],
  bookValue: ["book value", "bookvalue", "book value per share", "bvps"],
  sharesOutstanding: [
    "shares outstanding",
    "sharesoutstanding",
    "number of shares",
    "weighted average shares",
  ],
  operatingCashFlow: [
    "operating cash flow",
    "operatingcashflow",
    "cash from operations",
    "cashfromoperations",
    "cfo",
    "operating",
    "net cash from operating activities",
  ],
  investingCashFlow: [
    "investing cash flow",
    "investingcashflow",
    "cash from investing",
    "cfi",
    "investing",
    "net cash from investing activities",
  ],
  financingCashFlow: [
    "financing cash flow",
    "financingcashflow",
    "cash from financing",
    "cff",
    "financing",
    "net cash from financing activities",
  ],
  capex: [
    "capex",
    "capital expenditure",
    "capitalexpenditure",
    "purchase of fixed assets",
    "capex outflow",
  ],
  dividendPaid: ["dividend", "dividends", "dividend paid", "dividendpaid", "dividends paid"],
  freeCashFlow: ["free cash flow", "freecashflow", "fcf"],
  netCashChange: [
    "net cash change",
    "netcashchange",
    "net increase in cash",
    "increase decrease in cash",
    "net change in cash",
  ],
  openingCash: ["opening cash", "openingcash", "cash at beginning", "beginning cash"],
  closingCash: ["closing cash", "closingcash", "cash at end", "ending cash"],
};

const reverseIndex = new Map<string, CanonicalLineKey>();

for (const [canonical, aliases] of Object.entries(ALIAS_TABLE) as Array<
  [CanonicalLineKey, string[]]
>) {
  reverseIndex.set(normalizeLabel(canonical), canonical);
  for (const alias of aliases) {
    reverseIndex.set(normalizeLabel(alias), canonical);
  }
}

export class FinancialLineMapper {
  mapLabel(label: string): CanonicalLineKey | null {
    if (!label || typeof label !== "string") return null;
    return reverseIndex.get(normalizeLabel(label)) ?? null;
  }

  mapObject(raw: Record<string, unknown>): Partial<Record<CanonicalLineKey, unknown>> {
    const out: Partial<Record<CanonicalLineKey, unknown>> = {};
    for (const [key, value] of Object.entries(raw)) {
      const canonical = this.mapLabel(key);
      if (!canonical) continue;
      if (out[canonical] === undefined) {
        out[canonical] = value;
      }
    }
    return out;
  }

  mapRows(
    rows: Array<{ label?: string; name?: string; key?: string; value?: unknown } | Record<string, unknown>>
  ): Partial<Record<CanonicalLineKey, unknown>> {
    const out: Partial<Record<CanonicalLineKey, unknown>> = {};
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const label =
        (typeof row.label === "string" && row.label) ||
        (typeof row.name === "string" && row.name) ||
        (typeof row.key === "string" && row.key) ||
        null;
      if (!label) continue;
      const canonical = this.mapLabel(label);
      if (!canonical) continue;
      const value = "value" in row ? row.value : undefined;
      if (out[canonical] === undefined && value !== undefined) {
        out[canonical] = value;
      }
    }
    return out;
  }

  listAliases(key: CanonicalLineKey): string[] {
    return [...(ALIAS_TABLE[key] ?? [])];
  }

  listCanonicalKeys(): CanonicalLineKey[] {
    return Object.keys(ALIAS_TABLE) as CanonicalLineKey[];
  }
}

function normalizeLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[_./-]+/g, " ")
    .replace(/\s+/g, " ");
}
