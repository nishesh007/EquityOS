/**
 * VWAP Continuation Detector — Sprint 11B.3C.1.
 * Orchestrates validation + pure detection utilities.
 */

import type { VWAPContinuationConfig } from "./VWAPContinuationConstants";
import type {
  VWAPContinuationDetection,
  VWAPContinuationDetectionContext,
} from "./VWAPContinuationTypes";
import {
  createEmptyVWAPContinuationDetection,
  detectVWAPContinuation,
  resolveVWAPContinuationConfig,
} from "./VWAPContinuationUtils";
import { VWAPContinuationValidator } from "./VWAPContinuationValidator";

export class VWAPContinuationDetector {
  private readonly config: VWAPContinuationConfig;
  private readonly validator: VWAPContinuationValidator;
  private lastDetection: VWAPContinuationDetection | null = null;

  constructor(config?: Partial<VWAPContinuationConfig>) {
    this.config = resolveVWAPContinuationConfig(config);
    this.validator = new VWAPContinuationValidator(this.config);
  }

  /**
   * Run VWAP Continuation detection. Never throws.
   */
  detect(
    context: VWAPContinuationDetectionContext | null | undefined
  ): VWAPContinuationDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyVWAPContinuationDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectVWAPContinuation({
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
          : "VWAP Continuation detection failed.";
      const empty = createEmptyVWAPContinuationDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): VWAPContinuationDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): VWAPContinuationConfig {
    return resolveVWAPContinuationConfig(this.config);
  }
}

let detectorSingleton: VWAPContinuationDetector | null = null;

export function getVWAPContinuationDetector(
  config?: Partial<VWAPContinuationConfig>
): VWAPContinuationDetector {
  if (!detectorSingleton) {
    detectorSingleton = new VWAPContinuationDetector(config);
  }
  return detectorSingleton;
}

export function resetVWAPContinuationDetector(): void {
  detectorSingleton = null;
}
