/**
 * Earnings Momentum Detector — Sprint 11B.3T.
 */

import type { EarningsMomentumConfig } from "./EarningsMomentumConstants";
import type {
  EarningsMomentumDetection,
  EarningsMomentumDetectionContext,
} from "./EarningsMomentumTypes";
import {
  createEmptyEarningsMomentumDetection,
  detectEarningsMomentum,
  resolveEarningsMomentumConfig,
} from "./EarningsMomentumUtils";
import { EarningsMomentumValidator } from "./EarningsMomentumValidator";

export class EarningsMomentumDetector {
  private readonly config: EarningsMomentumConfig;
  private readonly validator: EarningsMomentumValidator;
  private lastDetection: EarningsMomentumDetection | null = null;

  constructor(config?: Partial<EarningsMomentumConfig>) {
    this.config = resolveEarningsMomentumConfig(config);
    this.validator = new EarningsMomentumValidator(this.config);
  }

  detect(
    context: EarningsMomentumDetectionContext | null | undefined
  ): EarningsMomentumDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyEarningsMomentumDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectEarningsMomentum({
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
          : "Earnings Momentum detection failed.";
      const empty = createEmptyEarningsMomentumDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): EarningsMomentumDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): EarningsMomentumConfig {
    return resolveEarningsMomentumConfig(this.config);
  }
}

let detectorSingleton: EarningsMomentumDetector | null = null;

export function getEarningsMomentumDetector(
  config?: Partial<EarningsMomentumConfig>
): EarningsMomentumDetector {
  if (!detectorSingleton)
    detectorSingleton = new EarningsMomentumDetector(config);
  return detectorSingleton;
}

export function resetEarningsMomentumDetector(): void {
  detectorSingleton = null;
}
