import type {
  ConstraintDefinition,
  ParameterDefinition,
  ParameterState,
  ParameterValidationStatus,
} from "./types";

export const DEFAULT_PARAMETERS: readonly ParameterDefinition[] = [
  {
    id: "short_ma",
    group: "Moving Average",
    label: "Short MA",
    type: "integer",
    current: 10,
    min: 2,
    max: 50,
    increment: 1,
    enabled: true,
  },
  {
    id: "long_ma",
    group: "Moving Average",
    label: "Long MA",
    type: "integer",
    current: 50,
    min: 20,
    max: 200,
    increment: 5,
    enabled: true,
  },
  {
    id: "rsi_period",
    group: "Momentum",
    label: "RSI Period",
    type: "integer",
    current: 14,
    min: 5,
    max: 30,
    increment: 1,
    enabled: true,
  },
  {
    id: "adx_threshold",
    group: "Momentum",
    label: "ADX Threshold",
    type: "number",
    current: 25,
    min: 10,
    max: 50,
    increment: 1,
    enabled: true,
  },
  {
    id: "ema_period",
    group: "Trend",
    label: "EMA Period",
    type: "integer",
    current: 21,
    min: 5,
    max: 100,
    increment: 1,
    enabled: false,
  },
  {
    id: "breakout_lookback",
    group: "Trend",
    label: "Breakout Lookback",
    type: "integer",
    current: 20,
    min: 5,
    max: 60,
    increment: 1,
    enabled: true,
  },
  {
    id: "atr_length",
    group: "Risk",
    label: "ATR Length",
    type: "integer",
    current: 14,
    min: 5,
    max: 40,
    increment: 1,
    enabled: true,
  },
  {
    id: "stop_loss_pct",
    group: "Risk",
    label: "Stop Loss %",
    type: "percentage",
    current: 2.5,
    min: 0.5,
    max: 10,
    increment: 0.25,
    unit: "%",
    enabled: true,
  },
  {
    id: "target_pct",
    group: "Risk",
    label: "Target %",
    type: "percentage",
    current: 5,
    min: 1,
    max: 25,
    increment: 0.5,
    unit: "%",
    enabled: true,
  },
  {
    id: "risk_pct",
    group: "Risk",
    label: "Risk %",
    type: "percentage",
    current: 1,
    min: 0.25,
    max: 5,
    increment: 0.25,
    unit: "%",
    enabled: true,
  },
  {
    id: "volume_multiplier",
    group: "Volume",
    label: "Volume Multiplier",
    type: "number",
    current: 1.5,
    min: 1,
    max: 5,
    increment: 0.1,
    enabled: true,
  },
  {
    id: "holding_period",
    group: "Holding",
    label: "Holding Period",
    type: "integer",
    current: 10,
    min: 1,
    max: 60,
    increment: 1,
    unit: "days",
    enabled: true,
  },
  {
    id: "use_trailing_stop",
    group: "Risk",
    label: "Trailing Stop",
    type: "boolean",
    current: true,
    enabled: false,
  },
  {
    id: "session_filter",
    group: "Holding",
    label: "Session Filter",
    type: "dropdown",
    current: "Regular",
    options: ["Regular", "Extended", "Overnight"],
    enabled: false,
  },
  {
    id: "entry_band",
    group: "Trend",
    label: "Entry Band",
    type: "range",
    current: 0.5,
    min: 0,
    max: 2,
    increment: 0.1,
    unit: "%",
    enabled: false,
  },
] as const;

export const DEFAULT_CONSTRAINTS: readonly ConstraintDefinition[] = [
  {
    id: "max_drawdown",
    label: "Maximum Drawdown",
    operator: "<",
    value: 15,
    unit: "%",
    enabled: true,
  },
  {
    id: "min_win_rate",
    label: "Minimum Win Rate",
    operator: ">",
    value: 55,
    unit: "%",
    enabled: true,
  },
  {
    id: "min_profit_factor",
    label: "Minimum Profit Factor",
    operator: ">",
    value: 1.6,
    enabled: true,
  },
  {
    id: "min_trades",
    label: "Minimum Trades",
    operator: ">",
    value: 100,
    enabled: true,
  },
  {
    id: "max_holding_days",
    label: "Maximum Holding Days",
    operator: "<",
    value: 30,
    unit: "days",
    enabled: true,
  },
  {
    id: "min_risk_reward",
    label: "Minimum Risk Reward",
    operator: ">",
    value: 2,
    enabled: true,
  },
] as const;

function roundToIncrement(value: number, increment: number): number {
  if (!Number.isFinite(increment) || increment <= 0) return value;
  const precision = Math.max(
    0,
    (String(increment).split(".")[1] ?? "").length
  );
  const rounded = Math.round(value / increment) * increment;
  return Number(rounded.toFixed(precision));
}

export function validateParameter(
  param: ParameterDefinition | ParameterState
): { status: ParameterValidationStatus; error?: string } {
  if (!param.enabled) {
    return { status: "disabled" };
  }

  if (param.type === "boolean" || param.type === "dropdown") {
    if (param.type === "dropdown" && param.options) {
      if (!param.options.includes(String(param.current))) {
        return {
          status: "invalid",
          error: "Selected option is not available.",
        };
      }
    }
    return { status: "valid" };
  }

  const numeric = Number(param.current);
  if (!Number.isFinite(numeric)) {
    return { status: "invalid", error: "Value must be a finite number." };
  }

  if (param.type === "integer" && !Number.isInteger(numeric)) {
    return { status: "invalid", error: "Value must be an integer." };
  }

  if (param.min != null && numeric < param.min) {
    return {
      status: "overflow",
      error: `Below minimum (${param.min}${param.unit ?? ""}).`,
    };
  }
  if (param.max != null && numeric > param.max) {
    return {
      status: "overflow",
      error: `Above maximum (${param.max}${param.unit ?? ""}).`,
    };
  }

  return { status: "valid" };
}

export function hydrateParameters(
  defs: readonly ParameterDefinition[] = DEFAULT_PARAMETERS
): ParameterState[] {
  return defs.map((def) => {
    const { status, error } = validateParameter(def);
    return { ...def, status, error };
  });
}

export function updateParameterValue(
  parameters: ParameterState[],
  id: string,
  value: number | boolean | string
): ParameterState[] {
  return parameters.map((p) => {
    if (p.id !== id) return p;
    let nextValue = value;
    if (
      typeof value === "number" &&
      p.increment != null &&
      (p.type === "integer" ||
        p.type === "number" ||
        p.type === "percentage" ||
        p.type === "range")
    ) {
      nextValue = roundToIncrement(value, p.increment);
      if (p.type === "integer") nextValue = Math.round(nextValue);
    }
    const next = { ...p, current: nextValue };
    const { status, error } = validateParameter(next);
    return { ...next, status, error };
  });
}

export function updateParameterBounds(
  parameters: ParameterState[],
  id: string,
  patch: Partial<Pick<ParameterState, "min" | "max" | "increment" | "enabled">>
): ParameterState[] {
  return parameters.map((p) => {
    if (p.id !== id) return p;
    const next = { ...p, ...patch };
    if (
      next.min != null &&
      next.max != null &&
      next.min > next.max
    ) {
      return {
        ...next,
        status: "invalid" as const,
        error: "Minimum cannot exceed maximum.",
      };
    }
    const { status, error } = validateParameter(next);
    return { ...next, status, error };
  });
}

export function resetParameter(
  parameters: ParameterState[],
  id: string
): ParameterState[] {
  const def = DEFAULT_PARAMETERS.find((d) => d.id === id);
  if (!def) return parameters;
  return parameters.map((p) => {
    if (p.id !== id) return p;
    const next = { ...def };
    const { status, error } = validateParameter(next);
    return { ...next, status, error };
  });
}

export function cloneConstraints(
  defs: readonly ConstraintDefinition[] = DEFAULT_CONSTRAINTS
): ConstraintDefinition[] {
  return defs.map((c) => ({ ...c }));
}
