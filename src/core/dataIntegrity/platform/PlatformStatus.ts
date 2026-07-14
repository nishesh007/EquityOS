/**
 * Platform status model.
 */

import type { PlatformEngineRecord } from "./PlatformRegistry";
import type { PlatformHealthReport } from "./PlatformHealth";
import type { PlatformCertificationStatus } from "./PlatformCertification";

export interface PlatformStatus {
  initialized: boolean;
  engineVersion: string;
  certificationStatus: PlatformCertificationStatus | "uninitialized";
  health: PlatformHealthReport;
  engines: PlatformEngineRecord[];
  warnings: string[];
  errors: string[];
  updatedAt: string;
}

export function createUninitializedStatus(
  engineVersion: string
): PlatformStatus {
  return {
    initialized: false,
    engineVersion,
    certificationStatus: "uninitialized",
    health: {
      overallHealthScore: 0,
      overallTrustScore: 0,
      overallReadiness: 0,
      overallCompliance: 0,
      overallSecurity: 0,
      overallReliability: 0,
      overallPerformance: 0,
      overallExplainability: 0,
      overallDocumentation: 0,
      overallCoverage: 0,
      overallCertification: 0,
      overallRisk: 100,
      overallValidationStatus: "unknown",
      engineCount: 0,
      registeredCount: 0,
      healthyCount: 0,
    },
    engines: [],
    warnings: ["Platform not initialized"],
    errors: [],
    updatedAt: new Date().toISOString(),
  };
}
