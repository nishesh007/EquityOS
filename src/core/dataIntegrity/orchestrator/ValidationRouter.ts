/**
 * Routes validation requests to the minimal required engine set.
 */

import type {
  ValidationConfiguration,
  ValidationEngineId,
  ValidationExecutionMode,
  ValidationPipelineId,
} from "./ValidationConfiguration";
import type { ValidationRequest } from "./ValidationRequest";
import {
  buildExecutionPlan,
  type ValidationExecutionPlan,
} from "./ValidationExecutionPlan";
import { getRegisteredValidationEngines } from "./ValidationRegistry";

export class ValidationRouter {
  constructor(private readonly config: ValidationConfiguration) {}

  route(request: ValidationRequest): ValidationExecutionPlan {
    const mode: ValidationExecutionMode =
      request.mode ?? this.config.defaultMode;
    const pipelineId: ValidationPipelineId | undefined =
      request.pipeline ??
      (mode === "CUSTOM" ? undefined : this.inferPipeline(request));

    let engines: ValidationEngineId[] = [];

    if (request.engines && request.engines.length > 0) {
      engines = [...request.engines];
    } else if (pipelineId && this.config.pipelines[pipelineId]) {
      engines = [...this.config.pipelines[pipelineId]!];
    } else if (mode === "CUSTOM") {
      engines = getRegisteredValidationEngines().map((e) => e.id);
    } else {
      engines = [...(this.config.modeEngines[mode] ?? [])];
    }

    // Avoid unnecessary validations for narrow scopes
    if (request.validationScope === "SCORES_ONLY") {
      engines = engines.filter((e) =>
        [
          "dataIntegrity",
          "trust",
          "hallucination",
          "historical",
          "recommendation",
          "tradeSetup",
        ].includes(e)
      );
    }

    // Only keep engines that are registered (future-proof + avoid dead routes)
    const registered = new Set(
      getRegisteredValidationEngines().map((e) => e.id)
    );
    if (registered.size > 0) {
      engines = engines.filter((e) => registered.has(e));
    }

    const parallel =
      request.executionStrategy === "PARALLEL" ||
      request.executionStrategy === "PIPELINE";

    return buildExecutionPlan({
      config: this.config,
      requested: engines,
      pipelineId,
      mode,
      parallel,
    });
  }

  private inferPipeline(request: ValidationRequest): ValidationPipelineId {
    switch (request.kind) {
      case "AI":
        return "AIValidation";
      case "RESEARCH":
        return "ResearchValidation";
      case "RECOMMENDATION":
        return "RecommendationValidation";
      case "PORTFOLIO":
        return "PortfolioValidation";
      case "TRADE":
        return "TradeValidation";
      case "STOCK":
        return "QuickValidation";
      default:
        return this.config.defaultPipeline;
    }
  }
}
