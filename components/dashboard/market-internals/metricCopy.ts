/** Tooltip copy for Market Internals metrics. */

export interface MetricExplainCopy {
  title: string;
  description: string;
}

export const INTERNALS_COPY: Record<string, MetricExplainCopy> = {
  universe: {
    title: "Universe",
    description:
      "The equity set scanned for internals. Default is Entire NSE (tradable cash equities from the company master). Why it matters: breadth is only meaningful relative to a defined universe. Formula: resolved symbol list for the selected universe filter.",
  },
  totalStocks: {
    title: "Total Stocks",
    description:
      "Count of symbols in the selected universe before quote filtering. Why it matters: establishes the denominator for coverage. Formula: |universe symbols|.",
  },
  lastUpdated: {
    title: "Last Updated",
    description:
      "Timestamp of the latest Market Internals engine run. Why it matters: internals can lag during heavy NSE scans; check freshness before acting. Formula: engine completion ISO time.",
  },
  marketStatus: {
    title: "Market Status",
    description:
      "NSE cash session state (pre-open, open, post-close, holiday, closed). Why it matters: quote dynamics differ by session. Formula: IST session clock vs NSE holiday calendar.",
  },
  dataSource: {
    title: "Data Source",
    description:
      "Origin of quotes and membership used for this snapshot. Why it matters: auditability of institutional analytics. Formula: live quote feed · universe label · company master.",
  },
  advances: {
    title: "Advances",
    description:
      "Stocks with positive day change %. Why it matters: measures participation on the upside. Formula: count(change% > 0) among quoted stocks.",
  },
  declines: {
    title: "Declines",
    description:
      "Stocks with negative day change %. Why it matters: measures downside participation. Formula: count(change% < 0) among quoted stocks.",
  },
  unchanged: {
    title: "Unchanged",
    description:
      "Quoted stocks with flat day change. Why it matters: completes the A/D identity. Formula: quoted − advances − declines.",
  },
  adRatio: {
    title: "A/D Ratio",
    description:
      "Advances divided by declines. Why it matters: classic breadth intensity (not mood by itself). Formula: advances ÷ max(declines, 1) when declines > 0; else advances.",
  },
  breadthPct: {
    title: "Breadth %",
    description:
      "Share of quoted stocks advancing. Why it matters: primary participation breadth signal. Formula: advances ÷ quoted × 100.",
  },
  netAdvances: {
    title: "Net Advances",
    description:
      "Advances minus declines. Why it matters: signed breadth thrust. Formula: advances − declines.",
  },
  aboveEma20: {
    title: "Above 20 EMA",
    description:
      "Stocks whose last close is above the 20-day EMA (technical sample). Why it matters: short-term trend participation. Formula: count(price > EMA20) ÷ technical sample × 100.",
  },
  aboveEma50: {
    title: "Above 50 EMA",
    description:
      "Stocks above the 50-day EMA. Why it matters: intermediate trend health. Formula: count(price > EMA50) ÷ technical sample × 100.",
  },
  aboveEma200: {
    title: "Above 200 EMA",
    description:
      "Stocks above the 200-day EMA. Why it matters: long-term bull/bear regime participation. Formula: count(price > EMA200) ÷ technical sample × 100.",
  },
  newHighs: {
    title: "New 52-Week Highs",
    description:
      "Quoted stocks within 1% of their 52-week high. Why it matters: breakout / strength concentration. Formula: count(|price − weekHigh52| / weekHigh52 ≤ 1%).",
  },
  newLows: {
    title: "New 52-Week Lows",
    description:
      "Quoted stocks within 1% of their 52-week low. Why it matters: capitulation / weakness concentration. Formula: count(|price − weekLow52| / weekLow52 ≤ 1%).",
  },
  highLowRatio: {
    title: "High/Low Ratio",
    description:
      "Near-52W highs relative to near-52W lows. Why it matters: strength vs weakness balance (mood input). Formula: newHighs ÷ max(newLows, 1).",
  },
  averageRsi: {
    title: "Average RSI",
    description:
      "Mean 14-period RSI across the technical sample. Why it matters: aggregate momentum / overbought-oversold (mood input). Formula: mean(RSI14) over successful OHLC samples.",
  },
  avgDailyChange: {
    title: "Average Daily Change",
    description:
      "Mean day change % across quoted stocks. Why it matters: typical stock move vs index. Formula: mean(change%) over quoted universe.",
  },
  sectorBreadth: {
    title: "Sector Breadth %",
    description:
      "Share of stocks advancing within a sector. Why it matters: shows which industries lead or lag. Formula: sector advances ÷ sector quoted × 100. Sorted descending.",
  },
  strongestSector: {
    title: "Strongest Sector",
    description:
      "Sector with the highest breadth %. Why it matters: leadership cluster for risk-on rotation. Formula: argmax(sector breadth %).",
  },
  weakestSector: {
    title: "Weakest Sector",
    description:
      "Sector with the lowest breadth %. Why it matters: laggard pressure / hedging focus. Formula: argmin(sector breadth %).",
  },
  marketMood: {
    title: "Market Mood",
    description:
      "Composite internals regime — not A/D alone. Factors: Breadth %, EMA participation, High/Low ratio, sector advance share, average RSI. Why it matters: institutional regime read. Formula: mean of scored factors (−2…+2) mapped to Extremely Bullish → Extremely Bearish; requires ≥35% quote coverage and ≥2 factors.",
  },
};
