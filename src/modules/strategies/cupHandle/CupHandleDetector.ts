/**
 * Cup & Handle Detector — Sprint 11B.3Q.
 */

import type { CupHandleConfig } from "./CupHandleConstants";
import type {
  CupHandleDetection,
  CupHandleDetectionContext,
} from "./CupHandleTypes";
import {
  createEmptyCupHandleDetection,
  detectCupHandle,
  resolveCupHandleConfig,
} from "./CupHandleUtils";
import { CupHandleValidator } from "./CupHandleValidator";

export class CupHandleDetector {
  private readonly config: CupHandleConfig;
  private readonly validator: CupHandleValidator;
  private lastDetection: CupHandleDetection | null = null;

  constructor(config?: Partial<CupHandleConfig>) {
    this.config = resolveCupHandleConfig(config);
    this.validator = new CupHandleValidator(this.config);
  }

  detect(
    context: CupHandleDetectionContext | null | undefined
  ): CupHandleDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyCupHandleDetection([...validation.warnings], []);
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }
      const detection = detectCupHandle({ ...context, config: this.config });
      detection.warnings = [...validation.warnings, ...detection.warnings];
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cup & Handle detection failed.";
      const empty = createEmptyCupHandleDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): CupHandleDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): CupHandleConfig {
    return resolveCupHandleConfig(this.config);
  }
}

let detectorSingleton: CupHandleDetector | null = null;

export function getCupHandleDetector(
  config?: Partial<CupHandleConfig>
): CupHandleDetector {
  if (!detectorSingleton) detectorSingleton = new CupHandleDetector(config);
  return detectorSingleton;
}

export function resetCupHandleDetector(): void {
  detectorSingleton = null;
}
