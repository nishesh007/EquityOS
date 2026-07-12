/**
 * Sprint 9D — AI Screener filter registry generator.
 * AI Screener — produces 200+ filters across 9 categories.
 */

import type {
  FilterCategory,
  FilterDefinition,
  FilterOperator,
  FilterValueType,
} from "@/lib/screener/types";

type BaseFilter = {
  key: string;
  label: string;
  category: FilterCategory;
  valueType: FilterValueType;
  tier?: "fast" | "standard" | "deep";
  higherIsBetter?: boolean;
  operators?: FilterOperator[];
  period?: string;
};

const PERIODS = ["TTM", "1Y", "3Y", "5Y", "10Y", "QoQ", "YoY"] as const;
const EMA_PERIODS = [9, 12, 20, 26, 50, 100, 200] as const;
const SMA_PERIODS = [10, 20, 50, 100, 200] as const;
const RSI_PERIODS = [7, 14, 21] as const;

function numericFilter(
  base: BaseFilter,
  operators: FilterOperator[] = ["gt", "lt", "eq", "gte", "lte", "between"]
): FilterDefinition {
  return {
    ...base,
    tier: base.tier ?? "standard",
    operators,
  };
}

function textFilter(base: BaseFilter): FilterDefinition {
  return {
    ...base,
    tier: base.tier ?? "fast",
    operators: base.operators ?? ["eq", "contains", "starts_with", "ends_with"],
  };
}

function withPeriods(
  base: Omit<BaseFilter, "key" | "label"> & { baseKey: string; baseLabel: string },
  periods: readonly string[] = PERIODS
): FilterDefinition[] {
  return periods.map((period) =>
    numericFilter({
      key: `${base.baseKey}_${period.toLowerCase()}`,
      label: `${base.baseLabel} (${period})`,
      category: base.category,
      valueType: base.valueType,
      tier: base.tier,
      higherIsBetter: base.higherIsBetter,
      period,
    })
  );
}

/** Core filter definitions — expanded programmatically to 200+. */
const BASE_FILTERS: FilterDefinition[] = [
  // ── PRICE ──
  numericFilter({ key: "cmp", label: "CMP", category: "price", valueType: "currency", tier: "fast" }),
  numericFilter({ key: "market_cap", label: "Market Cap", category: "price", valueType: "currency", tier: "fast" }),
  numericFilter({ key: "enterprise_value", label: "Enterprise Value", category: "price", valueType: "currency", tier: "standard" }),
  numericFilter({ key: "week_high_52", label: "52 Week High", category: "price", valueType: "currency", tier: "fast" }),
  numericFilter({ key: "week_low_52", label: "52 Week Low", category: "price", valueType: "currency", tier: "fast" }),
  numericFilter({ key: "ath_distance", label: "ATH Distance", category: "price", valueType: "percent", tier: "standard", higherIsBetter: true }),
  numericFilter({ key: "volume", label: "Volume", category: "price", valueType: "number", tier: "fast" }),
  numericFilter({ key: "delivery_percent", label: "Delivery %", category: "price", valueType: "percent", tier: "fast" }),
  numericFilter({ key: "gap_percent", label: "Gap %", category: "price", valueType: "percent", tier: "fast" }),
  numericFilter({ key: "vwap", label: "VWAP", category: "price", valueType: "currency", tier: "standard" }),
  numericFilter({ key: "atr", label: "ATR", category: "price", valueType: "number", tier: "standard" }),
  numericFilter({ key: "beta", label: "Beta", category: "price", valueType: "ratio", tier: "standard" }),
  numericFilter({ key: "change_percent", label: "Change %", category: "price", valueType: "percent", tier: "fast" }),
  numericFilter({ key: "open", label: "Open", category: "price", valueType: "currency", tier: "fast" }),
  numericFilter({ key: "high", label: "Day High", category: "price", valueType: "currency", tier: "fast" }),
  numericFilter({ key: "low", label: "Day Low", category: "price", valueType: "currency", tier: "fast" }),
  numericFilter({ key: "prev_close", label: "Previous Close", category: "price", valueType: "currency", tier: "fast" }),
  numericFilter({ key: "price_to_52w_high", label: "% from 52W High", category: "price", valueType: "percent", tier: "fast", higherIsBetter: true }),
  numericFilter({ key: "price_to_52w_low", label: "% from 52W Low", category: "price", valueType: "percent", tier: "fast" }),
  numericFilter({ key: "avg_volume_20d", label: "Avg Volume (20D)", category: "price", valueType: "number", tier: "standard" }),
  numericFilter({ key: "volume_ratio", label: "Volume Ratio", category: "price", valueType: "ratio", tier: "standard" }),

  // ── VALUATION ──
  numericFilter({ key: "pe", label: "P/E", category: "valuation", valueType: "ratio", higherIsBetter: false }),
  numericFilter({ key: "forward_pe", label: "Forward P/E", category: "valuation", valueType: "ratio", higherIsBetter: false }),
  numericFilter({ key: "peg", label: "PEG", category: "valuation", valueType: "ratio", higherIsBetter: false }),
  numericFilter({ key: "pb", label: "P/B", category: "valuation", valueType: "ratio", higherIsBetter: false }),
  numericFilter({ key: "ps", label: "P/S", category: "valuation", valueType: "ratio", higherIsBetter: false }),
  numericFilter({ key: "ev_ebitda", label: "EV/EBITDA", category: "valuation", valueType: "ratio", higherIsBetter: false }),
  numericFilter({ key: "dividend_yield", label: "Dividend Yield", category: "valuation", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "intrinsic_value", label: "Intrinsic Value", category: "valuation", valueType: "currency", tier: "deep" }),
  numericFilter({ key: "margin_of_safety", label: "Margin of Safety", category: "valuation", valueType: "percent", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "expected_cagr", label: "Expected CAGR", category: "valuation", valueType: "percent", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "book_value", label: "Book Value", category: "valuation", valueType: "currency" }),
  numericFilter({ key: "price_to_intrinsic", label: "Price / Intrinsic", category: "valuation", valueType: "ratio", tier: "deep", higherIsBetter: false }),
  numericFilter({ key: "earnings_yield", label: "Earnings Yield", category: "valuation", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "fcf_yield", label: "FCF Yield", category: "valuation", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "ev_sales", label: "EV/Sales", category: "valuation", valueType: "ratio", higherIsBetter: false }),
  numericFilter({ key: "sector_pe_premium", label: "Sector P/E Premium", category: "valuation", valueType: "percent", tier: "deep" }),
  numericFilter({ key: "sector_pb_premium", label: "Sector P/B Premium", category: "valuation", valueType: "percent", tier: "deep" }),

  // ── GROWTH ──
  numericFilter({ key: "revenue_growth", label: "Revenue Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "revenue_cagr", label: "Revenue CAGR", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "profit_growth", label: "Profit Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "pat_cagr", label: "PAT CAGR", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "eps_growth", label: "EPS Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "sales_growth", label: "Sales Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "quarterly_growth", label: "Quarterly Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "growth_5y", label: "5Y Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "growth_10y", label: "10Y Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "ocf_growth", label: "OCF Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "fcf_growth", label: "FCF Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "ebitda_growth", label: "EBITDA Growth", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "revenue_qoq", label: "Revenue QoQ", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "revenue_yoy", label: "Revenue YoY", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "profit_qoq", label: "Profit QoQ", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "profit_yoy", label: "Profit YoY", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "eps_qoq", label: "EPS QoQ", category: "growth", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "eps_yoy", label: "EPS YoY", category: "growth", valueType: "percent", higherIsBetter: true }),

  // ── PROFITABILITY ──
  numericFilter({ key: "roe", label: "ROE", category: "profitability", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "roce", label: "ROCE", category: "profitability", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "roa", label: "ROA", category: "profitability", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "gross_margin", label: "Gross Margin", category: "profitability", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "operating_margin", label: "Operating Margin", category: "profitability", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "net_margin", label: "Net Margin", category: "profitability", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "ebitda_margin", label: "EBITDA Margin", category: "profitability", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "fcf_margin", label: "FCF Margin", category: "profitability", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "eps", label: "EPS", category: "profitability", valueType: "number", higherIsBetter: true }),
  numericFilter({ key: "diluted_eps", label: "Diluted EPS", category: "profitability", valueType: "number", higherIsBetter: true }),

  // ── FINANCIAL STRENGTH ──
  numericFilter({ key: "debt_equity", label: "Debt/Equity", category: "financial_strength", valueType: "ratio", higherIsBetter: false }),
  numericFilter({ key: "current_ratio", label: "Current Ratio", category: "financial_strength", valueType: "ratio", higherIsBetter: true }),
  numericFilter({ key: "quick_ratio", label: "Quick Ratio", category: "financial_strength", valueType: "ratio", higherIsBetter: true }),
  numericFilter({ key: "interest_coverage", label: "Interest Coverage", category: "financial_strength", valueType: "ratio", higherIsBetter: true }),
  numericFilter({ key: "cash_conversion", label: "Cash Conversion", category: "financial_strength", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "fcf", label: "FCF", category: "financial_strength", valueType: "currency", higherIsBetter: true }),
  numericFilter({ key: "working_capital", label: "Working Capital", category: "financial_strength", valueType: "currency", higherIsBetter: true }),
  numericFilter({ key: "altman_z", label: "Altman Z", category: "financial_strength", valueType: "number", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "piotroski", label: "Piotroski", category: "financial_strength", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "beneish", label: "Beneish", category: "financial_strength", valueType: "number", tier: "deep", higherIsBetter: false }),
  numericFilter({ key: "debt_to_assets", label: "Debt/Assets", category: "financial_strength", valueType: "ratio", higherIsBetter: false }),
  numericFilter({ key: "net_debt_ebitda", label: "Net Debt/EBITDA", category: "financial_strength", valueType: "ratio", higherIsBetter: false }),

  // ── SHAREHOLDING ──
  numericFilter({ key: "promoter_holding", label: "Promoter Holding", category: "shareholding", valueType: "percent", higherIsBetter: true }),
  numericFilter({ key: "promoter_change", label: "Promoter Change", category: "shareholding", valueType: "percent" }),
  numericFilter({ key: "fii_holding", label: "FII Holding", category: "shareholding", valueType: "percent" }),
  numericFilter({ key: "fii_change", label: "FII Change", category: "shareholding", valueType: "percent" }),
  numericFilter({ key: "dii_holding", label: "DII Holding", category: "shareholding", valueType: "percent" }),
  numericFilter({ key: "dii_change", label: "DII Change", category: "shareholding", valueType: "percent" }),
  numericFilter({ key: "public_holding", label: "Public Holding", category: "shareholding", valueType: "percent" }),
  numericFilter({ key: "pledge_percent", label: "Pledge %", category: "shareholding", valueType: "percent", higherIsBetter: false }),
  numericFilter({ key: "institutional_holding", label: "Institutional Holding", category: "shareholding", valueType: "percent" }),

  // ── TECHNICAL ──
  numericFilter({ key: "rsi", label: "RSI (14)", category: "technical", valueType: "number", tier: "deep" }),
  numericFilter({ key: "macd", label: "MACD", category: "technical", valueType: "number", tier: "deep" }),
  numericFilter({ key: "macd_histogram", label: "MACD Histogram", category: "technical", valueType: "number", tier: "deep" }),
  numericFilter({ key: "ema20", label: "EMA 20", category: "technical", valueType: "currency", tier: "deep" }),
  numericFilter({ key: "ema50", label: "EMA 50", category: "technical", valueType: "currency", tier: "deep" }),
  numericFilter({ key: "ema200", label: "EMA 200", category: "technical", valueType: "currency", tier: "deep" }),
  numericFilter({ key: "adx", label: "ADX", category: "technical", valueType: "number", tier: "deep" }),
  numericFilter({ key: "supertrend", label: "Supertrend", category: "technical", valueType: "currency", tier: "deep" }),
  numericFilter({ key: "momentum", label: "Momentum", category: "technical", valueType: "number", tier: "deep" }),
  numericFilter({ key: "relative_strength", label: "Relative Strength", category: "technical", valueType: "number", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "trend_score", label: "Trend Score", category: "technical", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "support", label: "Support", category: "technical", valueType: "currency", tier: "deep" }),
  numericFilter({ key: "resistance", label: "Resistance", category: "technical", valueType: "currency", tier: "deep" }),
  numericFilter({ key: "price_above_ema20", label: "Price above EMA20", category: "technical", valueType: "percent", tier: "deep" }),
  numericFilter({ key: "price_above_ema50", label: "Price above EMA50", category: "technical", valueType: "percent", tier: "deep" }),
  numericFilter({ key: "price_above_ema200", label: "Price above EMA200", category: "technical", valueType: "percent", tier: "deep" }),
  numericFilter({ key: "volatility", label: "Volatility", category: "technical", valueType: "percent", tier: "deep" }),
  numericFilter({ key: "week52_momentum", label: "52W Momentum", category: "technical", valueType: "percent", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "bollinger_width", label: "Bollinger Width", category: "technical", valueType: "percent", tier: "deep" }),

  // ── QUALITY ──
  numericFilter({ key: "business_quality", label: "Business Quality", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "management_quality", label: "Management Quality", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "capital_allocation", label: "Capital Allocation", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "moat", label: "Moat", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "corporate_governance", label: "Corporate Governance", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "financial_strength_score", label: "Financial Strength", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "quality_score", label: "Quality Score", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "profitability_score", label: "Profitability Score", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "growth_score", label: "Growth Score", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "valuation_score", label: "Valuation Score", category: "quality", valueType: "score", tier: "deep", higherIsBetter: true }),

  // ── AI FILTERS ──
  numericFilter({ key: "ai_rating", label: "AI Rating", category: "ai", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "decision_score", label: "Decision Score", category: "ai", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "risk_score", label: "Risk Score", category: "ai", valueType: "score", tier: "deep", higherIsBetter: false }),
  numericFilter({ key: "portfolio_score", label: "Portfolio Score", category: "ai", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "confidence_score", label: "Confidence Score", category: "ai", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "overall_score", label: "Overall Score", category: "ai", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "momentum_score", label: "Momentum Score", category: "ai", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "fundamental_score", label: "Fundamental Score", category: "ai", valueType: "score", tier: "deep", higherIsBetter: true }),
  numericFilter({ key: "red_flag_count", label: "Red Flag Count", category: "ai", valueType: "number", tier: "deep", higherIsBetter: false }),
  numericFilter({ key: "research_confidence", label: "Research Confidence", category: "ai", valueType: "score", tier: "deep", higherIsBetter: true }),

  // ── METADATA ──
  textFilter({ key: "sector", label: "Sector", category: "metadata", valueType: "text", tier: "fast" }),
  textFilter({ key: "industry", label: "Industry", category: "metadata", valueType: "text", tier: "fast" }),
  textFilter({ key: "symbol", label: "Symbol", category: "metadata", valueType: "text", tier: "fast" }),
  textFilter({ key: "name", label: "Company Name", category: "metadata", valueType: "text", tier: "fast" }),
  textFilter({ key: "exchange", label: "Exchange", category: "metadata", valueType: "text", tier: "fast" }),
];

/** Period-expanded growth filters */
const PERIOD_GROWTH_FILTERS = withPeriods({
  baseKey: "revenue_growth",
  baseLabel: "Revenue Growth",
  category: "growth",
  valueType: "percent",
  higherIsBetter: true,
});

const PERIOD_PROFIT_FILTERS = withPeriods({
  baseKey: "profit_growth",
  baseLabel: "Profit Growth",
  category: "growth",
  valueType: "percent",
  higherIsBetter: true,
});

const PERIOD_EPS_FILTERS = withPeriods({
  baseKey: "eps_growth",
  baseLabel: "EPS Growth",
  category: "growth",
  valueType: "percent",
  higherIsBetter: true,
});

/** EMA period variants */
const EMA_FILTERS: FilterDefinition[] = EMA_PERIODS.map((period) =>
  numericFilter({
    key: `ema_${period}`,
    label: `EMA ${period}`,
    category: "technical",
    valueType: "currency",
    tier: "deep",
  })
);

/** SMA period variants */
const SMA_FILTERS: FilterDefinition[] = SMA_PERIODS.map((period) =>
  numericFilter({
    key: `sma_${period}`,
    label: `SMA ${period}`,
    category: "technical",
    valueType: "currency",
    tier: "deep",
  })
);

/** RSI period variants */
const RSI_FILTERS: FilterDefinition[] = RSI_PERIODS.map((period) =>
  numericFilter({
    key: `rsi_${period}`,
    label: `RSI (${period})`,
    category: "technical",
    valueType: "number",
    tier: "deep",
  })
);

/** Profitability period variants */
const ROE_PERIOD_FILTERS = withPeriods({
  baseKey: "roe",
  baseLabel: "ROE",
  category: "profitability",
  valueType: "percent",
  higherIsBetter: true,
  tier: "standard",
}, ["TTM", "3Y", "5Y"]);

const ROCE_PERIOD_FILTERS = withPeriods({
  baseKey: "roce",
  baseLabel: "ROCE",
  category: "profitability",
  valueType: "percent",
  higherIsBetter: true,
  tier: "standard",
}, ["TTM", "3Y", "5Y"]);

/** Valuation period variants */
const PE_PERIOD_FILTERS = withPeriods({
  baseKey: "pe",
  baseLabel: "P/E",
  category: "valuation",
  valueType: "ratio",
  higherIsBetter: false,
  tier: "standard",
}, ["TTM", "Forward", "3Y Avg", "5Y Avg"]);

const PB_PERIOD_FILTERS = withPeriods({
  baseKey: "pb",
  baseLabel: "P/B",
  category: "valuation",
  valueType: "ratio",
  higherIsBetter: false,
  tier: "standard",
}, ["TTM", "3Y Avg", "5Y Avg"]);

/** Price distance from moving averages */
const PRICE_VS_MA_FILTERS: FilterDefinition[] = [
  ...EMA_PERIODS.map((period) =>
    numericFilter({
      key: `price_vs_ema_${period}`,
      label: `Price vs EMA ${period} %`,
      category: "technical",
      valueType: "percent",
      tier: "deep",
    })
  ),
  ...SMA_PERIODS.map((period) =>
    numericFilter({
      key: `price_vs_sma_${period}`,
      label: `Price vs SMA ${period} %`,
      category: "technical",
      valueType: "percent",
      tier: "deep",
    })
  ),
];

/** Margin period variants */
const MARGIN_PERIOD_FILTERS = ["gross_margin", "operating_margin", "net_margin", "ebitda_margin"].flatMap(
  (key) =>
    withPeriods(
      {
        baseKey: key,
        baseLabel: key.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        category: "profitability",
        valueType: "percent",
        higherIsBetter: true,
        tier: "standard",
      },
      ["TTM", "3Y Avg", "5Y Avg"]
    )
);

/** Combine all filters, deduplicate by key */
function dedupeFilters(filters: FilterDefinition[]): FilterDefinition[] {
  const seen = new Map<string, FilterDefinition>();
  for (const filter of filters) {
    if (!seen.has(filter.key)) {
      seen.set(filter.key, filter);
    }
  }
  return Array.from(seen.values());
}

export const SCREENER_FILTER_REGISTRY: FilterDefinition[] = dedupeFilters([
  ...BASE_FILTERS,
  ...PERIOD_GROWTH_FILTERS,
  ...PERIOD_PROFIT_FILTERS,
  ...PERIOD_EPS_FILTERS,
  ...EMA_FILTERS,
  ...SMA_FILTERS,
  ...RSI_FILTERS,
  ...ROE_PERIOD_FILTERS,
  ...ROCE_PERIOD_FILTERS,
  ...PE_PERIOD_FILTERS,
  ...PB_PERIOD_FILTERS,
  ...PRICE_VS_MA_FILTERS,
  ...MARGIN_PERIOD_FILTERS,
]);

export const FILTER_REGISTRY_BY_KEY = new Map(
  SCREENER_FILTER_REGISTRY.map((f) => [f.key, f])
);

export const FILTER_REGISTRY_BY_CATEGORY = SCREENER_FILTER_REGISTRY.reduce<
  Record<string, FilterDefinition[]>
>((acc, filter) => {
  if (!acc[filter.category]) acc[filter.category] = [];
  acc[filter.category].push(filter);
  return acc;
}, {});

export function getFilterDefinition(key: string): FilterDefinition | undefined {
  return FILTER_REGISTRY_BY_KEY.get(key);
}

export function getFiltersByCategory(category: FilterCategory): FilterDefinition[] {
  return FILTER_REGISTRY_BY_CATEGORY[category] ?? [];
}

export function getFilterCount(): number {
  return SCREENER_FILTER_REGISTRY.length;
}

export function lookupFilter(key: string): FilterDefinition {
  const filter = FILTER_REGISTRY_BY_KEY.get(key);
  if (!filter) throw new Error(`Unknown filter key: ${key}`);
  return filter;
}
