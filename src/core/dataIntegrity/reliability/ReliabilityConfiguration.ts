/**
 * Institutional Validation Reliability — configuration.
 * Retry, circuit, timeout, recovery, and score weights live here; no magic numbers elsewhere.
 */

export type ReliabilityStrictMode = "strict" | "relaxed";

export type RetryPolicyKind =
  | "NONE"
  | "FIXED"
  | "EXPONENTIAL"
  | "LINEAR"
  | "IMMEDIATE";

export type RecoveryPolicyKind =
  | "AUTOMATIC"
  | "FALLBACK"
  | "PARTIAL"
  | "MANUAL";

export interface ResilienceScoreWeights {
  availability: number;
  recoverySuccess: number;
  timeoutStability: number;
  retryEfficiency: number;
  healthStability: number;
  gracefulDegradation: number;
}

export interface ReliabilityConfiguration {
  mode: ReliabilityStrictMode;
  engineVersion: string;
  retryPolicy: RetryPolicyKind;
  maxRetries: number;
  fixedRetryDelayMs: number;
  exponentialBaseDelayMs: number;
  exponentialMultiplier: number;
  linearRetryDelayMs: number;
  circuitFailureThreshold: number;
  circuitSuccessThreshold: number;
  circuitRecoveryTimeoutMs: number;
  ruleTimeoutMs: number;
  moduleTimeoutMs: number;
  pipelineTimeoutMs: number;
  globalTimeoutMs: number;
  recoveryPolicy: RecoveryPolicyKind;
  healthDegradedThreshold: number;
  healthCriticalThreshold: number;
  availabilityTargetPct: number;
  snapshotRetention: number;
  maxAuditEntries: number;
  maxFailureHistory: number;
  scoreWeights: ResilienceScoreWeights;
}

export const DEFAULT_RELIABILITY_CONFIGURATION: ReliabilityConfiguration = {
  mode: "strict",
  engineVersion: "9F.19.0",
  retryPolicy: "EXPONENTIAL",
  maxRetries: 3,
  fixedRetryDelayMs: 100,
  exponentialBaseDelayMs: 50,
  exponentialMultiplier: 2,
  linearRetryDelayMs: 100,
  circuitFailureThreshold: 5,
  circuitSuccessThreshold: 2,
  circuitRecoveryTimeoutMs: 30_000,
  ruleTimeoutMs: 5_000,
  moduleTimeoutMs: 15_000,
  pipelineTimeoutMs: 60_000,
  globalTimeoutMs: 120_000,
  recoveryPolicy: "AUTOMATIC",
  healthDegradedThreshold: 70,
  healthCriticalThreshold: 40,
  availabilityTargetPct: 99,
  snapshotRetention: 100,
  maxAuditEntries: 500,
  maxFailureHistory: 200,
  scoreWeights: {
    availability: 0.25,
    recoverySuccess: 0.2,
    timeoutStability: 0.15,
    retryEfficiency: 0.15,
    healthStability: 0.15,
    gracefulDegradation: 0.1,
  },
};

export type ReliabilityConfigurationInput = Partial<
  Omit<ReliabilityConfiguration, "scoreWeights">
> & {
  scoreWeights?: Partial<ResilienceScoreWeights>;
};

export function resolveReliabilityConfiguration(
  input?: ReliabilityConfigurationInput
): ReliabilityConfiguration {
  const base = DEFAULT_RELIABILITY_CONFIGURATION;
  return {
    ...base,
    ...input,
    scoreWeights: {
      ...base.scoreWeights,
      ...input?.scoreWeights,
    },
    maxRetries: Math.max(0, input?.maxRetries ?? base.maxRetries),
    circuitFailureThreshold: Math.max(
      1,
      input?.circuitFailureThreshold ?? base.circuitFailureThreshold
    ),
    circuitSuccessThreshold: Math.max(
      1,
      input?.circuitSuccessThreshold ?? base.circuitSuccessThreshold
    ),
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    maxFailureHistory: Math.max(
      1,
      input?.maxFailureHistory ?? base.maxFailureHistory
    ),
  };
}
