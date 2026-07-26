/**
 * Strategy Optimization Workspace — configuration types (Sprint 11C.1).
 * Engine session fields added in Sprint 11C.2.
 */

import type {
  ComparisonState,
  ExportState,
  OptimizationEngineSettings,
  OptimizationSession,
  RunnerControl,
} from "./engine/types";
import type {
  WalkForwardConfig,
  WalkForwardExportState,
  WalkForwardFilterState,
  WalkForwardSession,
} from "./walk-forward/types";
import type {
  MonteCarloConfig,
  MonteCarloExportState,
  MonteCarloFilterState,
  MonteCarloSession,
} from "./monte-carlo/types";

export type StrategyCategory =
  | "Trend"
  | "Momentum"
  | "Value"
  | "Mean Reversion"
  | "Intraday"
  | "Income";

export type SupportedMarket = "Equities" | "ETFs" | "Indices" | "Multi-Asset";

export interface OptimizationStrategy {
  id: string;
  name: string;
  description: string;
  category: StrategyCategory;
  supportedMarket: SupportedMarket;
}

export type ParameterType =
  | "integer"
  | "number"
  | "percentage"
  | "boolean"
  | "dropdown"
  | "range";

export type ParameterGroup =
  | "Moving Average"
  | "Momentum"
  | "Trend"
  | "Risk"
  | "Volume"
  | "Holding";

export type ParameterValidationStatus =
  | "valid"
  | "invalid"
  | "overflow"
  | "disabled";

export interface ParameterDefinition {
  id: string;
  group: ParameterGroup;
  label: string;
  type: ParameterType;
  current: number | boolean | string;
  min?: number;
  max?: number;
  increment?: number;
  options?: readonly string[];
  unit?: string;
  enabled: boolean;
}

export interface ParameterState extends ParameterDefinition {
  status: ParameterValidationStatus;
  error?: string;
}

export type ConstraintOperator = "<" | ">" | "<=" | ">=";

export type ConstraintMetric =
  | "max_drawdown"
  | "min_win_rate"
  | "min_profit_factor"
  | "min_trades"
  | "max_holding_days"
  | "min_risk_reward";

export interface ConstraintDefinition {
  id: ConstraintMetric;
  label: string;
  operator: ConstraintOperator;
  value: number;
  unit?: string;
  enabled: boolean;
}

export interface ConstraintValidation {
  id: ConstraintMetric;
  valid: boolean;
  message?: string;
}

export interface OptimizationProfile {
  id: string;
  name: string;
  strategyId: string;
  parameters: ParameterState[];
  constraints: ConstraintDefinition[];
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ExperimentStatus = "Pending" | "Ready" | "Completed" | "Cancelled";

export type ExperimentPriority = "Low" | "Normal" | "High";

export interface ExperimentQueueItem {
  id: string;
  name: string;
  strategy: string;
  createdAt: string;
  status: ExperimentStatus;
  estimatedRuntime: string;
  priority: ExperimentPriority;
}

export type ComplexityLevel = "Low" | "Moderate" | "High" | "Very High";

export interface RuntimeEstimate {
  parameterCount: number;
  combinationCount: number;
  estimatedRuntime: string;
  estimatedRuntimeMinutes: number;
  cpuEstimate: string;
  memoryEstimate: string;
  complexity: ComplexityLevel;
}

export interface ValidationCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  message?: string;
}

export interface ValidationState {
  checks: ValidationCheck[];
  ready: boolean;
  strategySelected: boolean;
  parametersValid: boolean;
  constraintsValid: boolean;
  runtimeHigh: boolean;
}

export interface OptimizationWorkspaceState {
  selectedStrategyId: string | null;
  parameters: ParameterState[];
  constraints: ConstraintDefinition[];
  profiles: OptimizationProfile[];
  recentProfileIds: string[];
  queue: ExperimentQueueItem[];
  runtime: RuntimeEstimate;
  validation: ValidationState;
  runMessage: string | null;
  profileError: string | null;
  /** Sprint 11C.2 engine state */
  engineSettings: OptimizationEngineSettings;
  currentSession: OptimizationSession | null;
  sessionHistory: OptimizationSession[];
  comparison: ComparisonState;
  exportState: ExportState;
  runnerControl: RunnerControl;
  selectedResultId: string | null;
  /** Sprint 11C.3 walk-forward */
  activeTab: "configuration" | "results" | "walk-forward" | "monte-carlo";
  walkForwardConfig: WalkForwardConfig;
  walkForwardSession: WalkForwardSession | null;
  walkForwardHistory: WalkForwardSession[];
  walkForwardSelectedCycleId: string | null;
  walkForwardFilters: WalkForwardFilterState;
  walkForwardExport: WalkForwardExportState;
  walkForwardRunning: boolean;
  /** Sprint 11C.4 Monte Carlo */
  monteCarloConfig: MonteCarloConfig;
  monteCarloSession: MonteCarloSession | null;
  monteCarloHistory: MonteCarloSession[];
  monteCarloSelectedId: string | null;
  monteCarloFilters: MonteCarloFilterState;
  monteCarloExport: MonteCarloExportState;
  monteCarloRunning: boolean;
}
