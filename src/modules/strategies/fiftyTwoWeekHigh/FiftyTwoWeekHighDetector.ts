/**
 * 52-Week High Detector — Sprint 11B.3S.
 */

import type { FiftyTwoWeekHighConfig } from "./FiftyTwoWeekHighConstants";
import type {
  FiftyTwoWeekHighDetection,
  FiftyTwoWeekHighDetectionContext,
} from "./FiftyTwoWeekHighTypes";
import {
  createEmptyFiftyTwoWeekHighDetection,
  detectFiftyTwoWeekHigh,
  resolveFiftyTwoWeekHighConfig,
} from "./FiftyTwoWeekHighUtils";
import { FiftyTwoWeekHighValidator } from "./FiftyTwoWeekHighValidator";

export class FiftyTwoWeekHighDetector {
  private readonly config: FiftyTwoWeekHighConfig;
  private readonly validator: FiftyTwoWeekHighValidator;
  private lastDetection: FiftyTwoWeekHighDetection | null = null;

  constructor(config?: Partial<FiftyTwoWeekHighConfig>) {
    this.config = resolveFiftyTwoWeekHighConfig(config);
    this.validator = new FiftyTwoWeekHighValidator(this.config);
  }

  detect(
    context: FiftyTwoWeekHighDetectionContext | null | undefined
  ): FiftyTwoWeekHighDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyFiftyTwoWeekHighDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectFiftyTwoWeekHigh({
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
          : "52-Week High detection failed.";
      const empty = createEmptyFiftyTwoWeekHighDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): FiftyTwoWeekHighDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): FiftyTwoWeekHighConfig {
    return resolveFiftyTwoWeekHighConfig(this.config);
  }
}

let detectorSingleton: FiftyTwoWeekHighDetector | null = null;

export function getFiftyTwoWeekHighDetector(
  config?: Partial<FiftyTwoWeekHighConfig>
): FiftyTwoWeekHighDetector {
  if (!detectorSingleton)
    detectorSingleton = new FiftyTwoWeekHighDetector(config);
  return detectorSingleton;
}

export function resetFiftyTwoWeekHighDetector(): void {
  detectorSingleton = null;
}
