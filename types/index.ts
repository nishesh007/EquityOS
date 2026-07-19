export interface MarketIndex {
  id: string;
  name: string;
  symbol: string;
  value: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  sparkline: number[];
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

export interface PortfolioHolding {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  changePercent: number;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

export interface PortfolioSummary {
  totalValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
  holdings: PortfolioHolding[];
}

export interface WatchlistItem {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  sector: string;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

export interface MarketNews {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  publishedAt: string;
  category: "Market" | "Economy" | "Corporate" | "Policy" | "Global";
  sentiment: "Positive" | "Neutral" | "Negative";
  summary: string;
  url: string;
}

export interface UpcomingResult {
  id: string;
  company: string;
  symbol: string;
  date: string;
  quarter: string;
  sector: string;
  marketCap: string;
}

export interface AIMarketSummary {
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  summary: string;
  keyPoints: string[];
  sectors: {
    name: string;
    outlook: "positive" | "negative" | "neutral";
    change: number;
  }[];
}

export interface SectorPerformance {
  name: string;
  changePercent: number;
  breadth: number;
  /** Sector advance/decline counts when provided by Market Internals. */
  advances?: number;
  declines?: number;
  unchanged?: number;
  total?: number;
}

export interface MarketMover {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  volume: string;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

export interface MarketBreadth {
  advances: number;
  declines: number;
  unchanged: number;
  newHighs: number;
  newLows: number;
  sectors: SectorPerformance[];
  gainers: MarketMover[];
  losers: MarketMover[];
  weekHighs: MarketMover[];
  weekLows: MarketMover[];
  mostActive: MarketMover[];
  /** Institutional breadth / Market Internals fields (Sprint 10C.1). */
  universe?: import("@/lib/market-breadth").BreadthUniverseId;
  universeLabel?: string;
  totalStocks?: number;
  quotedStocks?: number;
  advanceDeclineRatio?: number;
  breadthPercent?: number;
  netAdvances?: number;
  marketMood?: string;
  moodGauge?: number;
  moodFactors?: { id: string; score: number; label: string }[];
  participationPercent?: number;
  highLowRatio?: number;
  aboveEma20?: number | null;
  aboveEma50?: number | null;
  aboveEma200?: number | null;
  aboveEma20Pct?: number | null;
  aboveEma50Pct?: number | null;
  aboveEma200Pct?: number | null;
  aboveEma20Trend?: "up" | "down" | "flat" | "unknown";
  aboveEma50Trend?: "up" | "down" | "flat" | "unknown";
  aboveEma200Trend?: "up" | "down" | "flat" | "unknown";
  technicalSampleSize?: number;
  averageRsi?: number | null;
  averageDailyReturn?: number | null;
  strongestSector?: string | null;
  weakestSector?: string | null;
  breadthTrend5d?: { date: string; breadthPercent: number; netAdvances: number }[];
  breadthTrend20d?: { date: string; breadthPercent: number; netAdvances: number }[];
  technicalCoveragePercent?: number;
  quoteCoveragePercent?: number;
  marketStatus?: string;
  marketStatusLabel?: string;
  lastUpdated?: string;
  dataSource?: string;
}

export interface InstitutionalFlow {
  fii: number;
  dii: number;
  asOf: string;
}

export interface MarketPulse {
  indiaVix: number;
  indiaVixChange: number;
  vixQuote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
  institutionalFlow: InstitutionalFlow;
  putCallRatio: number;
  marketTrend: "Strong Bullish" | "Bullish" | "Neutral" | "Bearish";
  breadthScore: number;
}

export interface IntradayIdea {
  symbol: string;
  company: string;
  side: "Long" | "Short";
  entry: number;
  stopLoss: number;
  target: number;
  riskReward: number;
  conviction: number;
  timeHorizon: string;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

export interface SwingTradeIdea {
  symbol: string;
  company: string;
  side: "Long" | "Short";
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targets: number[];
  technicalScore: number;
  fundamentalScore: number;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

export type ChartTimeframe = "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "5Y";

export type CompanyTab =
  | "overview"
  | "financials"
  | "quarterly"
  | "shareholding"
  | "peers"
  | "valuation"
  | "news"
  | "notes";

export interface PricePoint {
  timestamp: string;
  price: number;
  volume?: number;
}

export interface CompanyFinancials {
  revenue: string;
  revenueGrowth: number;
  netProfit: string;
  netProfitGrowth: number;
  roe: number;
  roce: number;
  pe: number;
  pb: number;
  debtToEquity: number;
}

export interface QuarterlyResult {
  quarter: string;
  revenue: string;
  netProfit: string;
  eps: number;
  margin: number;
}

export interface AnnualFinancial {
  year: string;
  revenue: string;
  netProfit: string;
  eps: number;
  roe: number;
}

export interface ShareholdingPattern {
  promoter: number;
  fii: number;
  dii: number;
  public: number;
  lastUpdated: string;
}

export interface PeerCompany {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  pe: number;
  marketCap: string;
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

export interface ValuationMetric {
  label: string;
  value: string;
  industryAvg: string;
  status: "undervalued" | "fair" | "overvalued";
}

export interface CompanyNote {
  id: string;
  content: string;
  createdAt: string;
}

export interface CompanyNews {
  id: string;
  title: string;
  source: string;
  timestamp: string;
  summary: string;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  sector: string;
  industry: string;
  description: string;
  website: string;
  founded: string;
  employees: string;
  financials: CompanyFinancials;
  /** Sprint 8C — institutional fundamentals engine output. */
  fundamentals?: import("@/lib/fundamentals/types").FinancialFundamentals;
  priceHistory: Record<ChartTimeframe, import("@/lib/providers/types").OhlcBar[]>;
  quarterlyResults: QuarterlyResult[];
  annualFinancials: AnnualFinancial[];
  shareholding: ShareholdingPattern;
  peers: PeerCompany[];
  valuation: ValuationMetric[];
  news: CompanyNews[];
  notes: CompanyNote[];
  quote?: import("@/lib/market-data/enriched-quote").EnrichedQuote;
}

/* ─────────────────────────────────────────────────────────────
   Sprint 3 — Equity Research Terminal
   Additive research layer built on top of CompanyProfile.
   ───────────────────────────────────────────────────────────── */

export type Signal = "bullish" | "neutral" | "bearish";
export type ConvictionLevel = "High" | "Medium" | "Low";
export type RiskLevel = "Low" | "Moderate" | "High";

/** Timeframes exposed by the embedded TradingView advanced chart. */
export type TradingViewTimeframe =
  | "1D"
  | "1W"
  | "1M"
  | "3M"
  | "6M"
  | "1Y"
  | "5Y";

export interface TradingData {
  open: number;
  high: number;
  low: number;
  close: number;
  previousClose: number;
  volume: number;
  turnover: string;
  deliveryPercent: number;
  vwap: number;
  weekHigh52: number;
  weekLow52: number;
  dividendYield: number;
  upperCircuit: number;
  lowerCircuit: number;
}

export interface TechnicalIndicator {
  name: string;
  value: string;
  signal: Signal;
  detail: string;
}

export interface TechnicalAnalysis {
  score: number;
  summary: Signal;
  bullishCount: number;
  neutralCount: number;
  bearishCount: number;
  indicators: TechnicalIndicator[];
}

export interface SwingTradeSetup {
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  target1: number;
  target2: number;
  target3: number;
  riskRewardRatio: number;
  capitalAllocationPercent: number;
  referenceCapital: number;
  positionSize: number;
  conviction: ConvictionLevel;
  swingScore: number;
  timeHorizon: string;
  strategy: string;
}

export interface AIAnalysis {
  trend: string;
  momentum: string;
  volumeAnalysis: string;
  support: number;
  resistance: number;
  riskLevel: RiskLevel;
  investmentThesis: string;
  generatedAt: string;
}

export interface ResultsSummary {
  quarter: string;
  reportedOn: string;
  revenue: string;
  revenueGrowthYoY: number;
  netProfit: string;
  netProfitGrowthYoY: number;
  eps: number;
  epsGrowthYoY: number;
  operatingMargin: number;
  netMargin: number;
  verdict: Signal;
  commentary: string;
}

export interface CompanyResearch {
  symbol: string;
  exchangeSymbol: string;
  trading: TradingData;
  technicals: TechnicalAnalysis;
  swing: SwingTradeSetup;
  ai: AIAnalysis;
  results: ResultsSummary;
  news: CompanyNews[];
}

/* ─────────────────────────────────────────────────────────────
   Sprint 5 — Equity Intelligence Engine
   Institutional-quality scoring and long-term research layer.
   ───────────────────────────────────────────────────────────── */

export type ScoreTone = "gain" | "accent" | "loss";
export type InvestmentVerdict = "BUY" | "HOLD" | "SELL" | "WATCH";

export interface EquityScoreFactor {
  key: string;
  label: string;
  score: number;
  explanation: string;
  tone: ScoreTone;
}

export interface EquityScore {
  overall: number;
  explanation: string;
  factors: EquityScoreFactor[];
}

export type DataFreshness = "live" | "delayed" | "mock";
export type SeverityLevel = "Low" | "Medium" | "High";
export type RecommendationLevel =
  | "Strong Buy"
  | "Buy"
  | "Accumulate"
  | "Hold"
  | "Reduce"
  | "Sell"
  | "Strong Sell";
export type ValuationVerdict = "Undervalued" | "Fairly Valued" | "Overvalued";

export interface DataTransparency {
  dataSource: string;
  freshness: DataFreshness;
  provider: string;
  lastUpdated: string;
  cacheAge: string;
}

export interface QualityScoreItem {
  key: string;
  label: string;
  score: number;
  explanation: string;
  trend: "up" | "down" | "stable";
}

export interface FinancialQualityAnalysis {
  overallScore: number;
  scores: QualityScoreItem[];
}

export interface ValuationModelOutput {
  key: string;
  label: string;
  fairValue: number;
  weight: number;
  verdict: ValuationVerdict;
  confidence: number;
  explanation: string;
}

export interface ValuationAnalysis {
  pe: { value: number; fairValue: number; verdict: ValuationVerdict };
  pb: { value: number; fairValue: number; verdict: ValuationVerdict };
  evEbitda: { value: number; fairValue: number; verdict: ValuationVerdict };
  peg: { value: number; fairValue: number; verdict: ValuationVerdict };
  relativeVsPeers: ValuationVerdict;
  historicalRange: { percentile: number; verdict: ValuationVerdict };
  overallVerdict: ValuationVerdict;
  estimatedFairValue: number;
  intrinsicValue: number;
  marginOfSafety: number;
  upsidePercent: number;
  expectedCagr: number;
  confidence: number;
  summary: string;
  models: ValuationModelOutput[];
  available: boolean;
}

export interface ThesisSection {
  title: string;
  content: string;
}

export interface AIInvestmentThesis {
  bullCase: string;
  bearCase: string;
  keyRisks: string[];
  keyCatalysts: string[];
  managementQuality: string;
  moat: string;
  valuationOpinion: string;
  fairValue: number;
  expectedCagr: number;
  confidence: number;
  sections: ThesisSection[];
  recommendation: RecommendationLevel;
  recommendationRationale: string;
}

export interface MultiYearTrendPoint {
  year: string;
  value: number;
}

export interface MultiYearTrendMetric {
  key: string;
  label: string;
  unit: string;
  direction: "improving" | "deteriorating" | "stable";
  points: MultiYearTrendPoint[];
  explanation: string;
}

export interface MultiYearTrendAnalysis {
  metrics: MultiYearTrendMetric[];
}

export interface RedFlag {
  key: string;
  label: string;
  severity: SeverityLevel;
  description: string;
  metric: string;
}

export interface Opportunity {
  key: string;
  label: string;
  description: string;
  metric: string;
}

export interface ResearchConfidenceFactor {
  key: string;
  label: string;
  score: number;
  explanation: string;
}

export interface ResearchConfidence {
  overall: number;
  factors: ResearchConfidenceFactor[];
}

export interface FinancialHealthMetric {
  key: string;
  label: string;
  value: string;
  trend: "up" | "down" | "stable";
  trendLabel: string;
  explanation: string;
  history: number[];
}

export interface InstitutionalPeer {
  symbol: string;
  name: string;
  isCompany: boolean;
  pe: number;
  pb: number;
  roe: number;
  roce: number;
  salesGrowth: number;
  profitGrowth: number;
  debt: number;
  marketCap: string;
  valuation: "Attractive" | "Fair" | "Premium";
  industryRank: number;
}

export interface QuarterlyAnalysisPoint {
  quarter: string;
  revenue: string;
  profit: string;
  eps: number;
  margin: number;
  revenueGrowth: number;
  profitGrowth: number;
}

export interface QuarterlyAnalysis {
  points: QuarterlyAnalysisPoint[];
  summary: string;
}

export interface AIInvestorSummary {
  verdict: InvestmentVerdict;
  summary: string;
  reasons: string[];
}

export interface InvestmentChecklistItem {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface InvestmentChecklist {
  score: number;
  items: InvestmentChecklistItem[];
}

export type CompanyEventType =
  | "Results"
  | "Dividend"
  | "Bonus"
  | "Split"
  | "Acquisition"
  | "Management Change"
  | "Corporate Action";

export interface CompanyTimelineEvent {
  id: string;
  date: string;
  type: CompanyEventType;
  title: string;
  description: string;
}

export interface DecisionMetric {
  key: string;
  label: string;
  value: string;
  score: number;
  explanation: string;
}

export interface DecisionConviction {
  overall: number;
  confidence: number;
  risk: number;
  reward: number;
  marginOfSafety: number;
  intrinsicValue: number;
  currentPrice: number;
  upside: number;
  downside: number;
  expectedCagr: number;
}

export interface DecisionEntry {
  idealBuyZone: string;
  breakoutBuy: number;
  swingBuy: string;
  longTermBuy: string;
  positionSize: number;
  capitalAllocationPercent: number;
}

export interface DecisionTargets {
  target1: number;
  target2: number;
  target3: number;
  stopLoss: number;
  trailingStop: number;
  invalidationLevel: number;
}

export interface DecisionTechnicalSnapshot {
  metrics: DecisionMetric[];
  support: number;
  resistance: number;
  breakoutProbability: number;
  overallScore: number;
}

export interface DecisionFundamentalsSnapshot {
  metrics: DecisionMetric[];
  overallScore: number;
}

export interface DecisionValuationSnapshot {
  metrics: DecisionMetric[];
  overallScore: number;
}

export interface DecisionQualitySnapshot {
  metrics: DecisionMetric[];
  overallScore: number;
}

export interface DecisionRiskSnapshot {
  metrics: DecisionMetric[];
  overallRiskMeter: number;
}

export interface DecisionAISummary {
  institutionalSummary: string;
  whyBuy: string[];
  whyNotBuy: string[];
  majorRisks: string[];
  majorOpportunities: string[];
  catalysts: string[];
  redFlags: string[];
  greenFlags: string[];
}

export interface DecisionTimelineItem {
  id: string;
  phase: string;
  title: string;
  description: string;
  horizon: string;
}

export interface AIDecisionAnalysis {
  decisionScore: number;
  recommendation: RecommendationLevel;
  verdict: InvestmentVerdict;
  conviction: DecisionConviction;
  entry: DecisionEntry;
  targets: DecisionTargets;
  technical: DecisionTechnicalSnapshot;
  fundamentals: DecisionFundamentalsSnapshot;
  valuation: DecisionValuationSnapshot;
  quality: DecisionQualitySnapshot;
  risk: DecisionRiskSnapshot;
  aiSummary: DecisionAISummary;
  timeline: DecisionTimelineItem[];
}

export interface EquityIntelligence {
  generatedAt: string;
  score: EquityScore;
  thesis: AIInvestmentThesis;
  decision: AIDecisionAnalysis;
  financialHealth: FinancialHealthMetric[];
  peers: InstitutionalPeer[];
  quarterly: QuarterlyAnalysis;
  summary: AIInvestorSummary;
  checklist: InvestmentChecklist;
  timeline: CompanyTimelineEvent[];
  financialQuality: FinancialQualityAnalysis;
  valuation: ValuationAnalysis;
  multiYearTrends: MultiYearTrendAnalysis;
  redFlags: RedFlag[];
  opportunities: Opportunity[];
  researchConfidence: ResearchConfidence;
  dataTransparency: DataTransparency;
}

/* ─────────────────────────────────────────────────────────────
   Sprint 7E — Portfolio Doctor
   Institutional-grade portfolio-level analysis layer.
   ───────────────────────────────────────────────────────────── */

export type DiagnosticSeverity = "green" | "yellow" | "red";
export type DiversificationGrade = "A" | "B" | "C" | "D" | "F";
export type MarketCapTier = "Large" | "Mid" | "Small";
export type PositionWeightStatus = "overweight" | "underweight" | "neutral";

export type PortfolioHealthVerdict =
  | "Excellent Portfolio"
  | "Healthy Portfolio"
  | "Needs Improvement"
  | "Weak Portfolio"
  | "High Risk Portfolio";

export type RiskLevelLabel = "Low" | "Medium" | "High" | "Very High";

export interface PortfolioHealthFactor {
  key: string;
  label: string;
  score: number;
  weight: number;
  tone: ScoreTone;
  explanation: string;
}

export interface PortfolioHealthScore {
  overall: number;
  verdict: PortfolioHealthVerdict;
  factors: PortfolioHealthFactor[];
  summary: string;
}

export interface SectorAllocationItem {
  sector: string;
  currentPercent: number;
  idealPercent: number;
  difference: number;
  tone: ScoreTone;
}

export interface MarketCapAllocationItem {
  tier: MarketCapTier;
  percent: number;
}

export interface DiversificationAnalysis {
  score: number;
  sectorAllocation: SectorAllocationItem[];
  marketCapAllocation: MarketCapAllocationItem[];
  largeCapPercent: number;
  midCapPercent: number;
  smallCapPercent: number;
  maxSingleStockPercent: number;
  maxSingleStockSymbol: string;
  top5HoldingsPercent: number;
  grade: DiversificationGrade;
  gradeExplanation: string;
  herfindahlIndex: number;
}

export interface PortfolioRiskMetric {
  key: string;
  label: string;
  score: number;
  level: RiskLevelLabel;
  tone: ScoreTone;
  explanation: string;
}

export interface PortfolioRiskEngine {
  concentrationRisk: PortfolioRiskMetric;
  volatilityRisk: PortfolioRiskMetric;
  sectorRisk: PortfolioRiskMetric;
  correlationRisk: PortfolioRiskMetric;
  drawdownRisk: PortfolioRiskMetric;
  liquidityRisk: PortfolioRiskMetric;
  overallRisk: number;
  overallRiskLabel: string;
  overallTone: ScoreTone;
  summary: string;
}

export interface PortfolioDiagnostic {
  key: string;
  label: string;
  severity: DiagnosticSeverity;
  description: string;
  affectedSymbols?: string[];
}

export interface PortfolioRecommendation {
  id: string;
  action: string;
  reasoning: string;
  priority: "high" | "medium" | "low";
  tone: ScoreTone;
}

export interface RebalancingAllocationItem {
  symbol: string;
  name: string;
  currentPercent: number;
  suggestedPercent: number;
  change: number;
}

export interface RebalancingSimulator {
  currentAllocation: RebalancingAllocationItem[];
  suggestedAllocation: RebalancingAllocationItem[];
  summary: string;
}

export interface PositionSizingItem {
  symbol: string;
  name: string;
  currentWeight: number;
  idealWeight: number;
  suggestedWeight: number;
  status: PositionWeightStatus;
  tone: ScoreTone;
}

export interface PortfolioQualityMetrics {
  averageRoe: number;
  averageRoce: number;
  averageDebtToEquity: number;
  averageGrowth: number;
  averagePe: number;
  averageDividendYield: number;
  qualityScore: number;
  qualityTone: ScoreTone;
  summary: string;
}

export interface PortfolioDoctorSummary {
  healthScore: number;
  riskLevel: string;
  diversificationGrade: DiversificationGrade;
  expectedCagr: number;
  worstRisk: string;
  bestOpportunity: string;
  headline: string;
}

export interface PortfolioDoctorAnalysis {
  generatedAt: string;
  healthScore: PortfolioHealthScore;
  diversification: DiversificationAnalysis;
  riskEngine: PortfolioRiskEngine;
  diagnostics: PortfolioDiagnostic[];
  recommendations: PortfolioRecommendation[];
  rebalancing: RebalancingSimulator;
  positionSizing: PositionSizingItem[];
  sectorAllocation: SectorAllocationItem[];
  quality: PortfolioQualityMetrics;
  summary: PortfolioDoctorSummary;
  dataTransparency: DataTransparency;
}
