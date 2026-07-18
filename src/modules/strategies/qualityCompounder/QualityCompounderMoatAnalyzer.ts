/**
 * Quality Compounder Moat Analyzer — Sprint 11B.3Y.
 */

import { clamp, round } from "@/lib/engine/utils";
import type { QualityCompounderConfig } from "./QualityCompounderConstants";
import type {
  QualityCompounderMoatAnalysis,
  QualityCompounderMoatClassification,
  QualityCompounderMoatInputs,
} from "./QualityCompounderTypes";

export function analyzeEconomicMoat(
  moat: QualityCompounderMoatInputs,
  config: QualityCompounderConfig
): QualityCompounderMoatAnalysis {
  const reasons: string[] = [];
  const warnings: string[] = [];

  const fields = [
    moat.brand,
    moat.networkEffects,
    moat.switchingCosts,
    moat.costAdvantage,
    moat.patents,
    moat.distribution,
    moat.technology,
    moat.regulatoryAdvantage,
    moat.scaleAdvantage,
    moat.recurringCustomers,
  ].map((v) => clamp(v, 0, 100));

  const score = clamp(
    round(fields.reduce((s, v) => s + v, 0) / fields.length, 1),
    config.scoreFloor,
    config.scoreCeiling
  );

  let classification: QualityCompounderMoatClassification = "No Moat";
  if (score >= config.wideMoatMinScore) classification = "Wide Moat";
  else if (score >= config.narrowMoatMinScore) classification = "Narrow Moat";

  if (classification !== "No Moat") {
    reasons.push("The company possesses a durable economic moat.");
  } else {
    warnings.push("No durable economic moat.");
  }

  return { score, classification, reasons, warnings };
}
