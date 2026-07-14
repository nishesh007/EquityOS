/**
 * Read-only Sprint 9F institutional health snapshot for dashboard UI.
 * Calls existing engine getters only — no scoring / validation mutation.
 */

import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";

export async function fetchInstitutionalPlatformSnapshot(): Promise<InstitutionalPlatformSnapshot> {
  try {
    const [
      { getPlatformHealth },
      { getDashboardSummary },
      { getTrustMetrics, registerTrustEngine },
      { getExplainabilityMetrics, registerExplainability },
    ] = await Promise.all([
      import("@/src/core/dataIntegrity/platform"),
      import("@/src/core/dataIntegrity/dashboard"),
      import("@/src/core/dataIntegrity/trust"),
      import("@/src/core/dataIntegrity/explainability"),
    ]);

    registerTrustEngine();
    registerExplainability();

    return {
      platform: getPlatformHealth(),
      dashboard: getDashboardSummary(),
      trust: getTrustMetrics(),
      explainability: getExplainabilityMetrics(),
    };
  } catch {
    return {
      platform: null,
      dashboard: null,
      trust: null,
      explainability: null,
    };
  }
}
