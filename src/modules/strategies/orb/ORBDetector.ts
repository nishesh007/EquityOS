/**
 * ORB Detector — Sprint 11B.3B.1.
 * Orchestrates validation + pure detection utilities.
 */

import type { ORBConfig } from "./ORBConstants";
import type { ORBDetection, ORBDetectionContext } from "./ORBTypes";
import {
  createEmptyORBDetection,
  detectORB,
  resolveORBConfig,
} from "./ORBUtils";
import { ORBValidator } from "./ORBValidator";

export class ORBDetector {
  private readonly config: ORBConfig;
  private readonly validator: ORBValidator;
  private lastDetection: ORBDetection | null = null;

  constructor(config?: Partial<ORBConfig>) {
    this.config = resolveORBConfig(config);
    this.validator = new ORBValidator(this.config);
  }

  /**
   * Run ORB detection. Never throws.
   */
  detect(context: ORBDetectionContext | null | undefined): ORBDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyORBDetection(
          [...validation.warnings],
          [],
        );
        empty.warnings = [
          ...validation.errors,
          ...validation.warnings,
        ];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectORB({
        ...context,
        config: this.config,
      });
      detection.warnings = [
        ...validation.warnings,
        ...detection.warnings,
      ];
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ORB detection failed.";
      const empty = createEmptyORBDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): ORBDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): ORBConfig {
    return resolveORBConfig(this.config);
  }
}

let detectorSingleton: ORBDetector | null = null;

export function getORBDetector(config?: Partial<ORBConfig>): ORBDetector {
  if (!detectorSingleton) {
    detectorSingleton = new ORBDetector(config);
  }
  return detectorSingleton;
}

export function resetORBDetector(): void {
  detectorSingleton = null;
}
