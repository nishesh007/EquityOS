import type {
  ConstraintDefinition,
  ConstraintValidation,
  ParameterState,
} from "./types";

/**
 * Constraint conflict rules — prevent invalid combinations immediately.
 */
export function validateConstraints(
  constraints: readonly ConstraintDefinition[],
  parameters: readonly ParameterState[]
): ConstraintValidation[] {
  const byId = Object.fromEntries(constraints.map((c) => [c.id, c]));
  const holding = parameters.find((p) => p.id === "holding_period");
  const stop = parameters.find((p) => p.id === "stop_loss_pct");
  const target = parameters.find((p) => p.id === "target_pct");

  return constraints.map((c) => {
    if (!c.enabled) {
      return { id: c.id, valid: true };
    }

    if (!Number.isFinite(c.value)) {
      return {
        id: c.id,
        valid: false,
        message: "Constraint value must be a finite number.",
      };
    }

    if (c.value < 0) {
      return {
        id: c.id,
        valid: false,
        message: "Constraint value cannot be negative.",
      };
    }

    if (c.id === "max_drawdown" && (c.value <= 0 || c.value > 100)) {
      return {
        id: c.id,
        valid: false,
        message: "Maximum drawdown must be between 0% and 100%.",
      };
    }

    if (c.id === "min_win_rate" && (c.value <= 0 || c.value > 100)) {
      return {
        id: c.id,
        valid: false,
        message: "Win rate must be between 0% and 100%.",
      };
    }

    if (c.id === "min_profit_factor" && c.value < 1) {
      return {
        id: c.id,
        valid: false,
        message: "Profit factor below 1 is not institutional-grade.",
      };
    }

    if (c.id === "min_trades" && c.value < 30) {
      return {
        id: c.id,
        valid: false,
        message: "Minimum trades should be at least 30 for statistical significance.",
      };
    }

    if (
      c.id === "max_holding_days" &&
      holding &&
      holding.enabled &&
      typeof holding.current === "number" &&
      holding.current > c.value
    ) {
      return {
        id: c.id,
        valid: false,
        message: `Holding period parameter (${holding.current}d) exceeds max holding days (${c.value}).`,
      };
    }

    if (c.id === "min_risk_reward") {
      if (
        stop &&
        target &&
        typeof stop.current === "number" &&
        typeof target.current === "number" &&
        stop.current > 0
      ) {
        const implied = target.current / stop.current;
        if (implied < c.value) {
          return {
            id: c.id,
            valid: false,
            message: `Implied R:R from Target/Stop (${implied.toFixed(2)}) is below minimum (${c.value}).`,
          };
        }
      }
    }

    const maxDd = byId.max_drawdown;
    const minWr = byId.min_win_rate;
    if (
      c.id === "min_win_rate" &&
      maxDd?.enabled &&
      minWr?.enabled &&
      maxDd.value < 5 &&
      minWr.value > 70
    ) {
      return {
        id: c.id,
        valid: false,
        message:
          "Very low drawdown with very high win-rate is an unrealistic constraint pair.",
      };
    }

    return { id: c.id, valid: true };
  });
}

export function constraintsAreValid(
  results: readonly ConstraintValidation[]
): boolean {
  return results.every((r) => r.valid);
}
