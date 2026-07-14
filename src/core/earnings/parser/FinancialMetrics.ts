/**
 * Operational metrics + derived financial field computation.
 */

import type { ValueQualityFlag } from "./FinancialConfiguration";
import type { NormalizedStatementValues } from "./FinancialNormalizer";

export interface FinancialOperationalMetrics {
  parseRuns: number;
  incomeParsed: number;
  balanceParsed: number;
  cashFlowParsed: number;
  validations: number;
  validationFailures: number;
  derivedFieldsComputed: number;
  errors: number;
  averageRuntimeMs: number;
  lastParseAt: string | null;
}

export interface DerivedFinancialFields {
  ebitdaMargin?: number | null;
  operatingMargin?: number | null;
  netMargin?: number | null;
  netDebt?: number | null;
  workingCapital?: number | null;
  bookValuePerShare?: number | null;
  enterpriseDebt?: number | null;
  freeCashFlow?: number | null;
  cashConversion?: number | null;
  operatingCashConversion?: number | null;
  quality: Record<string, ValueQualityFlag>;
}

export class FinancialMetricsTracker {
  private parseRuns = 0;
  private incomeParsed = 0;
  private balanceParsed = 0;
  private cashFlowParsed = 0;
  private validations = 0;
  private validationFailures = 0;
  private derivedFieldsComputed = 0;
  private errors = 0;
  private runtimeSum = 0;
  private runtimeCount = 0;
  private lastParseAt: string | null = null;

  recordParse(runtimeMs: number): void {
    this.parseRuns += 1;
    this.runtimeSum += runtimeMs;
    this.runtimeCount += 1;
    this.lastParseAt = new Date().toISOString();
  }

  recordIncome(): void {
    this.incomeParsed += 1;
  }

  recordBalance(): void {
    this.balanceParsed += 1;
  }

  recordCashFlow(): void {
    this.cashFlowParsed += 1;
  }

  recordValidation(passed: boolean): void {
    this.validations += 1;
    if (!passed) this.validationFailures += 1;
  }

  recordDerived(count: number): void {
    this.derivedFieldsComputed += count;
  }

  recordError(): void {
    this.errors += 1;
  }

  getMetrics(): FinancialOperationalMetrics {
    return {
      parseRuns: this.parseRuns,
      incomeParsed: this.incomeParsed,
      balanceParsed: this.balanceParsed,
      cashFlowParsed: this.cashFlowParsed,
      validations: this.validations,
      validationFailures: this.validationFailures,
      derivedFieldsComputed: this.derivedFieldsComputed,
      errors: this.errors,
      averageRuntimeMs:
        this.runtimeCount === 0
          ? 0
          : round2(this.runtimeSum / this.runtimeCount),
      lastParseAt: this.lastParseAt,
    };
  }

  reset(): void {
    this.parseRuns = 0;
    this.incomeParsed = 0;
    this.balanceParsed = 0;
    this.cashFlowParsed = 0;
    this.validations = 0;
    this.validationFailures = 0;
    this.derivedFieldsComputed = 0;
    this.errors = 0;
    this.runtimeSum = 0;
    this.runtimeCount = 0;
    this.lastParseAt = null;
  }
}

export function computeDerivedFields(
  values: NormalizedStatementValues,
  precision = 2
): DerivedFinancialFields {
  const quality: Record<string, ValueQualityFlag> = {};
  const out: DerivedFinancialFields = { quality };

  const revenue = num(values.revenue);
  const ebitda = num(values.ebitda);
  const ebit = num(values.ebit);
  const pat = num(values.pat);
  const debt = num(values.debt);
  const cash = num(values.cash);
  const currentAssets = num(values.currentAssets);
  const currentLiabilities = num(values.currentLiabilities);
  const netWorth = num(values.netWorth);
  const bookValue = num(values.bookValue);
  const shares = num(values.sharesOutstanding);
  const lease = num(values.leaseLiabilities) ?? 0;
  const ocf = num(values.operatingCashFlow);
  const capex = num(values.capex);
  let fcf = num(values.freeCashFlow);

  if (revenue && revenue !== 0) {
    if (ebitda !== null) {
      out.ebitdaMargin = round2((ebitda / revenue) * 100, precision);
      quality.ebitdaMargin = "DerivedValue";
    }
    if (ebit !== null) {
      out.operatingMargin = round2((ebit / revenue) * 100, precision);
      quality.operatingMargin = "DerivedValue";
    }
    if (pat !== null) {
      out.netMargin = round2((pat / revenue) * 100, precision);
      quality.netMargin = "DerivedValue";
    }
  }

  if (debt !== null || cash !== null) {
    out.netDebt = round2((debt ?? 0) - (cash ?? 0), precision);
    quality.netDebt = "DerivedValue";
  }

  if (currentAssets !== null || currentLiabilities !== null) {
    out.workingCapital = round2(
      (currentAssets ?? 0) - (currentLiabilities ?? 0),
      precision
    );
    quality.workingCapital = "DerivedValue";
  }

  if (bookValue !== null && shares && shares !== 0) {
    out.bookValuePerShare = round2(bookValue / shares, precision);
    quality.bookValuePerShare = "DerivedValue";
  } else if (netWorth !== null && shares && shares !== 0) {
    out.bookValuePerShare = round2(netWorth / shares, precision);
    quality.bookValuePerShare = "DerivedValue";
  }

  if (debt !== null) {
    out.enterpriseDebt = round2(debt + lease, precision);
    quality.enterpriseDebt = "DerivedValue";
  }

  if (fcf === null && ocf !== null && capex !== null) {
    // Capex often negative outflow; use absolute subtraction of outflow
    fcf = round2(ocf - Math.abs(capex), precision);
    out.freeCashFlow = fcf;
    quality.freeCashFlow = "DerivedValue";
  } else if (fcf !== null) {
    out.freeCashFlow = fcf;
    quality.freeCashFlow = values.freeCashFlow != null ? "ReportedValue" : "DerivedValue";
  }

  if (ocf !== null && pat && pat !== 0) {
    out.operatingCashConversion = round2((ocf / pat) * 100, precision);
    quality.operatingCashConversion = "DerivedValue";
  }

  if (fcf !== null && pat && pat !== 0) {
    out.cashConversion = round2((fcf / pat) * 100, precision);
    quality.cashConversion = "DerivedValue";
  }

  return out;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function round2(n: number, precision = 2): number {
  const f = 10 ** precision;
  return Math.round(n * f) / f;
}
