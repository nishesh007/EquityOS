/**
 * AI Strategy Builder — domain types (Sprint 11D).
 * Rule-based generation today; architecture allows future LLM adapters.
 */

export type MarketRegime =
  | "Any"
  | "Bull"
  | "Bear"
  | "Sideways"
  | "High Volatility";

export type StrategyUniverse =
  | "Nifty 50"
  | "Nifty 500"
  | "Midcap 150"
  | "Smallcap 250"
  | "Liquid Universe";

export type StrategySource =
  | "generated"
  | "template"
  | "library"
  | "duplicated";

export type StrategyGrade = "A+" | "A" | "B" | "C" | "D";

export type DeploymentStatus = "Ready" | "Needs Improvement" | "Not Ready";

export type BuilderTab =
  | "generator"
  | "library"
  | "generated"
  | "evaluation"
  | "performance"
  | "comparison"
  | "deployment";

export interface StrategyBuildingBlocks {
  technicalIndicators: string[];
  fundamentalFilters: string[];
  valuationFilters: string[];
  volumeFilters: string[];
  momentumFilters: string[];
  riskRules: string[];
  exitRules: string[];
  positionSizing: string;
  holdingPeriod: string;
  universe: StrategyUniverse;
  marketRegime: MarketRegime;
}

export interface StrategyRules {
  entry: string[];
  exit: string[];
  stopLossPct: number;
  targetPct: number;
  trailingStopPct: number | null;
  positionSizePct: number;
  holdingMinDays: number;
  holdingMaxDays: number;
  riskRules: string[];
  marketFilters: string[];
  sectorFilters: string[];
  liquidityFilters: string[];
}

export interface StrategyPerformance {
  historicalReturn: number;
  winRate: number;
  profitFactor: number;
  sharpe: number;
  sortino: number;
  maxDrawdown: number;
  expectancy: number;
  averageHoldingDays: number;
  riskReward: number;
  cagr: number;
  tradeCount: number;
}

export interface StrategyScores {
  overall: number;
  technical: number;
  fundamental: number;
  risk: number;
  consistency: number;
  robustness: number;
  optimization: number;
  walkForward: number;
  monteCarlo: number;
  grade: StrategyGrade;
}

export interface ImprovementSuggestion {
  id: string;
  title: string;
  detail: string;
  confidence: number;
  category:
    | "Trend"
    | "Risk"
    | "Targets"
    | "Sizing"
    | "Volume"
    | "Regime"
    | "Drawdown"
    | "Profit Factor";
}

export interface DeploymentChecklistItem {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
  required: boolean;
}

export interface DeploymentReadiness {
  items: DeploymentChecklistItem[];
  status: DeploymentStatus;
  summary: string;
}

export interface BuiltStrategy {
  id: string;
  name: string;
  description: string;
  templateId: string | null;
  tags: string[];
  favorite: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  blocks: StrategyBuildingBlocks;
  rules: StrategyRules;
  performance: StrategyPerformance;
  scores: StrategyScores;
  improvements: ImprovementSuggestion[];
  deployment: DeploymentReadiness;
  source: StrategySource;
}

export interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  blocks: StrategyBuildingBlocks;
  rules: StrategyRules;
}

/** Optional hooks for future LLM / research engine adapters. */
export interface StrategyGenerationContext {
  seed?: number;
  templateId?: string | null;
  blocks?: Partial<StrategyBuildingBlocks>;
  nameHint?: string;
  /** Reserved for future LLM prompt payloads. */
  llmHints?: Record<string, unknown>;
}

export interface LibraryFilterState {
  query: string;
  tag: string | null;
  favoritesOnly: boolean;
  includeArchived: boolean;
}

export interface ComparisonHighlight {
  bestReturnId: string | null;
  lowestDrawdownId: string | null;
  highestSharpeId: string | null;
  highestWinRateId: string | null;
  bestRiskRewardId: string | null;
  bestConsistencyId: string | null;
}

export interface StrategyBuilderState {
  templates: StrategyTemplate[];
  library: BuiltStrategy[];
  generated: BuiltStrategy[];
  selectedId: string | null;
  comparisonIds: string[];
  generatorBlocks: StrategyBuildingBlocks;
  selectedTemplateId: string | null;
  libraryFilters: LibraryFilterState;
  activeTab: BuilderTab;
  lastExportMessage: string | null;
  errorMessage: string | null;
}

export type StrategyBuilderAction =
  | { type: "hydrate"; state: StrategyBuilderState }
  | { type: "set_tab"; tab: BuilderTab }
  | { type: "set_generator_blocks"; blocks: StrategyBuildingBlocks }
  | { type: "select_template"; templateId: string | null }
  | { type: "apply_template"; templateId: string }
  | { type: "generate"; strategies: BuiltStrategy[] }
  | { type: "select"; id: string | null }
  | { type: "upsert_library"; strategy: BuiltStrategy }
  | { type: "set_library"; library: BuiltStrategy[] }
  | { type: "set_comparison"; ids: string[] }
  | { type: "toggle_comparison"; id: string }
  | { type: "set_filters"; filters: Partial<LibraryFilterState> }
  | { type: "set_export_message"; message: string | null }
  | { type: "set_error"; message: string | null }
  | { type: "update_strategy"; strategy: BuiltStrategy };
