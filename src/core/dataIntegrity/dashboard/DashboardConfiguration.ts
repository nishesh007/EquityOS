/**
 * Institutional Validation Dashboard — configuration.
 * All intervals, thresholds, and retention live here; no magic numbers elsewhere.
 */

export type DashboardMode = "strict" | "relaxed";

export interface DashboardHealthThresholds {
  excellent: number;
  healthy: number;
  stable: number;
  needsAttention: number;
}

export interface DashboardTrendWindows {
  todayHours: number;
  yesterdayHours: number;
  shortDays: number;
  mediumDays: number;
  longDays: number;
}

export interface DashboardConfiguration {
  mode: DashboardMode;
  engineVersion: string;
  refreshIntervalMs: number;
  cacheTtlMs: number;
  backgroundRefreshEnabled: boolean;
  trendWindows: DashboardTrendWindows;
  healthThresholds: DashboardHealthThresholds;
  snapshotRetention: number;
  maxTopFailures: number;
  maxAuditEntries: number;
  /** Weight of each health component in overall health (must be normalizable). */
  healthWeights: {
    validationEngine: number;
    ruleEngine: number;
    trustEngine: number;
    historicalEngine: number;
    recommendation: number;
    market: number;
    technical: number;
    fundamental: number;
  };
  /** Minimum success % considered healthy for a module. */
  moduleHealthySuccessRate: number;
  /** Runtime ms above which module health is downgraded. */
  moduleSlowRuntimeMs: number;
  deteriorationDropThreshold: number;
}

export const DEFAULT_DASHBOARD_CONFIGURATION: DashboardConfiguration = {
  mode: "strict",
  engineVersion: "9F.11.0",
  refreshIntervalMs: 30_000,
  cacheTtlMs: 15_000,
  backgroundRefreshEnabled: true,
  trendWindows: {
    todayHours: 24,
    yesterdayHours: 48,
    shortDays: 7,
    mediumDays: 30,
    longDays: 90,
  },
  healthThresholds: {
    excellent: 95,
    healthy: 90,
    stable: 80,
    needsAttention: 70,
  },
  snapshotRetention: 100,
  maxTopFailures: 10,
  maxAuditEntries: 500,
  healthWeights: {
    validationEngine: 0.15,
    ruleEngine: 0.1,
    trustEngine: 0.2,
    historicalEngine: 0.1,
    recommendation: 0.15,
    market: 0.1,
    technical: 0.1,
    fundamental: 0.1,
  },
  moduleHealthySuccessRate: 85,
  moduleSlowRuntimeMs: 5_000,
  deteriorationDropThreshold: 5,
};

export type DashboardConfigurationInput = Partial<
  Omit<
    DashboardConfiguration,
    "trendWindows" | "healthThresholds" | "healthWeights"
  >
> & {
  trendWindows?: Partial<DashboardTrendWindows>;
  healthThresholds?: Partial<DashboardHealthThresholds>;
  healthWeights?: Partial<DashboardConfiguration["healthWeights"]>;
};

export function resolveDashboardConfiguration(
  input?: DashboardConfigurationInput
): DashboardConfiguration {
  return {
    ...DEFAULT_DASHBOARD_CONFIGURATION,
    ...input,
    trendWindows: {
      ...DEFAULT_DASHBOARD_CONFIGURATION.trendWindows,
      ...(input?.trendWindows ?? {}),
    },
    healthThresholds: {
      ...DEFAULT_DASHBOARD_CONFIGURATION.healthThresholds,
      ...(input?.healthThresholds ?? {}),
    },
    healthWeights: {
      ...DEFAULT_DASHBOARD_CONFIGURATION.healthWeights,
      ...(input?.healthWeights ?? {}),
    },
  };
}
