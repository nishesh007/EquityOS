/**
 * Platform summary builder.
 */

import type { PlatformHealthReport } from "./PlatformHealth";
import type { PlatformCertificationResult } from "./PlatformCertification";
import type { PlatformEngineRecord } from "./PlatformRegistry";
import type { PlatformStatus } from "./PlatformStatus";

export interface PlatformSummary {
  title: string;
  generatedAt: string;
  initialized: boolean;
  certificationStatus: string;
  healthScore: number;
  risk: number;
  enginesRegistered: number;
  enginesRequired: number;
  highlights: string[];
  risks: string[];
  nextActions: string[];
}

export class PlatformSummaryBuilder {
  build(input: {
    status: PlatformStatus;
    health: PlatformHealthReport;
    certification?: PlatformCertificationResult | null;
    engines: PlatformEngineRecord[];
  }): PlatformSummary {
    const registered = input.engines.filter((e) => e.registered).length;
    const highlights = [
      `Health ${input.health.overallHealthScore}/100 (${input.health.overallValidationStatus})`,
      `Trust ${input.health.overallTrustScore}, Compliance ${input.health.overallCompliance}, Security ${input.health.overallSecurity}`,
      `Coverage ${input.health.overallCoverage}% across ${registered} registered engines`,
    ];
    if (input.certification) {
      highlights.push(input.certification.summary);
    }

    const risks: string[] = [];
    if (input.health.overallRisk >= 40) {
      risks.push(`Elevated platform risk (${input.health.overallRisk})`);
    }
    for (const engine of input.engines.filter((e) => e.registered && !e.healthy)) {
      risks.push(`${engine.label} reported unhealthy`);
    }
    for (const warning of input.certification?.warnings.slice(0, 5) ?? []) {
      risks.push(warning);
    }

    const nextActions: string[] = [];
    if (!input.status.initialized) {
      nextActions.push("Call initializePlatform() to bootstrap Sprint 9F engines");
    } else if (
      input.certification?.status === "production_ready"
    ) {
      nextActions.push("Proceed to Sprint 10A with production-ready platform baseline");
    } else {
      nextActions.push("Review failed certification checks and remediations");
      nextActions.push("Re-run runPlatformCertification() after advisory gaps are addressed");
    }

    return {
      title: "Institutional Validation Platform Summary",
      generatedAt: new Date().toISOString(),
      initialized: input.status.initialized,
      certificationStatus:
        input.certification?.status ?? input.status.certificationStatus,
      healthScore: input.health.overallHealthScore,
      risk: input.health.overallRisk,
      enginesRegistered: registered,
      enginesRequired: input.engines.length,
      highlights,
      risks,
      nextActions,
    };
  }
}
