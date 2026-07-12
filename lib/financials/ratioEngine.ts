/**
 * Institutional ratio engine — 50+ ratios computed from EquityOS fundamentals data.
 */

import { round } from "@/lib/engine/utils";
import { findStatementValue } from "@/lib/fundamentals/normalize";
import { mergeRatios, computeRatiosFromStatements } from "@/lib/fundamentals/ratios-engine";
import { normalizeScore, safeMetric } from "@/lib/fundamentals/registry";
import type {
  FinancialRatios,
  FinancialStatementPeriod,
  GrowthMetrics,
} from "@/lib/fundamentals/types";

export interface InstitutionalRatios {
  grossMargin: number | null;
  operatingMargin: number | null;
  ebitdaMargin: number | null;
  netMargin: number | null;
  pretaxMargin: number | null;
  roe: number | null;
  roce: number | null;
  roa: number | null;
  roic: number | null;
  eps: number | null;
  dividendPayoutRatio: number | null;
  earningsYield: number | null;
  currentRatio: number | null;
  quickRatio: number | null;
  cashRatio: number | null;
  workingCapital: number | null;
  netWorkingCapital: number | null;
  workingCapitalToSales: number | null;
  debtToEquity: number | null;
  debtToAssets: number | null;
  netDebtToEquity: number | null;
  longTermDebtToEquity: number | null;
  interestCoverage: number | null;
  equityRatio: number | null;
  financialLeverage: number | null;
  assetTurnover: number | null;
  inventoryTurnover: number | null;
  receivablesTurnover: number | null;
  payablesTurnover: number | null;
  fixedAssetTurnover: number | null;
  capitalTurnover: number | null;
  inventoryDays: number | null;
  debtorDays: number | null;
  creditorDays: number | null;
  cashConversionCycle: number | null;
  freeCashFlow: number | null;
  operatingCashFlow: number | null;
  fcfMargin: number | null;
  cfoToPat: number | null;
  cfoToRevenue: number | null;
  capexToRevenue: number | null;
  pe: number | null;
  forwardPe: number | null;
  pb: number | null;
  ps: number | null;
  evToEbitda: number | null;
  peg: number | null;
  dividendYield: number | null;
  evToSales: number | null;
  priceToFreeCashFlow: number | null;
  revenueGrowthYoY: number | null;
  profitGrowthYoY: number | null;
  epsGrowthYoY: number | null;
  revenueCagr3Y: number | null;
  revenueCagr5Y: number | null;
  revenueCagr10Y: number | null;
  profitCagr3Y: number | null;
  profitCagr5Y: number | null;
  profitCagr10Y: number | null;
  epsCagr3Y: number | null;
}

export interface RatioEngineInput {
  income: FinancialStatementPeriod[];
  balance: FinancialStatementPeriod[];
  cashflow: FinancialStatementPeriod[];
  bundleRatios: FinancialRatios;
  growth: GrowthMetrics;
  marketPrice?: number;
  revenueCagr10Y?: number | null;
  profitCagr10Y?: number | null;
  epsCagr3Y?: number | null;
  ttmRevenue?: number | null;
  ttmNetProfit?: number | null;
  ttmOperatingCashFlow?: number | null;
  ttmFreeCashFlow?: number | null;
}

function latestAnnual(
  periods: FinancialStatementPeriod[]
): FinancialStatementPeriod | undefined {
  return periods
    .filter((period) => period.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
}

function annualSeries(
  periods: FinancialStatementPeriod[],
  labels: string[]
): number[] {
  return periods
    .filter((period) => period.periodType === "annual")
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((period) => findStatementValue(period, ...labels));
}

function cagr(start: number, end: number, years: number): number | null {
  if (!start || !end || years <= 0 || start <= 0) return null;
  return round((Math.pow(end / start, 1 / years) - 1) * 100);
}

function cagrFromSeries(series: number[], years: number): number | null {
  if (series.length < 2) return null;
  const end = series.at(-1)!;
  const startIndex = Math.max(0, series.length - 1 - years);
  const start = series[startIndex] ?? series[0];
  const span = series.length - 1 - startIndex;
  return cagr(start, end, span > 0 ? span : years);
}

function turnoverDays(daysBase: number, turnover: number | null): number | null {
  if (turnover === null || turnover <= 0) return null;
  return round(daysBase / turnover, 1);
}

function toNullable(value: number | undefined): number | null {
  return value !== undefined && Number.isFinite(value) ? value : null;
}

export function computeInstitutionalRatios(
  input: RatioEngineInput
): InstitutionalRatios {
  const {
    income,
    balance,
    cashflow,
    bundleRatios,
    growth,
    marketPrice,
    revenueCagr10Y,
    profitCagr10Y,
    epsCagr3Y,
    ttmRevenue,
    ttmNetProfit,
    ttmOperatingCashFlow,
    ttmFreeCashFlow,
  } = input;

  const latestIncome = latestAnnual(income);
  const latestBalance = latestAnnual(balance);
  const latestCashflow = latestAnnual(cashflow);

  const statementRatios = computeRatiosFromStatements(
    income,
    balance,
    cashflow,
    marketPrice
  );
  const ratios = mergeRatios(mergeRatios(bundleRatios, statementRatios), {});

  const revenue = latestIncome
    ? findStatementValue(latestIncome, "revenue", "totalRevenue", "Revenue")
    : 0;
  const netIncome = latestIncome
    ? findStatementValue(latestIncome, "netIncome", "netProfit", "Net Income")
    : 0;
  const grossProfit = latestIncome
    ? findStatementValue(latestIncome, "grossProfit", "Gross Profit")
    : 0;
  const operatingIncome = latestIncome
    ? findStatementValue(latestIncome, "operatingIncome", "ebit", "EBIT", "ebitda", "EBITDA")
    : 0;
  const ebitda = latestIncome
    ? findStatementValue(latestIncome, "ebitda", "EBITDA", "operatingIncome", "ebit")
    : 0;
  const pretaxIncome = latestIncome
    ? findStatementValue(latestIncome, "incomeBeforeTax", "pretaxIncome", "Pretax Income")
    : 0;
  const eps = latestIncome
    ? findStatementValue(latestIncome, "eps", "EPS", "epsDiluted")
    : 0;

  const totalAssets = latestBalance
    ? findStatementValue(latestBalance, "totalAssets")
    : 0;
  const totalEquity = latestBalance
    ? findStatementValue(latestBalance, "totalEquity", "totalStockholdersEquity")
    : 0;
  const totalDebt = latestBalance
    ? findStatementValue(latestBalance, "totalDebt", "longTermDebt")
    : 0;
  const longTermDebt = latestBalance
    ? findStatementValue(latestBalance, "longTermDebt", "totalDebt")
    : 0;
  const currentAssets = latestBalance
    ? findStatementValue(latestBalance, "totalCurrentAssets")
    : 0;
  const currentLiabilities = latestBalance
    ? findStatementValue(latestBalance, "totalCurrentLiabilities")
    : 0;
  const cash = latestBalance
    ? findStatementValue(latestBalance, "cashAndCashEquivalents", "Cash")
    : 0;
  const inventory = latestBalance
    ? findStatementValue(latestBalance, "inventory", "Inventory")
    : 0;
  const receivables = latestBalance
    ? findStatementValue(latestBalance, "netReceivables", "accountsReceivable", "Receivables")
    : 0;
  const payables = latestBalance
    ? findStatementValue(latestBalance, "accountsPayable", "payables", "Payables")
    : 0;
  const fixedAssets = latestBalance
    ? findStatementValue(
        latestBalance,
        "propertyPlantEquipmentNet",
        "netPPE",
        "fixedAssets"
      )
    : 0;

  const operatingCashFlow = latestCashflow
    ? findStatementValue(
        latestCashflow,
        "operatingCashFlow",
        "netCashProvidedByOperatingActivities",
        "Operating Cash Flow"
      )
    : 0;
  const freeCashFlow = latestCashflow
    ? findStatementValue(latestCashflow, "freeCashFlow", "Free Cash Flow", "fcf")
    : 0;
  const capex = latestCashflow
    ? Math.abs(
        findStatementValue(
          latestCashflow,
          "capitalExpenditure",
          "Capital Expenditure",
          "investmentsInPropertyPlantAndEquipment"
        )
      )
    : 0;
  const dividends = latestCashflow
    ? Math.abs(
        findStatementValue(
          latestCashflow,
          "dividendsPaid",
          "Dividends Paid",
          "cashDividendsPaid"
        )
      )
    : 0;

  const grossMargin =
    safeMetric(ratios.grossMargin) ??
    (revenue > 0 && grossProfit !== 0 ? round((grossProfit / revenue) * 100, 1) : null);
  const operatingMargin =
    safeMetric(ratios.operatingMargin) ??
    (revenue > 0 && operatingIncome !== 0
      ? round((operatingIncome / revenue) * 100, 1)
      : null);
  const ebitdaMargin =
    revenue > 0 && ebitda !== 0 ? round((ebitda / revenue) * 100, 1) : null;
  const netMargin =
    safeMetric(ratios.netMargin) ??
    (revenue > 0 && netIncome !== 0 ? round((netIncome / revenue) * 100, 1) : null);
  const pretaxMargin =
    revenue > 0 && pretaxIncome !== 0
      ? round((pretaxIncome / revenue) * 100, 1)
      : null;

  const roe =
    safeMetric(ratios.roe) ??
    (totalEquity > 0 ? round((netIncome / totalEquity) * 100, 1) : null);
  const roa =
    safeMetric(ratios.roa) ??
    (totalAssets > 0 ? round((netIncome / totalAssets) * 100, 1) : null);

  const capitalEmployed = totalEquity + totalDebt - cash;
  const roce =
    safeMetric(ratios.roce) ??
    (capitalEmployed > 0 && operatingIncome !== 0
      ? round((operatingIncome / capitalEmployed) * 100, 1)
      : null);

  const investedCapital = totalEquity + totalDebt;
  const roic =
    investedCapital > 0 && operatingIncome !== 0
      ? round((operatingIncome / investedCapital) * 100, 1)
      : null;

  const quickAssets = currentAssets - inventory;
  const quickRatio =
    currentLiabilities > 0 ? round(quickAssets / currentLiabilities, 2) : null;
  const cashRatio =
    currentLiabilities > 0 ? round(cash / currentLiabilities, 2) : null;
  const workingCapital = currentAssets - currentLiabilities;
  const netWorkingCapital = workingCapital;
  const workingCapitalToSales =
    revenue > 0 ? round((workingCapital / revenue) * 100, 1) : null;

  const debtToEquity =
    safeMetric(ratios.debtToEquity) ??
    (totalEquity > 0 ? round(totalDebt / totalEquity, 2) : null);
  const debtToAssets =
    totalAssets > 0 ? round(totalDebt / totalAssets, 2) : null;
  const netDebt = totalDebt - cash;
  const netDebtToEquity =
    totalEquity > 0 ? round(netDebt / totalEquity, 2) : null;
  const longTermDebtToEquity =
    totalEquity > 0 ? round(longTermDebt / totalEquity, 2) : null;
  const equityRatio =
    totalAssets > 0 ? round(totalEquity / totalAssets, 2) : null;
  const financialLeverage =
    totalEquity > 0 ? round(totalAssets / totalEquity, 2) : null;

  let interestCoverage = safeMetric(ratios.interestCoverage);
  if (interestCoverage === null && latestIncome) {
    const interestExpense = Math.abs(
      findStatementValue(latestIncome, "interestExpense", "Interest Expense")
    );
    if (interestExpense > 0) {
      interestCoverage = round(operatingIncome / interestExpense, 1);
    }
  }

  const assetTurnover =
    totalAssets > 0 && revenue > 0 ? round(revenue / totalAssets, 2) : null;
  const inventoryTurnover =
    inventory > 0 && revenue > 0 ? round(revenue / inventory, 2) : null;
  const receivablesTurnover =
    receivables > 0 && revenue > 0 ? round(revenue / receivables, 2) : null;
  const payablesTurnover =
    payables > 0 && revenue > 0 ? round(revenue / payables, 2) : null;
  const fixedAssetTurnover =
    fixedAssets > 0 && revenue > 0 ? round(revenue / fixedAssets, 2) : null;
  const capitalTurnover =
    capitalEmployed > 0 && revenue > 0 ? round(revenue / capitalEmployed, 2) : null;

  const inventoryDays = turnoverDays(365, inventoryTurnover);
  const debtorDays = turnoverDays(365, receivablesTurnover);
  const creditorDays = turnoverDays(365, payablesTurnover);
  const cashConversionCycle =
    inventoryDays !== null && debtorDays !== null && creditorDays !== null
      ? round(inventoryDays + debtorDays - creditorDays, 1)
      : null;

  const effectiveRevenue = ttmRevenue ?? revenue;
  const effectiveNetProfit = ttmNetProfit ?? netIncome;
  const effectiveOcf = ttmOperatingCashFlow ?? operatingCashFlow;
  const effectiveFcf = ttmFreeCashFlow ?? freeCashFlow;

  const fcfMargin =
    effectiveRevenue > 0 && effectiveFcf !== 0
      ? round((effectiveFcf / effectiveRevenue) * 100, 1)
      : null;
  const cfoToPat =
    effectiveNetProfit > 0 && effectiveOcf !== 0
      ? round((effectiveOcf / effectiveNetProfit) * 100, 1)
      : null;
  const cfoToRevenue =
    effectiveRevenue > 0 && effectiveOcf !== 0
      ? round((effectiveOcf / effectiveRevenue) * 100, 1)
      : null;
  const capexToRevenue =
    effectiveRevenue > 0 && capex !== 0
      ? round((capex / effectiveRevenue) * 100, 1)
      : null;

  const dividendPayoutRatio =
    netIncome > 0 && dividends > 0
      ? round((dividends / netIncome) * 100, 1)
      : null;
  const earningsYield =
    safeMetric(ratios.pe) && ratios.pe! > 0
      ? round(100 / ratios.pe!, 2)
      : null;

  const revenues = annualSeries(income, ["revenue", "totalRevenue", "Revenue"]);
  const profits = annualSeries(income, ["netIncome", "netProfit", "Net Income"]);
  const epsSeries = annualSeries(income, ["eps", "EPS", "epsDiluted"]);

  const pe = toNullable(ratios.pe);
  const marketCap = safeMetric(ratios.marketCap);
  const evToSales =
    marketCap !== null && effectiveRevenue > 0
      ? round(marketCap / effectiveRevenue, 2)
      : null;
  const priceToFreeCashFlow =
    marketCap !== null && effectiveFcf > 0
      ? round(marketCap / effectiveFcf, 2)
      : null;

  return {
    grossMargin,
    operatingMargin,
    ebitdaMargin,
    netMargin,
    pretaxMargin,
    roe,
    roce,
    roa,
    roic,
    eps: eps !== 0 ? eps : toNullable(ratios.eps),
    dividendPayoutRatio,
    earningsYield,
    currentRatio: toNullable(ratios.currentRatio),
    quickRatio,
    cashRatio,
    workingCapital: workingCapital !== 0 ? round(workingCapital) : null,
    netWorkingCapital: netWorkingCapital !== 0 ? round(netWorkingCapital) : null,
    workingCapitalToSales,
    debtToEquity,
    debtToAssets,
    netDebtToEquity,
    longTermDebtToEquity,
    interestCoverage,
    equityRatio,
    financialLeverage,
    assetTurnover,
    inventoryTurnover,
    receivablesTurnover,
    payablesTurnover,
    fixedAssetTurnover,
    capitalTurnover,
    inventoryDays,
    debtorDays,
    creditorDays,
    cashConversionCycle,
    freeCashFlow: effectiveFcf !== 0 ? round(effectiveFcf) : toNullable(ratios.freeCashFlow),
    operatingCashFlow: effectiveOcf !== 0 ? round(effectiveOcf) : null,
    fcfMargin,
    cfoToPat,
    cfoToRevenue,
    capexToRevenue,
    pe,
    forwardPe: toNullable(ratios.forwardPe),
    pb: toNullable(ratios.pb),
    ps: toNullable(ratios.ps),
    evToEbitda: toNullable(ratios.evToEbitda),
    peg: toNullable(ratios.peg),
    dividendYield: toNullable(ratios.dividendYield),
    evToSales,
    priceToFreeCashFlow,
    revenueGrowthYoY: safeMetric(growth.revenueGrowth),
    profitGrowthYoY: safeMetric(growth.profitGrowth),
    epsGrowthYoY: safeMetric(growth.epsGrowth),
    revenueCagr3Y: cagrFromSeries(revenues, 3) ?? safeMetric(growth.cagr3Year),
    revenueCagr5Y: cagrFromSeries(revenues, 5) ?? safeMetric(growth.cagr5Year),
    revenueCagr10Y: revenueCagr10Y ?? cagrFromSeries(revenues, 10),
    profitCagr3Y: cagrFromSeries(profits, 3),
    profitCagr5Y: cagrFromSeries(profits, 5),
    profitCagr10Y: profitCagr10Y ?? cagrFromSeries(profits, 10),
    epsCagr3Y: epsCagr3Y ?? cagrFromSeries(epsSeries, 3),
  };
}

export function countAvailableRatios(ratios: InstitutionalRatios): number {
  return Object.values(ratios).filter(
    (value) => value !== null && Number.isFinite(value)
  ).length;
}

export function averageRatioScore(values: Array<number | null>): number {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value)
  );
  if (valid.length === 0) return 50;
  return normalizeScore(
    valid.reduce((sum, value) => sum + value, 0) / valid.length
  );
}
