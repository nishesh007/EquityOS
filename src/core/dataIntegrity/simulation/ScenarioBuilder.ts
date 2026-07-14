/**
 * Scenario builder — constructs sandboxed market/config/rule scenarios.
 */

export type ScenarioType =
  | "market_crash"
  | "bull_market"
  | "bear_market"
  | "sideways_market"
  | "high_volatility"
  | "low_liquidity"
  | "corporate_action"
  | "configuration_change"
  | "rule_change"
  | "custom";

export interface ScenarioDefinition {
  scenarioId: string;
  type: ScenarioType;
  label: string;
  description: string;
  marketShock: number;
  volatility: number;
  liquidity: number;
  configurationDrift: number;
  ruleChangeIntensity: number;
  expectedFailureRate: number;
  modules: string[];
  custom?: boolean;
  parameters?: Record<string, number | string | boolean>;
  createdAt: string;
}

export interface BuildScenarioInput {
  scenarioId?: string;
  type: ScenarioType;
  label?: string;
  description?: string;
  marketShock?: number;
  volatility?: number;
  liquidity?: number;
  configurationDrift?: number;
  ruleChangeIntensity?: number;
  expectedFailureRate?: number;
  modules?: string[];
  parameters?: Record<string, number | string | boolean>;
  custom?: boolean;
}

const SCENARIO_DEFAULTS: Record<
  ScenarioType,
  Omit<ScenarioDefinition, "scenarioId" | "label" | "description" | "modules" | "createdAt" | "custom" | "parameters" | "type">
> = {
  market_crash: {
    marketShock: -0.35,
    volatility: 0.85,
    liquidity: 0.3,
    configurationDrift: 0.1,
    ruleChangeIntensity: 0.05,
    expectedFailureRate: 0.45,
  },
  bull_market: {
    marketShock: 0.25,
    volatility: 0.35,
    liquidity: 0.85,
    configurationDrift: 0.05,
    ruleChangeIntensity: 0.05,
    expectedFailureRate: 0.08,
  },
  bear_market: {
    marketShock: -0.2,
    volatility: 0.55,
    liquidity: 0.5,
    configurationDrift: 0.08,
    ruleChangeIntensity: 0.05,
    expectedFailureRate: 0.28,
  },
  sideways_market: {
    marketShock: 0.02,
    volatility: 0.25,
    liquidity: 0.7,
    configurationDrift: 0.04,
    ruleChangeIntensity: 0.02,
    expectedFailureRate: 0.12,
  },
  high_volatility: {
    marketShock: 0,
    volatility: 0.95,
    liquidity: 0.55,
    configurationDrift: 0.12,
    ruleChangeIntensity: 0.1,
    expectedFailureRate: 0.35,
  },
  low_liquidity: {
    marketShock: -0.05,
    volatility: 0.4,
    liquidity: 0.15,
    configurationDrift: 0.06,
    ruleChangeIntensity: 0.04,
    expectedFailureRate: 0.3,
  },
  corporate_action: {
    marketShock: -0.1,
    volatility: 0.5,
    liquidity: 0.6,
    configurationDrift: 0.2,
    ruleChangeIntensity: 0.15,
    expectedFailureRate: 0.22,
  },
  configuration_change: {
    marketShock: 0,
    volatility: 0.3,
    liquidity: 0.75,
    configurationDrift: 0.7,
    ruleChangeIntensity: 0.1,
    expectedFailureRate: 0.18,
  },
  rule_change: {
    marketShock: 0,
    volatility: 0.3,
    liquidity: 0.75,
    configurationDrift: 0.15,
    ruleChangeIntensity: 0.8,
    expectedFailureRate: 0.2,
  },
  custom: {
    marketShock: 0,
    volatility: 0.4,
    liquidity: 0.6,
    configurationDrift: 0.1,
    ruleChangeIntensity: 0.1,
    expectedFailureRate: 0.15,
  },
};

export class ScenarioBuilder {
  private seq = 0;

  build(input: BuildScenarioInput): ScenarioDefinition {
    this.seq += 1;
    const defaults = SCENARIO_DEFAULTS[input.type] ?? SCENARIO_DEFAULTS.custom;
    const scenarioId =
      input.scenarioId ?? `scenario:${input.type}:${this.seq}`;
    return {
      scenarioId,
      type: input.type,
      label: input.label ?? formatLabel(input.type),
      description:
        input.description ??
        `Sandbox scenario for ${formatLabel(input.type)} conditions.`,
      marketShock: input.marketShock ?? defaults.marketShock,
      volatility: input.volatility ?? defaults.volatility,
      liquidity: input.liquidity ?? defaults.liquidity,
      configurationDrift:
        input.configurationDrift ?? defaults.configurationDrift,
      ruleChangeIntensity:
        input.ruleChangeIntensity ?? defaults.ruleChangeIntensity,
      expectedFailureRate:
        input.expectedFailureRate ?? defaults.expectedFailureRate,
      modules: input.modules ? [...input.modules] : ["orchestrator", "rules"],
      custom: input.custom ?? input.type === "custom",
      parameters: input.parameters ? { ...input.parameters } : undefined,
      createdAt: new Date().toISOString(),
    };
  }

  buildPreset(type: ScenarioType): ScenarioDefinition {
    return this.build({ type });
  }

  buildAllPresets(): ScenarioDefinition[] {
    const types: ScenarioType[] = [
      "market_crash",
      "bull_market",
      "bear_market",
      "sideways_market",
      "high_volatility",
      "low_liquidity",
      "corporate_action",
      "configuration_change",
      "rule_change",
    ];
    return types.map((t) => this.buildPreset(t));
  }
}

function formatLabel(type: ScenarioType): string {
  return type
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}
