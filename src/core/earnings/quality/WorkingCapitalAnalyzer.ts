/**
 * Working capital analyzer — receivables, inventory, and WC stress.
 */

import type { QualityThresholds } from "./QualityConfiguration";
import {
  clampScore,
  growthRate,
  num,
  signal,
  type DimensionAnalysisResult,
  type EarningsQualityInput,
} from "./qualityTypes";

export class WorkingCapitalAnalyzer {
  analyze(
    input: EarningsQualityInput,
    thresholds: QualityThresholds
  ): DimensionAnalysisResult {
    const warnings: string[] = [];
    const signals = [];
    let score = 100;

    try {
      const cur = input.current;
      const prev = input.previous;
      if (!prev) {
        warnings.push("No prior period for working capital growth checks");
      }

      const revGrowth = growthRate(num(cur.revenue), num(prev?.revenue));
      const recGrowth = growthRate(num(cur.receivables), num(prev?.receivables));
      const invGrowth = growthRate(num(cur.inventory), num(prev?.inventory));

      if (
        revGrowth !== null &&
        recGrowth !== null &&
        recGrowth - revGrowth > thresholds.receivableGrowthGap
      ) {
        const impact = 20;
        score -= impact;
        signals.push(
          signal({
            checkId: "receivable_growth",
            dimension: "workingCapital",
            severity: "warning",
            title: "Receivable Growth > Revenue Growth",
            message: "Receivables are growing faster than revenue.",
            scoreImpact: -impact,
            metrics: {
              receivableGrowth: recGrowth,
              revenueGrowth: revGrowth,
              gap: recGrowth - revGrowth,
            },
          })
        );
      }

      if (
        revGrowth !== null &&
        invGrowth !== null &&
        invGrowth - revGrowth > thresholds.inventoryGrowthGap
      ) {
        const impact = 18;
        score -= impact;
        signals.push(
          signal({
            checkId: "inventory_growth",
            dimension: "workingCapital",
            severity: "warning",
            title: "Inventory Growth > Sales Growth",
            message: "Inventory is growing faster than sales.",
            scoreImpact: -impact,
            metrics: {
              inventoryGrowth: invGrowth,
              revenueGrowth: revGrowth,
              gap: invGrowth - revGrowth,
            },
          })
        );
      }

      const wc =
        num(cur.currentAssets) !== null && num(cur.currentLiabilities) !== null
          ? (num(cur.currentAssets) as number) -
            (num(cur.currentLiabilities) as number)
          : null;
      const prevWc =
        prev &&
        num(prev.currentAssets) !== null &&
        num(prev.currentLiabilities) !== null
          ? (num(prev.currentAssets) as number) -
            (num(prev.currentLiabilities) as number)
          : null;

      if (wc !== null && wc < 0) {
        const impact = 25;
        score -= impact;
        signals.push(
          signal({
            checkId: "wc_stress",
            dimension: "workingCapital",
            severity: "critical",
            title: "Working Capital Stress",
            message: "Working capital is negative.",
            scoreImpact: -impact,
            metrics: { workingCapital: wc },
          })
        );
      } else if (
        wc !== null &&
        prevWc !== null &&
        prevWc > 0 &&
        wc < prevWc * 0.7
      ) {
        const impact = 15;
        score -= impact;
        signals.push(
          signal({
            checkId: "wc_stress",
            dimension: "workingCapital",
            severity: "watch",
            title: "Working Capital Deterioration",
            message: "Working capital declined sharply versus prior period.",
            scoreImpact: -impact,
            metrics: { workingCapital: wc, priorWorkingCapital: prevWc },
          })
        );
      }

      return {
        dimension: "workingCapital",
        score: clampScore(score),
        signals,
        warnings,
      };
    } catch (err) {
      warnings.push(`Working capital analysis error: ${String(err)}`);
      return { dimension: "workingCapital", score: 50, signals, warnings };
    }
  }
}
