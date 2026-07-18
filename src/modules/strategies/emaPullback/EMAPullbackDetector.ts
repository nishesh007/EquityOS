/**
 * EMA Pullback Detector — Sprint 11B.3P.
 */

import type { EMAPullbackConfig } from "./EMAPullbackConstants";
import type {
  EMAPullbackDetection,
  EMAPullbackDetectionContext,
} from "./EMAPullbackTypes";
import {
  createEmptyEMAPullbackDetection,
  detectEMAPullback,
  resolveEMAPullbackConfig,
} from "./EMAPullbackUtils";
import { EMAPullbackValidator } from "./EMAPullbackValidator";

export class EMAPullbackDetector {
  private readonly config: EMAPullbackConfig;
  private readonly validator: EMAPullbackValidator;
  private lastDetection: EMAPullbackDetection | null = null;

  constructor(config?: Partial<EMAPullbackConfig>) {
    this.config = resolveEMAPullbackConfig(config);
    this.validator = new EMAPullbackValidator(this.config);
  }

  detect(
    context: EMAPullbackDetectionContext | null | undefined
  ): EMAPullbackDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyEMAPullbackDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectEMAPullback({
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
          : "EMA Pullback detection failed.";
      const empty = createEmptyEMAPullbackDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): EMAPullbackDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): EMAPullbackConfig {
    return resolveEMAPullbackConfig(this.config);
  }
}

let detectorSingleton: EMAPullbackDetector | null = null;

export function getEMAPullbackDetector(
  config?: Partial<EMAPullbackConfig>
): EMAPullbackDetector {
  if (!detectorSingleton) detectorSingleton = new EMAPullbackDetector(config);
  return detectorSingleton;
}

export function resetEMAPullbackDetector(): void {
  detectorSingleton = null;
}
