import { constraintsAreValid, validateConstraints } from "./constraints";
import { estimateRuntime } from "./runtime";
import type {
  ConstraintDefinition,
  ParameterState,
  RuntimeEstimate,
  ValidationCheck,
  ValidationState,
} from "./types";

const RUNTIME_HIGH_MINUTES = 15;

export function buildValidationState(
  selectedStrategyId: string | null,
  parameters: readonly ParameterState[],
  constraints: readonly ConstraintDefinition[],
  runtime?: RuntimeEstimate
): ValidationState {
  const strategySelected = Boolean(selectedStrategyId);
  const enabledParams = parameters.filter((p) => p.enabled);
  const parametersValid =
    enabledParams.length > 0 &&
    enabledParams.every((p) => p.status === "valid");

  const constraintResults = validateConstraints(constraints, parameters);
  const constraintsValid = constraintsAreValid(constraintResults);

  const estimate = runtime ?? estimateRuntime(parameters);
  const runtimeHigh = estimate.estimatedRuntimeMinutes >= RUNTIME_HIGH_MINUTES;

  const ready =
    strategySelected && parametersValid && constraintsValid;

  const checks: ValidationCheck[] = [
    {
      id: "strategy",
      label: "Strategy Selected",
      status: strategySelected ? "pass" : "fail",
      message: strategySelected
        ? undefined
        : "Select a strategy to continue.",
    },
    {
      id: "parameters",
      label: "Parameters Valid",
      status: parametersValid ? "pass" : "fail",
      message: parametersValid
        ? undefined
        : enabledParams.length === 0
          ? "Enable at least one parameter for optimization."
          : "Fix invalid or overflowing parameter values.",
    },
    {
      id: "constraints",
      label: "Constraints Valid",
      status: constraintsValid ? "pass" : "fail",
      message: constraintsValid
        ? undefined
        : constraintResults.find((r) => !r.valid)?.message ??
          "Resolve constraint conflicts.",
    },
    {
      id: "runtime",
      label: "Estimated Runtime High",
      status: runtimeHigh ? "warn" : "pass",
      message: runtimeHigh
        ? `Estimated runtime is ${estimate.estimatedRuntime}. Consider narrowing ranges.`
        : "Runtime estimate is within institutional budget.",
    },
    {
      id: "ready",
      label: "Ready For Optimization",
      status: ready ? "pass" : "fail",
      message: ready
        ? "Configuration is valid and ready for the optimization engine."
        : "Complete required configuration before running.",
    },
  ];

  return {
    checks,
    ready,
    strategySelected,
    parametersValid,
    constraintsValid,
    runtimeHigh,
  };
}
