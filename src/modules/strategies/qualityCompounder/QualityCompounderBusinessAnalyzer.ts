/**
 * Quality Compounder Business Analyzer — Sprint 11B.3Y.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import type {
  QualityCompounderBusinessAnalysis,
  QualityCompounderBusinessInputs,
} from "./QualityCompounderTypes";
import { classifyBusinessGrade } from "./QualityCompounderUtils";

export function analyzeBusinessQuality(
  business: QualityCompounderBusinessInputs,
  config: QualityCompounderConfig
): QualityCompounderBusinessAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const fields = [
    business.businessSimplicity,
    business.businessPredictability,
    business.recurringRevenue,
    business.pricingPower,
    business.brandStrength,
    business.distributionNetwork,
    business.customerStickiness,
    business.marketLeadership,
    business.scalability,
    business.industryPosition,
  ].map((v) => clamp(v, 0, 100));

  const score = clamp(
    round(fields.reduce((s, v) => s + v, 0) / fields.length, 1),
    config.scoreFloor,
    config.scoreCeiling
  );
  const predictability = clamp(business.businessPredictability, 0, 100);
  const grade = classifyBusinessGrade(score, config);

  if (grade === "Exceptional" || grade === "Excellent") {
    reasons.push(
      "Business has demonstrated exceptional long-term capital compounding."
    );
  }
  if (grade === "Weak") warnings.push("Weak business quality.");

  return { score, grade, predictability, reasons, warnings };
}
