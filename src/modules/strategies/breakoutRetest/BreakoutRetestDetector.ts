/**
 * Breakout Retest Detector — Sprint 11B.3I.
 */

import type { BreakoutRetestConfig } from "./BreakoutRetestConstants";
import type {
  BreakoutRetestDetection,
  BreakoutRetestDetectionContext,
} from "./BreakoutRetestTypes";
import {
  createEmptyBreakoutRetestDetection,
  detectBreakoutRetest,
  resolveBreakoutRetestConfig,
} from "./BreakoutRetestUtils";
import { BreakoutRetestValidator } from "./BreakoutRetestValidator";

export class BreakoutRetestDetector {
  private readonly config: BreakoutRetestConfig;
  private readonly validator: BreakoutRetestValidator;
  private lastDetection: BreakoutRetestDetection | null = null;

  constructor(config?: Partial<BreakoutRetestConfig>) {
    this.config = resolveBreakoutRetestConfig(config);
    this.validator = new BreakoutRetestValidator(this.config);
  }

  detect(
    context: BreakoutRetestDetectionContext | null | undefined
  ): BreakoutRetestDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyBreakoutRetestDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectBreakoutRetest({
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
          : "Breakout Retest detection failed.";
      const empty = createEmptyBreakoutRetestDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): BreakoutRetestDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): BreakoutRetestConfig {
    return resolveBreakoutRetestConfig(this.config);
  }
}

let detectorSingleton: BreakoutRetestDetector | null = null;

export function getBreakoutRetestDetector(
  config?: Partial<BreakoutRetestConfig>
): BreakoutRetestDetector {
  if (!detectorSingleton) {
    detectorSingleton = new BreakoutRetestDetector(config);
  }
  return detectorSingleton;
}

export function resetBreakoutRetestDetector(): void {
  detectorSingleton = null;
}
