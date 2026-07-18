/**
 * Relative Strength Intraday Detector — Sprint 11B.3G.
 */

import type { RelativeStrengthIntradayConfig } from "./RelativeStrengthIntradayConstants";
import type {
  RelativeStrengthIntradayDetection,
  RelativeStrengthIntradayDetectionContext,
} from "./RelativeStrengthIntradayTypes";
import {
  createEmptyRelativeStrengthIntradayDetection,
  detectRelativeStrengthIntraday,
  resolveRelativeStrengthIntradayConfig,
} from "./RelativeStrengthIntradayUtils";
import { RelativeStrengthIntradayValidator } from "./RelativeStrengthIntradayValidator";

export class RelativeStrengthIntradayDetector {
  private readonly config: RelativeStrengthIntradayConfig;
  private readonly validator: RelativeStrengthIntradayValidator;
  private lastDetection: RelativeStrengthIntradayDetection | null = null;

  constructor(config?: Partial<RelativeStrengthIntradayConfig>) {
    this.config = resolveRelativeStrengthIntradayConfig(config);
    this.validator = new RelativeStrengthIntradayValidator(this.config);
  }

  detect(
    context: RelativeStrengthIntradayDetectionContext | null | undefined
  ): RelativeStrengthIntradayDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyRelativeStrengthIntradayDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectRelativeStrengthIntraday({
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
          : "Relative Strength Intraday detection failed.";
      const empty = createEmptyRelativeStrengthIntradayDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): RelativeStrengthIntradayDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): RelativeStrengthIntradayConfig {
    return resolveRelativeStrengthIntradayConfig(this.config);
  }
}

let detectorSingleton: RelativeStrengthIntradayDetector | null = null;

export function getRelativeStrengthIntradayDetector(
  config?: Partial<RelativeStrengthIntradayConfig>
): RelativeStrengthIntradayDetector {
  if (!detectorSingleton) {
    detectorSingleton = new RelativeStrengthIntradayDetector(config);
  }
  return detectorSingleton;
}

export function resetRelativeStrengthIntradayDetector(): void {
  detectorSingleton = null;
}
