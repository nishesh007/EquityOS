/**
 * Institutional Validation Platform — configuration.
 * Certification thresholds, retention, and health weights live here.
 */

export type PlatformMode = "strict" | "standard" | "institutional";

export interface PlatformHealthWeights {
  trust: number;
  readiness: number;
  compliance: number;
  security: number;
  reliability: number;
  performance: number;
  explainability: number;
  documentation: number;
  coverage: number;
  certification: number;
}

export interface PlatformConfiguration {
  mode: PlatformMode;
  engineVersion: string;
  snapshotRetention: number;
  auditRetention: number;
  maxAuditEntries: number;
  institutionalMode: boolean;
  orchestrationOnly: boolean;
  requireAllEngines: boolean;
  productionReadyThreshold: number;
  conditionalReadyThreshold: number;
  blockedThreshold: number;
  healthWeights: PlatformHealthWeights;
}

export const DEFAULT_PLATFORM_CONFIGURATION: PlatformConfiguration = {
  mode: "institutional",
  engineVersion: "9F.32.0",
  snapshotRetention: 100,
  auditRetention: 1_000,
  maxAuditEntries: 500,
  institutionalMode: true,
  orchestrationOnly: true,
  requireAllEngines: true,
  productionReadyThreshold: 80,
  conditionalReadyThreshold: 65,
  blockedThreshold: 45,
  healthWeights: {
    trust: 0.12,
    readiness: 0.12,
    compliance: 0.1,
    security: 0.1,
    reliability: 0.1,
    performance: 0.1,
    explainability: 0.08,
    documentation: 0.08,
    coverage: 0.1,
    certification: 0.1,
  },
};

export type PlatformConfigurationInput = Partial<
  Omit<PlatformConfiguration, "healthWeights">
> & {
  healthWeights?: Partial<PlatformHealthWeights>;
};

export function resolvePlatformConfiguration(
  input?: PlatformConfigurationInput
): PlatformConfiguration {
  const base = DEFAULT_PLATFORM_CONFIGURATION;
  return {
    ...base,
    ...input,
    healthWeights: {
      ...base.healthWeights,
      ...input?.healthWeights,
    },
    snapshotRetention: Math.max(
      1,
      input?.snapshotRetention ?? base.snapshotRetention
    ),
    auditRetention: Math.max(1, input?.auditRetention ?? base.auditRetention),
    maxAuditEntries: Math.max(
      1,
      input?.maxAuditEntries ?? base.maxAuditEntries
    ),
    productionReadyThreshold: clamp(
      input?.productionReadyThreshold ?? base.productionReadyThreshold,
      1,
      100
    ),
    conditionalReadyThreshold: clamp(
      input?.conditionalReadyThreshold ?? base.conditionalReadyThreshold,
      1,
      100
    ),
    blockedThreshold: clamp(
      input?.blockedThreshold ?? base.blockedThreshold,
      0,
      100
    ),
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
