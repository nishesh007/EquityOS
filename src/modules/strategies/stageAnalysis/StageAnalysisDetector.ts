/**
 * Stage Analysis Detector — Sprint 11B.3M.
 */

import type { StageAnalysisConfig } from "./StageAnalysisConstants";
import type {
  StageAnalysisDetection,
  StageAnalysisDetectionContext,
} from "./StageAnalysisTypes";
import {
  createEmptyStageAnalysisDetection,
  detectStageAnalysis,
  resolveStageAnalysisConfig,
} from "./StageAnalysisUtils";
import { StageAnalysisValidator } from "./StageAnalysisValidator";

export class StageAnalysisDetector {
  private readonly config: StageAnalysisConfig;
  private readonly validator: StageAnalysisValidator;
  private lastDetection: StageAnalysisDetection | null = null;

  constructor(config?: Partial<StageAnalysisConfig>) {
    this.config = resolveStageAnalysisConfig(config);
    this.validator = new StageAnalysisValidator(this.config);
  }

  detect(
    context: StageAnalysisDetectionContext | null | undefined
  ): StageAnalysisDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyStageAnalysisDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectStageAnalysis({
        ...context,
        config: this.config,
      });
      detection.warnings = [...validation.warnings, ...detection.warnings];
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Stage Analysis detection failed.";
      const empty = createEmptyStageAnalysisDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): StageAnalysisDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): StageAnalysisConfig {
    return resolveStageAnalysisConfig(this.config);
  }
}

let detectorSingleton: StageAnalysisDetector | null = null;

export function getStageAnalysisDetector(
  config?: Partial<StageAnalysisConfig>
): StageAnalysisDetector {
  if (!detectorSingleton) {
    detectorSingleton = new StageAnalysisDetector(config);
  }
  return detectorSingleton;
}

export function resetStageAnalysisDetector(): void {
  detectorSingleton = null;
}
