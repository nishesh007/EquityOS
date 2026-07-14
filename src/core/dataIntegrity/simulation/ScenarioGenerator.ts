/**
 * Scenario generator — produces batch/pipeline/module/replay scenario sets.
 */

import type { SimulationMode } from "./SimulationConfiguration";
import {
  ScenarioBuilder,
  type ScenarioDefinition,
  type ScenarioType,
} from "./ScenarioBuilder";

export interface GenerateScenariosOptions {
  mode?: SimulationMode;
  types?: ScenarioType[];
  count?: number;
  modules?: string[];
}

export class ScenarioGenerator {
  private readonly builder = new ScenarioBuilder();

  generate(options: GenerateScenariosOptions = {}): ScenarioDefinition[] {
    const mode = options.mode ?? "batch";
    const types =
      options.types ??
      ([
        "market_crash",
        "bull_market",
        "bear_market",
        "high_volatility",
        "configuration_change",
      ] as ScenarioType[]);

    if (mode === "single") {
      return [this.builder.buildPreset(types[0] ?? "custom")];
    }

    if (mode === "module") {
      const modules = options.modules ?? ["orchestrator", "trust", "analytics"];
      return modules.map((module, i) =>
        this.builder.build({
          type: types[i % types.length]!,
          modules: [module],
          label: `${formatModule(module)} Module Scenario`,
        })
      );
    }

    if (mode === "pipeline" || mode === "historical_replay") {
      return types.map((type, i) =>
        this.builder.build({
          type,
          label: `${mode} step ${i + 1}: ${type}`,
          modules: options.modules,
        })
      );
    }

    if (mode === "future_projection") {
      return types.slice(0, options.count ?? 3).map((type, i) =>
        this.builder.build({
          type,
          label: `Projection ${i + 1}`,
          volatility: 0.4 + i * 0.1,
          marketShock: -0.05 * (i + 1),
        })
      );
    }

    if (mode === "regression") {
      return [
        this.builder.build({ type: "sideways_market", label: "Baseline" }),
        this.builder.build({
          type: "rule_change",
          label: "Regression Candidate",
          ruleChangeIntensity: 0.9,
          expectedFailureRate: 0.4,
        }),
      ];
    }

    const count = Math.max(1, options.count ?? types.length);
    return Array.from({ length: count }, (_, i) =>
      this.builder.build({
        type: types[i % types.length]!,
        modules: options.modules,
      })
    );
  }
}

function formatModule(module: string): string {
  return module.charAt(0).toUpperCase() + module.slice(1);
}
