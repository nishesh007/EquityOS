/**
 * Central Market Data Orchestrator — type contracts.
 * Foundation types for the future dashboard single source of truth.
 * Optional fields support incremental expansion without breaking callers.
 */

/** Index / pulse surface for the dashboard market snapshot. */
export interface MarketSnapshot {
  indices?: Array<{
    id?: string;
    name?: string;
    symbol?: string;
    value?: number;
    change?: number;
    changePercent?: number;
    high?: number;
    low?: number;
    sparkline?: number[];
  }>;
  pulse?: {
    indiaVix?: number;
    indiaVixChange?: number;
    putCallRatio?: number;
    marketTrend?: string;
    breadthScore?: number;
    institutionalFlow?: {
      fii?: number;
      dii?: number;
      asOf?: string;
    };
  };
}

/** Market context view (trend, breadth, risk mode). */
export interface MarketContext {
  marketTrend?: string;
  marketStrength?: number;
  contextScore?: number;
  contextConfidence?: number;
  riskMode?: string;
  volatilityRegime?: string;
  volatilityScore?: number;
  breadthScore?: number;
  breadthQuality?: string;
  advanceCount?: number;
  declineCount?: number;
  advanceDeclineRatio?: number;
  sectorBreadth?: number;
  momentum?: number;
  liquidity?: number;
  institutionalParticipation?: number;
  leadingSectors?: string[];
  weakSectors?: string[];
  summary?: string[];
  warnings?: string[];
  timestamp?: string;
}

/** Market breadth / internals aggregate. */
export interface MarketBreadth {
  advances?: number;
  declines?: number;
  unchanged?: number;
  newHighs?: number;
  newLows?: number;
  universe?: string;
  universeLabel?: string;
  totalStocks?: number;
  quotedStocks?: number;
  advanceDeclineRatio?: number;
  breadthPercent?: number;
  netAdvances?: number;
  marketMood?: string;
  moodGauge?: number;
  participationPercent?: number;
  highLowRatio?: number;
  strongestSector?: string | null;
  weakestSector?: string | null;
  marketStatus?: string;
  marketStatusLabel?: string;
  lastUpdated?: string;
  dataSource?: string;
  sectors?: Array<{
    name?: string;
    changePercent?: number;
    breadth?: number;
    advances?: number;
    declines?: number;
    unchanged?: number;
    total?: number;
  }>;
  gainers?: Array<{
    symbol?: string;
    name?: string;
    price?: number;
    changePercent?: number;
    volume?: string;
  }>;
  losers?: Array<{
    symbol?: string;
    name?: string;
    price?: number;
    changePercent?: number;
    volume?: string;
  }>;
  weekHighs?: Array<{
    symbol?: string;
    name?: string;
    price?: number;
    changePercent?: number;
    volume?: string;
  }>;
  weekLows?: Array<{
    symbol?: string;
    name?: string;
    price?: number;
    changePercent?: number;
    volume?: string;
  }>;
  mostActive?: Array<{
    symbol?: string;
    name?: string;
    price?: number;
    changePercent?: number;
    volume?: string;
  }>;
}

/** Sector / market heatmap aggregate. */
export interface MarketHeatmapData {
  universe?: string;
  universeLabel?: string;
  totalStocks?: number;
  quotedStocks?: number;
  sectorCount?: number;
  marketAvgChangePercent?: number;
  moneyInflowSectors?: string[];
  moneyOutflowSectors?: string[];
  lastUpdated?: string;
  dataSource?: string;
  quoteCoveragePercent?: number;
  periodCoveragePercent?: number;
  sectors?: Array<{
    name?: string;
    dailyChangePercent?: number;
    weeklyChangePercent?: number | null;
    monthlyChangePercent?: number | null;
    breadthPercent?: number;
    advances?: number;
    declines?: number;
    unchanged?: number;
    total?: number;
    relativeStrength?: number;
    momentumScore?: number;
    moneyFlow?: string;
  }>;
}

/** Portfolio holdings summary. */
export interface PortfolioSummary {
  totalValue?: number;
  dayChange?: number;
  dayChangePercent?: number;
  totalInvested?: number;
  totalGain?: number;
  totalGainPercent?: number;
  holdings?: Array<{
    id?: string;
    symbol?: string;
    name?: string;
    quantity?: number;
    avgPrice?: number;
    currentPrice?: number;
    changePercent?: number;
  }>;
}

/** Watchlist summary. */
export interface WatchlistSummary {
  items?: Array<{
    id?: string;
    symbol?: string;
    name?: string;
    price?: number;
    change?: number;
    changePercent?: number;
    volume?: string;
    sector?: string;
  }>;
}

/** Opportunity / recommendation summary. */
export interface OpportunitySummary {
  recommendations?: Array<{
    id?: string;
    symbol?: string;
    company?: string;
    category?: string;
    action?: string;
    primaryStrategy?: string;
    opportunityScore?: number;
    confidence?: number;
    conviction?: number;
    entry?: number;
    stopLoss?: number;
    targets?: number[];
    riskReward?: number;
    marketRegime?: string;
    riskMode?: string;
  }>;
}

/** Shared market intelligence (context + regime). */
export interface MarketIntelligence {
  context?: MarketContext;
  regime?: {
    regime?: string;
    confidence?: number;
    confidenceGrade?: string;
    priority?: number;
    reasons?: string[];
    summary?: string[];
    timestamp?: string;
  };
  confidence?: number;
  confidenceGrade?: string;
  pipelineHealth?: number | null;
  pipelineHealthGrade?: string | null;
  eligibleStrategyCount?: number;
  timestamp?: string;
  source?: string;
}

/**
 * Future dashboard entry aggregate — single source of truth shape.
 * All fields optional for phased adoption.
 */
export interface DashboardMarketSnapshot {
  market?: MarketSnapshot;
  context?: MarketContext;
  breadth?: MarketBreadth;
  heatmap?: MarketHeatmapData;
  portfolio?: PortfolioSummary;
  watchlist?: WatchlistSummary;
  opportunities?: OpportunitySummary;
  intelligence?: MarketIntelligence;
  timestamp?: string;
}
