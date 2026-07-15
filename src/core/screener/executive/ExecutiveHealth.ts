/**
 * Executive Screener Health — overall institutional screener health (9D.R8).
 */

import {
  EXECUTIVE_SCREENER_EMPTY,
  formatPct,
  formatScore,
  safeNumeric,
  type ScreenerHealthView,
} from "./ExecutiveScreenerModels";
import type { ExecutiveScreenerMetricBundle } from "./ExecutiveMetrics";

export class ExecutiveHealth {
  build(metrics: ExecutiveScreenerMetricBundle): ScreenerHealthView {
    const inactive =
      metrics.runs === 0 &&
      metrics.savedScreenCount === 0 &&
      metrics.opportunityCount === 0 &&
      metrics.strategyCount === 0;

    if (inactive) {
      return {
        overallHealthScore: 0,
        overallHealthLabel: "—",
        institutionalScore: 0,
        institutionalScoreLabel: "—",
        universeCoverage: 0,
        universeCoverageLabel: "—",
        screenSuccessRate: 0,
        screenSuccessRateLabel: "—",
        averageTrust: 0,
        averageTrustLabel: "—",
        averageValidation: 0,
        averageValidationLabel: "—",
        aiConfidence: 0,
        aiConfidenceLabel: "—",
        empty: true,
        emptyMessage: EXECUTIVE_SCREENER_EMPTY.awaitingScan,
      };
    }

    const institutional = safeNumeric(metrics.institutionalScore, 0);
    const coverage = safeNumeric(metrics.universeCoverage, 0);
    const success = safeNumeric(metrics.screenSuccessRate, 0);
    const trust = safeNumeric(metrics.averageTrust, 0);
    const validation = safeNumeric(metrics.averageValidation, 0);
    const confidence = safeNumeric(metrics.aiConfidence, 0);

    const cacheTotal = metrics.cacheHit + metrics.cacheMiss;
    const cacheBoost =
      cacheTotal === 0
        ? 50
        : Math.min(100, Math.round((metrics.cacheHit / cacheTotal) * 100));

    const overall = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          institutional * 0.25 +
            trust * 0.2 +
            validation * 0.2 +
            confidence * 0.15 +
            success * 0.1 +
            coverage * 0.05 +
            cacheBoost * 0.05
        )
      )
    );

    return {
      overallHealthScore: overall,
      overallHealthLabel: formatScore(overall),
      institutionalScore: institutional,
      institutionalScoreLabel: formatScore(institutional),
      universeCoverage: coverage,
      universeCoverageLabel: formatPct(coverage),
      screenSuccessRate: success,
      screenSuccessRateLabel: formatPct(success),
      averageTrust: trust,
      averageTrustLabel: formatPct(trust),
      averageValidation: validation,
      averageValidationLabel: formatPct(validation),
      aiConfidence: confidence,
      aiConfidenceLabel: formatPct(confidence),
      empty: false,
      emptyMessage: EXECUTIVE_SCREENER_EMPTY.noScreeningResults,
    };
  }
}
