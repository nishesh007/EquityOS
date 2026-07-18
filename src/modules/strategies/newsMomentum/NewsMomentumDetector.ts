/**
 * News Momentum Detector — Sprint 11B.3K.
 */

import type { NewsMomentumConfig } from "./NewsMomentumConstants";
import type {
  NewsMomentumDetection,
  NewsMomentumDetectionContext,
} from "./NewsMomentumTypes";
import {
  createEmptyNewsMomentumDetection,
  detectNewsMomentum,
  resolveNewsMomentumConfig,
} from "./NewsMomentumUtils";
import { NewsMomentumValidator } from "./NewsMomentumValidator";

export class NewsMomentumDetector {
  private readonly config: NewsMomentumConfig;
  private readonly validator: NewsMomentumValidator;
  private lastDetection: NewsMomentumDetection | null = null;

  constructor(config?: Partial<NewsMomentumConfig>) {
    this.config = resolveNewsMomentumConfig(config);
    this.validator = new NewsMomentumValidator(this.config);
  }

  detect(
    context: NewsMomentumDetectionContext | null | undefined
  ): NewsMomentumDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyNewsMomentumDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectNewsMomentum({
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
          : "News Momentum detection failed.";
      const empty = createEmptyNewsMomentumDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): NewsMomentumDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): NewsMomentumConfig {
    return resolveNewsMomentumConfig(this.config);
  }
}

let detectorSingleton: NewsMomentumDetector | null = null;

export function getNewsMomentumDetector(
  config?: Partial<NewsMomentumConfig>
): NewsMomentumDetector {
  if (!detectorSingleton) {
    detectorSingleton = new NewsMomentumDetector(config);
  }
  return detectorSingleton;
}

export function resetNewsMomentumDetector(): void {
  detectorSingleton = null;
}
