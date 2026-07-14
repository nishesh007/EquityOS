/**
 * Earnings aggregator — unified access to latest / prior / YoY / TTM / history views.
 */

import type {
  NormalizedFinancialMetrics,
  NormalizedPeriodRecord,
} from "./EarningsNormalizer";

export type AggregationView =
  | "latest_quarter"
  | "previous_quarter"
  | "same_quarter_last_year"
  | "ttm"
  | "history_3y"
  | "history_5y"
  | "complete";

export interface AggregatedEarningsView {
  view: AggregationView;
  symbol: string;
  records: NormalizedPeriodRecord[];
  ttm?: NormalizedFinancialMetrics;
  asOf: string;
}

const TTM_SUM_KEYS: Array<keyof NormalizedFinancialMetrics> = [
  "revenue",
  "otherIncome",
  "ebitda",
  "ebit",
  "pbt",
  "pat",
  "operatingCashFlow",
  "freeCashFlow",
];

export class EarningsAggregator {
  aggregate(
    records: NormalizedPeriodRecord[],
    view: AggregationView,
    symbol?: string
  ): AggregatedEarningsView {
    const filtered = sortRecords(
      records.filter((r) => (symbol ? r.metadata.symbol === symbol : true))
    );
    const resolvedSymbol =
      symbol ?? filtered[0]?.metadata.symbol ?? "";
    const asOf = new Date().toISOString();

    switch (view) {
      case "latest_quarter":
        return {
          view,
          symbol: resolvedSymbol,
          records: pickLatestQuarter(filtered),
          asOf,
        };
      case "previous_quarter":
        return {
          view,
          symbol: resolvedSymbol,
          records: pickPreviousQuarter(filtered),
          asOf,
        };
      case "same_quarter_last_year":
        return {
          view,
          symbol: resolvedSymbol,
          records: pickSameQuarterLastYear(filtered),
          asOf,
        };
      case "ttm": {
        const ttmRecords = pickTtmQuarters(filtered);
        return {
          view,
          symbol: resolvedSymbol,
          records: ttmRecords,
          ttm: sumMetrics(ttmRecords.map((r) => r.metrics)),
          asOf,
        };
      }
      case "history_3y":
        return {
          view,
          symbol: resolvedSymbol,
          records: filterHistoryYears(filtered, 3),
          asOf,
        };
      case "history_5y":
        return {
          view,
          symbol: resolvedSymbol,
          records: filterHistoryYears(filtered, 5),
          asOf,
        };
      case "complete":
      default:
        return {
          view: "complete",
          symbol: resolvedSymbol,
          records: filtered,
          asOf,
        };
    }
  }

  getFinancialHistory(
    records: NormalizedPeriodRecord[],
    options?: { symbol?: string; years?: number }
  ): NormalizedPeriodRecord[] {
    const view =
      options?.years === 3
        ? "history_3y"
        : options?.years === 5
          ? "history_5y"
          : "complete";
    return this.aggregate(records, view, options?.symbol).records;
  }
}

function sortRecords(
  records: NormalizedPeriodRecord[]
): NormalizedPeriodRecord[] {
  return [...records].sort((a, b) => comparePeriod(b, a));
}

function comparePeriod(
  a: NormalizedPeriodRecord,
  b: NormalizedPeriodRecord
): number {
  const ay = extractYear(a.financialYear) ?? 0;
  const by = extractYear(b.financialYear) ?? 0;
  if (ay !== by) return ay - by;
  const aq = quarterNum(a.quarter);
  const bq = quarterNum(b.quarter);
  return aq - bq;
}

function pickLatestQuarter(
  records: NormalizedPeriodRecord[]
): NormalizedPeriodRecord[] {
  const q = records.find((r) => r.periodType === "quarter");
  return q ? [q] : [];
}

function pickPreviousQuarter(
  records: NormalizedPeriodRecord[]
): NormalizedPeriodRecord[] {
  const quarters = records.filter((r) => r.periodType === "quarter");
  return quarters[1] ? [quarters[1]] : [];
}

function pickSameQuarterLastYear(
  records: NormalizedPeriodRecord[]
): NormalizedPeriodRecord[] {
  const latest = pickLatestQuarter(records)[0];
  if (!latest?.quarter) return [];
  const year = extractYear(latest.financialYear);
  if (year === null) return [];
  const targetFy = `FY${year - 1}`;
  const match = records.find(
    (r) =>
      r.periodType === "quarter" &&
      r.quarter === latest.quarter &&
      r.financialYear === targetFy
  );
  return match ? [match] : [];
}

function pickTtmQuarters(
  records: NormalizedPeriodRecord[]
): NormalizedPeriodRecord[] {
  return records.filter((r) => r.periodType === "quarter").slice(0, 4);
}

function filterHistoryYears(
  records: NormalizedPeriodRecord[],
  years: number
): NormalizedPeriodRecord[] {
  const yearsPresent = [
    ...new Set(
      records
        .map((r) => extractYear(r.financialYear))
        .filter((y): y is number => y !== null)
    ),
  ].sort((a, b) => b - a);
  const keep = new Set(yearsPresent.slice(0, years));
  return records.filter((r) => {
    const y = extractYear(r.financialYear);
    return y !== null && keep.has(y);
  });
}

function sumMetrics(
  metricsList: NormalizedFinancialMetrics[]
): NormalizedFinancialMetrics {
  const out: NormalizedFinancialMetrics = {};
  for (const key of TTM_SUM_KEYS) {
    let sum = 0;
    let count = 0;
    for (const m of metricsList) {
      const v = m[key];
      if (typeof v === "number" && Number.isFinite(v)) {
        sum += v;
        count += 1;
      }
    }
    if (count > 0) out[key] = round2(sum);
  }

  // EPS / diluted EPS: average of TTM quarters when present
  for (const key of ["eps", "dilutedEps"] as const) {
    let sum = 0;
    let count = 0;
    for (const m of metricsList) {
      const v = m[key];
      if (typeof v === "number" && Number.isFinite(v)) {
        sum += v;
        count += 1;
      }
    }
    if (count > 0) out[key] = round2(sum);
  }

  return out;
}

function extractYear(fy: string): number | null {
  const m = /^FY(\d{4})/.exec(fy);
  return m ? Number(m[1]) : null;
}

function quarterNum(q?: string): number {
  if (q === "Q1") return 1;
  if (q === "Q2") return 2;
  if (q === "Q3") return 3;
  if (q === "Q4") return 4;
  return 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
