/**
 * Darvas Box Detector — Sprint 11B.3N.
 */

import type { DarvasBoxConfig } from "./DarvasBoxConstants";
import type {
  DarvasBoxDetection,
  DarvasBoxDetectionContext,
} from "./DarvasBoxTypes";
import {
  createEmptyDarvasBoxDetection,
  detectDarvasBox,
  resolveDarvasBoxConfig,
} from "./DarvasBoxUtils";
import { DarvasBoxValidator } from "./DarvasBoxValidator";

export class DarvasBoxDetector {
  private readonly config: DarvasBoxConfig;
  private readonly validator: DarvasBoxValidator;
  private lastDetection: DarvasBoxDetection | null = null;

  constructor(config?: Partial<DarvasBoxConfig>) {
    this.config = resolveDarvasBoxConfig(config);
    this.validator = new DarvasBoxValidator(this.config);
  }

  detect(
    context: DarvasBoxDetectionContext | null | undefined
  ): DarvasBoxDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyDarvasBoxDetection([...validation.warnings], []);
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectDarvasBox({ ...context, config: this.config });
      detection.warnings = [...validation.warnings, ...detection.warnings];
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Darvas Box detection failed.";
      const empty = createEmptyDarvasBoxDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): DarvasBoxDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): DarvasBoxConfig {
    return resolveDarvasBoxConfig(this.config);
  }
}

let detectorSingleton: DarvasBoxDetector | null = null;

export function getDarvasBoxDetector(
  config?: Partial<DarvasBoxConfig>
): DarvasBoxDetector {
  if (!detectorSingleton) detectorSingleton = new DarvasBoxDetector(config);
  return detectorSingleton;
}

export function resetDarvasBoxDetector(): void {
  detectorSingleton = null;
}
