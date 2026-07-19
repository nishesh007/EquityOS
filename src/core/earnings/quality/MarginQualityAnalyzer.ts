/**
 * Margin quality analyzer — operating / net margin sustainability.
 */

import type { QualityThresholds } from "./QualityConfiguration";
import {
  clampScore,
  num,
  ratio,
  signal,
  type DimensionAnalysisResult,
  type EarningsQualityInput,
  type QualitySignal,
} from "./qualityTypes";

export class MarginQualityAnalyzer {
  analyze(
    input: EarningsQualityInput,
    thresholds: QualityThresholds
  ): DimensionAnalysisResult {
    const warnings: string[] = [];
    const signals: QualitySignal[] = [];
    let score = 100;

    try {
      const rev = num(input.current.revenue);
      const ebit = num(input.current.ebit) ?? num(input.current.ebitda);
      const pat = num(input.current.pat) ?? num(input.current.netIncome);

      const opMargin = ratio(ebit, rev);
      const netMargin = ratio(pat, rev);

      if (rev === null) {
        warnings.push("Revenue missing for margin analysis");
        return { dimension: "margins", score: 55, signals, warnings };
      }

      const prevRev = num(input.previous?.revenue);
      const prevEbit =
        num(input.previous?.ebit) ?? num(input.previous?.ebitda);
      const prevPat =
        num(input.previous?.pat) ?? num(input.previous?.netIncome);
      const prevOp = ratio(prevEbit, prevRev);
      const prevNet = ratio(prevPat, prevRev);

      if (
        opMargin !== null &&
        prevOp !== null &&
        (prevOp - opMargin) * 100 > thresholds.marginDeclinePp
      ) {
        const impact = 20;
        score -= impact;
        signals.push(
          signal({
            checkId: "margin_deterioration",
            dimension: "margins",
            severity: "warning",
            title: "Margin Deterioration",
            message: "Operating margin declined versus prior period.",
            scoreImpact: -impact,
            metrics: {
              operatingMargin: opMargin * 100,
              priorOperatingMargin: prevOp * 100,
            },
          })
        );
      }

      if (
        netMargin !== null &&
        prevNet !== null &&
        (prevNet - netMargin) * 100 > thresholds.marginDeclinePp
      ) {
        const impact = 15;
        score -= impact;
        signals.push(
          signal({
            checkId: "margin_deterioration",
            dimension: "margins",
            severity: "watch",
            title: "Net Margin Deterioration",
            message: "Net margin declined versus prior period.",
            scoreImpact: -impact,
            metrics: {
              netMargin: netMargin * 100,
              priorNetMargin: prevNet * 100,
            },
          })
        );
      }

      if (netMargin !== null && netMargin < 0) {
        score -= 25;
        signals.push(
          signal({
            checkId: "margin_deterioration",
            dimension: "margins",
            severity: "critical",
            title: "Negative Net Margin",
            message: "Company reported a negative net margin.",
            scoreImpact: -25,
            metrics: { netMargin: netMargin * 100 },
          })
        );
      }

      return {
        dimension: "margins",
        score: clampScore(score),
        signals,
        warnings,
      };
    } catch (err) {
      warnings.push(`Margin analysis error: ${String(err)}`);
      return { dimension: "margins", score: 50, signals, warnings };
    }
  }
}
