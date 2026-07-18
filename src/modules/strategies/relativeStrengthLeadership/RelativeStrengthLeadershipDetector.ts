/**
 * Relative Strength Leadership Detector — Sprint 11B.3O.
 */

import type { RelativeStrengthLeadershipConfig } from "./RelativeStrengthLeadershipConstants";
import type {
  RelativeStrengthLeadershipDetection,
  RelativeStrengthLeadershipDetectionContext,
} from "./RelativeStrengthLeadershipTypes";
import {
  createEmptyRelativeStrengthLeadershipDetection,
  detectRelativeStrengthLeadership,
  resolveRelativeStrengthLeadershipConfig,
} from "./RelativeStrengthLeadershipUtils";
import { RelativeStrengthLeadershipValidator } from "./RelativeStrengthLeadershipValidator";

export class RelativeStrengthLeadershipDetector {
  private readonly config: RelativeStrengthLeadershipConfig;
  private readonly validator: RelativeStrengthLeadershipValidator;
  private lastDetection: RelativeStrengthLeadershipDetection | null = null;

  constructor(config?: Partial<RelativeStrengthLeadershipConfig>) {
    this.config = resolveRelativeStrengthLeadershipConfig(config);
    this.validator = new RelativeStrengthLeadershipValidator(this.config);
  }

  detect(
    context: RelativeStrengthLeadershipDetectionContext | null | undefined
  ): RelativeStrengthLeadershipDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyRelativeStrengthLeadershipDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectRelativeStrengthLeadership({
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
          : "Relative Strength Leadership detection failed.";
      const empty = createEmptyRelativeStrengthLeadershipDetection(
        [message],
        []
      );
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): RelativeStrengthLeadershipDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): RelativeStrengthLeadershipConfig {
    return resolveRelativeStrengthLeadershipConfig(this.config);
  }
}

let detectorSingleton: RelativeStrengthLeadershipDetector | null = null;

export function getRelativeStrengthLeadershipDetector(
  config?: Partial<RelativeStrengthLeadershipConfig>
): RelativeStrengthLeadershipDetector {
  if (!detectorSingleton)
    detectorSingleton = new RelativeStrengthLeadershipDetector(config);
  return detectorSingleton;
}

export function resetRelativeStrengthLeadershipDetector(): void {
  detectorSingleton = null;
}
