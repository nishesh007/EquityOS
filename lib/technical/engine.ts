import { createScoreResult } from "@/lib/engine/framework";
import type { ScoreResult } from "@/lib/engine/types";
import { round } from "@/lib/engine/utils";
import type { OhlcBar } from "@/lib/providers/types";
import { pricePointsToCandles } from "@/lib/technical/candles";
import {
  adx,
  atr,
  bollingerBands,
  ema,
  formatCurrency,
  formatNumber,
  formatPercent,
  macd,
  momentum,
  relativeStrength,
  rsi,
  sessionVwap,
  sma,
  supertrend,
  volatility,
  volumeTrend,
  week52Momentum,
} from "@/lib/technical/math";
import type {
  CompanyProfile,
  PricePoint,
  Signal,
  TechnicalAnalysis,
  TechnicalIndicator,
  TradingData,
} from "@/types";

const SIGNAL_WEIGHT: Record<Signal, number> = {
  bullish: 1,
  neutral: 0.5,
  bearish: 0,
};

const MIN_CANDLES = 30;

export interface TechnicalEngineInput {
  profile: CompanyProfile;
  trading: TradingData;
  candles?: OhlcBar[];
  priceHistory?: PricePoint[];
}

export interface TechnicalBuildResult {
  analysis: TechnicalAnalysis;
  scoreResult: ScoreResult;
}

function priceVsAverageSignal(price: number, average: number | null): Signal {
  if (average === null || average === 0) return "neutral";
  const ratio = price / average;
  if (ratio > 1.005) return "bullish";
  if (ratio < 0.995) return "bearish";
  return "neutral";
}

function rsiSignal(value: number | null): Signal {
  if (value === null) return "neutral";
  if (value >= 70) return "neutral";
  if (value <= 30) return "neutral";
  if (value >= 55) return "bullish";
  if (value <= 45) return "bearish";
  return "neutral";
}

function macdSignal(histogram: number | null): Signal {
  if (histogram === null) return "neutral";
  if (histogram > 0.5) return "bullish";
  if (histogram < -0.5) return "bearish";
  return "neutral";
}

function adxSignal(result: ReturnType<typeof adx>): Signal {
  if (!result) return "neutral";
  if (result.adx < 20) return "neutral";
  if (result.plusDi > result.minusDi) return "bullish";
  if (result.minusDi > result.plusDi) return "bearish";
  return "neutral";
}

function bollingerSignal(
  price: number,
  bands: ReturnType<typeof bollingerBands>
): Signal {
  if (!bands) return "neutral";
  if (price <= bands.lower * 1.01) return "bullish";
  if (price >= bands.upper * 0.99) return "bearish";
  return "neutral";
}

function volumeTrendSignal(delta: number | null, priceChange: number): Signal {
  if (delta === null) return "neutral";
  if (delta > 8 && priceChange >= 0) return "bullish";
  if (delta > 8 && priceChange < 0) return "bearish";
  if (delta < -8) return "bearish";
  return "neutral";
}

function momentumSignal(value: number | null): Signal {
  if (value === null) return "neutral";
  if (value > 2) return "bullish";
  if (value < -2) return "bearish";
  return "neutral";
}

function week52Signal(value: number | null): Signal {
  if (value === null) return "neutral";
  if (value >= 65) return "bullish";
  if (value <= 35) return "bearish";
  return "neutral";
}

function relativeStrengthSignal(value: number | null): Signal {
  if (value === null) return "neutral";
  if (value >= 105) return "bullish";
  if (value <= 95) return "bearish";
  return "neutral";
}

function volatilitySignal(value: number | null): Signal {
  if (value === null) return "neutral";
  if (value > 35) return "bearish";
  if (value < 18) return "bullish";
  return "neutral";
}

function atrSignal(atrValue: number | null, price: number): Signal {
  if (atrValue === null || price === 0) return "neutral";
  const atrPct = (atrValue / price) * 100;
  if (atrPct > 2.6) return "bearish";
  if (atrPct < 1.4) return "bullish";
  return "neutral";
}

function summaryFromScore(score: number): Signal {
  if (score >= 60) return "bullish";
  if (score >= 40) return "neutral";
  return "bearish";
}

function buildPlaceholderIndicators(): TechnicalIndicator[] {
  const placeholder = (name: string, detail: string): TechnicalIndicator => ({
    name,
    value: "—",
    signal: "neutral",
    detail,
  });

  return [
    placeholder("RSI (14)", "Awaiting historical candles"),
    placeholder("MACD", "Awaiting historical candles"),
    placeholder("MACD Histogram", "Awaiting historical candles"),
    placeholder("Signal Line", "Awaiting historical candles"),
    placeholder("EMA 20", "Awaiting historical candles"),
    placeholder("EMA 50", "Awaiting historical candles"),
    placeholder("EMA 100", "Awaiting historical candles"),
    placeholder("EMA 200", "Awaiting historical candles"),
    placeholder("SMA 20", "Awaiting historical candles"),
    placeholder("SMA 50", "Awaiting historical candles"),
    placeholder("VWAP", "Awaiting historical candles"),
    placeholder("ATR", "Awaiting historical candles"),
    placeholder("ADX", "Awaiting historical candles"),
    placeholder("Supertrend", "Awaiting historical candles"),
    placeholder("Bollinger Bands", "Awaiting historical candles"),
    placeholder("Volume Trend", "Awaiting historical candles"),
    placeholder("Momentum", "Awaiting historical candles"),
    placeholder("52 Week Momentum", "Awaiting historical candles"),
    placeholder("Relative Strength", "Awaiting historical candles"),
    placeholder("Volatility", "Awaiting historical candles"),
  ];
}

function buildIndicatorCards(
  price: number,
  trading: TradingData,
  candles: OhlcBar[]
): TechnicalIndicator[] {
  const closes = candles.map((candle) => candle.close);
  const rsiValue = rsi(closes, 14);
  const macdValue = macd(closes);
  const ema20 = ema(closes, 20);
  const ema50 = ema(closes, 50);
  const ema100 = ema(closes, 100);
  const ema200 = ema(closes, 200);
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const vwapValue = trading.vwap ?? sessionVwap(candles);
  const atrValue = atr(candles, 14);
  const adxValue = adx(candles, 14);
  const supertrendValue = supertrend(candles);
  const bollingerValue = bollingerBands(closes, 20);
  const volumeDelta = volumeTrend(candles, 10);
  const momentumValue = momentum(closes, 10);
  const week52Value = week52Momentum(
    price,
    trading.weekHigh52,
    trading.weekLow52
  );
  const relativeStrengthValue = relativeStrength(closes, 20);
  const volatilityValue = volatility(closes, 20);
  const atrPct =
    atrValue !== null && price > 0 ? round((atrValue / price) * 100, 2) : null;

  const macdLine = macdValue?.macd ?? null;
  const macdHistogram = macdValue?.histogram ?? null;
  const signalLine = macdValue?.signal ?? null;

  return [
    {
      name: "RSI (14)",
      value: formatNumber(rsiValue, 1),
      signal: rsiSignal(rsiValue),
      detail:
        rsiValue === null
          ? "Insufficient data"
          : rsiValue >= 70
            ? "Overbought — momentum stretched"
            : rsiValue <= 30
              ? "Oversold — potential reversal zone"
              : rsiValue >= 55
                ? "Constructive momentum"
                : rsiValue <= 45
                  ? "Weak — sellers in control"
                  : "Range-bound momentum",
    },
    {
      name: "MACD",
      value:
        macdLine === null
          ? "—"
          : `${macdLine > 0 ? "+" : ""}${round(macdLine, 2)}`,
      signal: macdSignal(macdHistogram),
      detail:
        macdHistogram === null
          ? "Insufficient data"
          : macdHistogram > 0
            ? "MACD above signal line"
            : macdHistogram < 0
              ? "MACD below signal line"
              : "Flat — awaiting trigger",
    },
    {
      name: "MACD Histogram",
      value:
        macdHistogram === null
          ? "—"
          : `${macdHistogram > 0 ? "+" : ""}${round(macdHistogram, 2)}`,
      signal: macdSignal(macdHistogram),
      detail:
        macdHistogram === null
          ? "Insufficient data"
          : macdHistogram > 0
            ? "Positive histogram expansion"
            : macdHistogram < 0
              ? "Negative histogram pressure"
              : "Histogram near zero",
    },
    {
      name: "Signal Line",
      value:
        signalLine === null
          ? "—"
          : `${signalLine > 0 ? "+" : ""}${round(signalLine, 2)}`,
      signal: macdSignal(macdHistogram),
      detail:
        signalLine === null
          ? "Insufficient data"
          : macdLine !== null && macdLine > signalLine
            ? "MACD trading above signal"
            : "MACD trading below signal",
    },
    {
      name: "EMA 20",
      value: formatCurrency(ema20),
      signal: priceVsAverageSignal(price, ema20),
      detail:
        ema20 === null
          ? "Insufficient data"
          : price > ema20
            ? "Price above short-term EMA"
            : "Price below short-term EMA",
    },
    {
      name: "EMA 50",
      value: formatCurrency(ema50),
      signal: priceVsAverageSignal(price, ema50),
      detail:
        ema50 === null
          ? "Insufficient data"
          : price > ema50
            ? "Above medium-term EMA"
            : "Below medium-term EMA",
    },
    {
      name: "EMA 100",
      value: formatCurrency(ema100),
      signal: priceVsAverageSignal(price, ema100),
      detail:
        ema100 === null
          ? "Insufficient data"
          : price > ema100
            ? "Above intermediate trend"
            : "Below intermediate trend",
    },
    {
      name: "EMA 200",
      value: formatCurrency(ema200),
      signal: priceVsAverageSignal(price, ema200),
      detail:
        ema200 === null
          ? "Insufficient data"
          : price > ema200
            ? "Long-term uptrend intact"
            : "Below 200 EMA — caution",
    },
    {
      name: "SMA 20",
      value: formatCurrency(sma20),
      signal: priceVsAverageSignal(price, sma20),
      detail:
        sma20 === null
          ? "Insufficient data"
          : price > sma20
            ? "Price above 20-day SMA"
            : "Price below 20-day SMA",
    },
    {
      name: "SMA 50",
      value: formatCurrency(sma50),
      signal: priceVsAverageSignal(price, sma50),
      detail:
        sma50 === null
          ? "Insufficient data"
          : price > sma50
            ? "Price above 50-day SMA"
            : "Price below 50-day SMA",
    },
    {
      name: "VWAP",
      value: formatCurrency(vwapValue),
      signal: priceVsAverageSignal(price, vwapValue),
      detail:
        vwapValue === null
          ? "Insufficient data"
          : price > vwapValue
            ? "Trading above VWAP"
            : "Trading below VWAP",
    },
    {
      name: "ATR",
      value:
        atrValue === null
          ? "—"
          : `₹${round(atrValue)} · ${atrPct}%`,
      signal: atrSignal(atrValue, price),
      detail:
        atrPct === null
          ? "Insufficient data"
          : atrPct > 2.6
            ? "Elevated volatility"
            : atrPct < 1.4
              ? "Low, stable volatility"
              : "Moderate volatility",
    },
    {
      name: "ADX",
      value: formatNumber(adxValue?.adx ?? null, 1),
      signal: adxSignal(adxValue),
      detail:
        adxValue === null
          ? "Insufficient data"
          : adxValue.adx < 20
            ? "Weak trend — range-bound"
            : adxValue.plusDi > adxValue.minusDi
              ? "Strong trend, upward bias"
              : "Strong trend, downward bias",
    },
    {
      name: "Supertrend",
      value:
        supertrendValue === null
          ? "—"
          : supertrendValue.direction === "bullish"
            ? "Buy"
            : "Sell",
      signal: supertrendValue?.direction ?? "neutral",
      detail:
        supertrendValue === null
          ? "Insufficient data"
          : `Flip level ${formatCurrency(supertrendValue.value)}`,
    },
    {
      name: "Bollinger Bands",
      value:
        bollingerValue === null
          ? "—"
          : `${formatCurrency(bollingerValue.lower)} – ${formatCurrency(bollingerValue.upper)}`,
      signal: bollingerSignal(price, bollingerValue),
      detail:
        bollingerValue === null
          ? "Insufficient data"
          : price >= bollingerValue.upper
            ? "Price near upper band"
            : price <= bollingerValue.lower
              ? "Price near lower band"
              : "Price within bands",
    },
    {
      name: "Volume Trend",
      value:
        volumeDelta === null
          ? "—"
          : `${volumeDelta > 0 ? "+" : ""}${round(volumeDelta, 0)}%`,
      signal: volumeTrendSignal(volumeDelta, trading.close - trading.previousClose),
      detail:
        volumeDelta === null
          ? "Insufficient data"
          : volumeDelta > 8
            ? "Rising volume on recent sessions"
            : volumeDelta < -8
              ? "Distribution — volume fading"
              : "Volume in line with average",
    },
    {
      name: "Momentum",
      value: formatPercent(momentumValue),
      signal: momentumSignal(momentumValue),
      detail:
        momentumValue === null
          ? "Insufficient data"
          : momentumValue > 0
            ? "Positive price momentum"
            : momentumValue < 0
              ? "Negative price momentum"
              : "Flat momentum",
    },
    {
      name: "52 Week Momentum",
      value:
        week52Value === null ? "—" : `${round(week52Value, 0)}% of range`,
      signal: week52Signal(week52Value),
      detail:
        week52Value === null
          ? "Insufficient data"
          : week52Value >= 65
            ? "Trading in upper 52-week range"
            : week52Value <= 35
              ? "Trading in lower 52-week range"
              : "Mid-range 52-week position",
    },
    {
      name: "Relative Strength",
      value:
        relativeStrengthValue === null
          ? "—"
          : `${round(relativeStrengthValue, 1)}`,
      signal: relativeStrengthSignal(relativeStrengthValue),
      detail:
        relativeStrengthValue === null
          ? "Insufficient data"
          : relativeStrengthValue >= 105
            ? "Outperforming recent baseline"
            : relativeStrengthValue <= 95
              ? "Underperforming recent baseline"
              : "In line with recent baseline",
    },
    {
      name: "Volatility",
      value:
        volatilityValue === null
          ? "—"
          : `${round(volatilityValue, 1)}% ann.`,
      signal: volatilitySignal(volatilityValue),
      detail:
        volatilityValue === null
          ? "Insufficient data"
          : volatilityValue > 35
            ? "Elevated annualized volatility"
            : volatilityValue < 18
              ? "Compressed volatility"
              : "Moderate volatility regime",
    },
  ];
}

function resolveCandles(input: TechnicalEngineInput): OhlcBar[] {
  if (input.candles && input.candles.length > 0) {
    return input.candles;
  }

  if (input.priceHistory && input.priceHistory.length > 0) {
    return pricePointsToCandles(input.priceHistory, input.profile.price);
  }

  return [];
}

export function buildTechnicalAnalysisFromMarketData(
  input: TechnicalEngineInput
): TechnicalBuildResult {
  const candles = resolveCandles(input);
  const hasEnoughData = candles.length >= MIN_CANDLES;

  const indicators = hasEnoughData
    ? buildIndicatorCards(input.profile.price, input.trading, candles)
    : buildPlaceholderIndicators();

  const bullishCount = indicators.filter((i) => i.signal === "bullish").length;
  const neutralCount = indicators.filter((i) => i.signal === "neutral").length;
  const bearishCount = indicators.filter((i) => i.signal === "bearish").length;

  const rawScore = hasEnoughData
    ? (indicators.reduce((sum, indicator) => sum + SIGNAL_WEIGHT[indicator.signal], 0) /
        indicators.length) *
      100
    : 50;

  const scoreResult = createScoreResult({
    key: "technical",
    label: "Technical Score",
    category: "technical",
    rawScore,
    explanation: hasEnoughData
      ? `${bullishCount} of ${indicators.length} indicators are bullish; composite technical score reflects weighted signal strength.`
      : "Historical candles unavailable — neutral placeholder score applied.",
    contributingFactors: indicators.map((indicator) => ({
      key: indicator.name.toLowerCase().replace(/\s+/g, "-"),
      label: indicator.name,
      value: indicator.signal,
      weight: SIGNAL_WEIGHT[indicator.signal],
      impact:
        indicator.signal === "bullish"
          ? "positive"
          : indicator.signal === "bearish"
            ? "negative"
            : "neutral",
    })),
    source: hasEnoughData ? "computed" : "mock",
  });

  const summary = summaryFromScore(scoreResult.normalizedScore);

  return {
    analysis: {
      score: scoreResult.normalizedScore,
      summary,
      bullishCount,
      neutralCount,
      bearishCount,
      indicators,
    },
    scoreResult,
  };
}

export function calculateTechnicalScoreFromAnalysis(
  analysis: TechnicalAnalysis
): ScoreResult {
  const rawScore = analysis.score;
  return createScoreResult({
    key: "technical",
    label: "Technical Score",
    category: "technical",
    rawScore,
    explanation: `${analysis.bullishCount} bullish, ${analysis.neutralCount} neutral, ${analysis.bearishCount} bearish indicators.`,
    contributingFactors: analysis.indicators.map((indicator) => ({
      key: indicator.name.toLowerCase().replace(/\s+/g, "-"),
      label: indicator.name,
      value: indicator.signal,
      weight: SIGNAL_WEIGHT[indicator.signal],
    })),
  });
}
