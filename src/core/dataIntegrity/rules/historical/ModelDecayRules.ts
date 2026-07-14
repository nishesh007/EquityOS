/**
 * Model decay detection rules.
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  detectModelDecay,
  configFromContext,
  isPlainObject,
  histFail,
  histPass,
  type HistoricalValidationConfig,
} from "./HistoricalRuleRegistry";

export function createModelDecayRules(
  _config: HistoricalValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "hist.decay.detected",
      name: "Model Decay Detected",
      description: "Reject when model decay signals are present.",
      category: "AI",
      priority: "CRITICAL",
      ruleLevel: "ERROR",
      tags: ["historical", "decay"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        const result = detectModelDecay(ctx.data, cfg);
        if (result.decaying) {
          return histFail({
            field: "modelDecay",
            message: "Model degradation detected.",
            recommendation:
              "Generate degradation alert; pause or recalibrate affected modules.",
            expected: "stable hit rate / accuracy / losses",
            actual: {
              alerts: result.alerts,
              hitRateDrop: result.hitRateDrop,
              accuracyDrop: result.accuracyDrop,
              increasingLosses: result.increasingLosses,
            },
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.decay.sector_indicator_rec",
      name: "Segment Degradation Flags",
      description:
        "Detect sector, indicator, and recommendation-specific degradation.",
      category: "AI",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["historical", "decay"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const flags: string[] = [];
        if (ctx.data.sectorDegradation === true) flags.push("sector");
        if (ctx.data.indicatorDegradation === true) flags.push("indicator");
        if (ctx.data.recommendationDegradation === true) {
          flags.push("recommendation");
        }
        if (flags.length > 0) {
          return histFail({
            field: "modelDecay",
            message: `Degradation in: ${flags.join(", ")}.`,
            recommendation: "Isolate degraded segments and recalibrate.",
            actual: flags,
          });
        }
        return histPass();
      },
    },
    {
      id: "hist.decay.alert_channel",
      name: "Degradation Alert Channel",
      description: "In strict mode, decay requires an alert payload when flagged.",
      category: "AI",
      priority: "LOW",
      ruleLevel: "WARNING",
      tags: ["historical", "decay", "alert"],
      author: "equityos-historical",
      datasetTypes: ["HISTORICAL_DATASET", "BACKTEST_DATASET", "AI_OUTPUT"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data)) return histPass();
        const cfg = configFromContext(ctx);
        if (cfg.mode !== "strict") return histPass();
        const decay = detectModelDecay(ctx.data, cfg);
        if (!decay.decaying) return histPass();
        if (
          ctx.data.degradationAlert !== true &&
          !Array.isArray(ctx.data.degradationAlerts)
        ) {
          return histFail({
            field: "degradationAlert",
            message: "Model decay without degradation alert payload.",
            recommendation: "Emit degradationAlerts for Trust Layer consumers.",
            actual: null,
          });
        }
        return histPass();
      },
    },
  ];
}
