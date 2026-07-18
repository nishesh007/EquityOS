/**
 * Flat Base Detector — Sprint 11B.3R.
 */

import type { FlatBaseConfig } from "./FlatBaseConstants";
import type {
  FlatBaseDetection,
  FlatBaseDetectionContext,
} from "./FlatBaseTypes";
import {
  createEmptyFlatBaseDetection,
  detectFlatBase,
  resolveFlatBaseConfig,
} from "./FlatBaseUtils";
import { FlatBaseValidator } from "./FlatBaseValidator";

export class FlatBaseDetector {
  private readonly config: FlatBaseConfig;
  private readonly validator: FlatBaseValidator;
  private lastDetection: FlatBaseDetection | null = null;

  constructor(config?: Partial<FlatBaseConfig>) {
    this.config = resolveFlatBaseConfig(config);
    this.validator = new FlatBaseValidator(this.config);
  }

  detect(
    context: FlatBaseDetectionContext | null | undefined
  ): FlatBaseDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyFlatBaseDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectFlatBase({ ...context, config: this.config });
      detection.warnings = [...validation.warnings, ...detection.warnings];
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Flat Base detection failed.";
      const empty = createEmptyFlatBaseDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): FlatBaseDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): FlatBaseConfig {
    return resolveFlatBaseConfig(this.config);
  }
}

let detectorSingleton: FlatBaseDetector | null = null;

export function getFlatBaseDetector(
  config?: Partial<FlatBaseConfig>
): FlatBaseDetector {
  if (!detectorSingleton) detectorSingleton = new FlatBaseDetector(config);
  return detectorSingleton;
}

export function resetFlatBaseDetector(): void {
  detectorSingleton = null;
}
