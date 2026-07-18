/**
 * Momentum Continuation Detector — Sprint 11B.3F.
 */

import type { MomentumContinuationConfig } from "./MomentumContinuationConstants";
import type {
  MomentumContinuationDetection,
  MomentumContinuationDetectionContext,
} from "./MomentumContinuationTypes";
import {
  createEmptyMomentumContinuationDetection,
  detectMomentumContinuation,
  resolveMomentumContinuationConfig,
} from "./MomentumContinuationUtils";
import { MomentumContinuationValidator } from "./MomentumContinuationValidator";

export class MomentumContinuationDetector {
  private readonly config: MomentumContinuationConfig;
  private readonly validator: MomentumContinuationValidator;
  private lastDetection: MomentumContinuationDetection | null = null;

  constructor(config?: Partial<MomentumContinuationConfig>) {
    this.config = resolveMomentumContinuationConfig(config);
    this.validator = new MomentumContinuationValidator(this.config);
  }

  detect(
    context: MomentumContinuationDetectionContext | null | undefined
  ): MomentumContinuationDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyMomentumContinuationDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectMomentumContinuation({
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
          : "Momentum Continuation detection failed.";
      const empty = createEmptyMomentumContinuationDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): MomentumContinuationDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): MomentumContinuationConfig {
    return resolveMomentumContinuationConfig(this.config);
  }
}

let detectorSingleton: MomentumContinuationDetector | null = null;

export function getMomentumContinuationDetector(
  config?: Partial<MomentumContinuationConfig>
): MomentumContinuationDetector {
  if (!detectorSingleton) {
    detectorSingleton = new MomentumContinuationDetector(config);
  }
  return detectorSingleton;
}

export function resetMomentumContinuationDetector(): void {
  detectorSingleton = null;
}
