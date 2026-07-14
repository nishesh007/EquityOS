/**
 * Institutional Validation Orchestrator — configuration.
 * All modes, timeouts, retries, and pipeline defaults live here.
 */

export type ValidationExecutionMode =
  | "FAST"
  | "STANDARD"
  | "STRICT"
  | "INSTITUTIONAL"
  | "CUSTOM";

export type ValidationPriority =
  | "CRITICAL"
  | "HIGH"
  | "NORMAL"
  | "LOW"
  | "BACKGROUND";

export type ValidationPipelineId =
  | "QuickValidation"
  | "AIValidation"
  | "ResearchValidation"
  | "RecommendationValidation"
  | "PortfolioValidation"
  | "TradeValidation"
  | "DeepValidation"
  | "InstitutionalValidation"
  | (string & {});

export type ValidationEngineId =
  | "dataIntegrity"
  | "market"
  | "technical"
  | "fundamental"
  | "recommendation"
  | "tradeSetup"
  | "hallucination"
  | "historical"
  | "trust"
  | "dashboard"
  | (string & {});

export interface ValidationConfiguration {
  engineVersion: string;
  defaultMode: ValidationExecutionMode;
  defaultPriority: ValidationPriority;
  defaultPipeline: ValidationPipelineId;
  cacheTtlMs: number;
  retryCount: number;
  retryDelayMs: number;
  timeoutMs: number;
  strictMode: boolean;
  maxConcurrent: number;
  maxAuditEntries: number;
  /** Engines executed per mode (CUSTOM uses request.engines / pipeline). */
  modeEngines: Record<ValidationExecutionMode, ValidationEngineId[]>;
  /** Predefined pipeline → engine list. */
  pipelines: Record<string, ValidationEngineId[]>;
  /** Engine dependency graph (engine → prerequisites). */
  engineDependencies: Record<string, ValidationEngineId[]>;
  priorityWeights: Record<ValidationPriority, number>;
}

export const DEFAULT_VALIDATION_CONFIGURATION: ValidationConfiguration = {
  engineVersion: "9F.12.0",
  defaultMode: "STANDARD",
  defaultPriority: "NORMAL",
  defaultPipeline: "QuickValidation",
  cacheTtlMs: 30_000,
  retryCount: 2,
  retryDelayMs: 25,
  timeoutMs: 15_000,
  strictMode: false,
  maxConcurrent: 8,
  maxAuditEntries: 1_000,
  modeEngines: {
    FAST: ["dataIntegrity", "market", "trust"],
    STANDARD: [
      "dataIntegrity",
      "market",
      "technical",
      "recommendation",
      "trust",
    ],
    STRICT: [
      "dataIntegrity",
      "market",
      "technical",
      "fundamental",
      "recommendation",
      "tradeSetup",
      "hallucination",
      "historical",
      "trust",
    ],
    INSTITUTIONAL: [
      "dataIntegrity",
      "market",
      "technical",
      "fundamental",
      "recommendation",
      "tradeSetup",
      "hallucination",
      "historical",
      "trust",
      "dashboard",
    ],
    CUSTOM: [],
  },
  pipelines: {
    QuickValidation: ["dataIntegrity", "market", "trust"],
    AIValidation: [
      "dataIntegrity",
      "hallucination",
      "recommendation",
      "trust",
    ],
    ResearchValidation: [
      "dataIntegrity",
      "market",
      "technical",
      "fundamental",
      "hallucination",
      "historical",
      "trust",
    ],
    RecommendationValidation: [
      "dataIntegrity",
      "recommendation",
      "hallucination",
      "historical",
      "trust",
    ],
    PortfolioValidation: [
      "dataIntegrity",
      "market",
      "fundamental",
      "historical",
      "trust",
      "dashboard",
    ],
    TradeValidation: [
      "dataIntegrity",
      "market",
      "technical",
      "tradeSetup",
      "historical",
      "trust",
    ],
    DeepValidation: [
      "dataIntegrity",
      "market",
      "technical",
      "fundamental",
      "recommendation",
      "tradeSetup",
      "hallucination",
      "historical",
      "trust",
    ],
    InstitutionalValidation: [
      "dataIntegrity",
      "market",
      "technical",
      "fundamental",
      "recommendation",
      "tradeSetup",
      "hallucination",
      "historical",
      "trust",
      "dashboard",
    ],
  },
  engineDependencies: {
    trust: [
      "dataIntegrity",
      "market",
      "technical",
      "fundamental",
      "recommendation",
      "tradeSetup",
      "hallucination",
      "historical",
    ],
    dashboard: ["trust"],
    historical: ["recommendation", "tradeSetup"],
    hallucination: ["recommendation"],
  },
  priorityWeights: {
    CRITICAL: 100,
    HIGH: 80,
    NORMAL: 50,
    LOW: 20,
    BACKGROUND: 5,
  },
};

export type ValidationConfigurationInput = Partial<
  Omit<
    ValidationConfiguration,
    "modeEngines" | "pipelines" | "engineDependencies" | "priorityWeights"
  >
> & {
  modeEngines?: Partial<ValidationConfiguration["modeEngines"]>;
  pipelines?: Record<string, ValidationEngineId[]>;
  engineDependencies?: Record<string, ValidationEngineId[]>;
  priorityWeights?: Partial<ValidationConfiguration["priorityWeights"]>;
};

export function resolveValidationConfiguration(
  input?: ValidationConfigurationInput
): ValidationConfiguration {
  return {
    ...DEFAULT_VALIDATION_CONFIGURATION,
    ...input,
    modeEngines: {
      ...DEFAULT_VALIDATION_CONFIGURATION.modeEngines,
      ...(input?.modeEngines ?? {}),
    },
    pipelines: {
      ...DEFAULT_VALIDATION_CONFIGURATION.pipelines,
      ...(input?.pipelines ?? {}),
    },
    engineDependencies: {
      ...DEFAULT_VALIDATION_CONFIGURATION.engineDependencies,
      ...(input?.engineDependencies ?? {}),
    },
    priorityWeights: {
      ...DEFAULT_VALIDATION_CONFIGURATION.priorityWeights,
      ...(input?.priorityWeights ?? {}),
    },
  };
}
