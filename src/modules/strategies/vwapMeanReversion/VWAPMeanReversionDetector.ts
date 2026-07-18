/**
 * VWAP Mean Reversion Detector — Sprint 11B.3D.1.
 * Orchestrates validation + pure detection utilities.
 */

import type { VWAPMeanReversionConfig } from "./VWAPMeanReversionConstants";
import type {
  VWAPMeanReversionDetection,
  VWAPMeanReversionDetectionContext,
} from "./VWAPMeanReversionTypes";
import {
  createEmptyVWAPMeanReversionDetection,
  detectVWAPMeanReversion,
  resolveVWAPMeanReversionConfig,
} from "./VWAPMeanReversionUtils";
import { VWAPMeanReversionValidator } from "./VWAPMeanReversionValidator";

export class VWAPMeanReversionDetector {
  private readonly config: VWAPMeanReversionConfig;
  private readonly validator: VWAPMeanReversionValidator;
  private lastDetection: VWAPMeanReversionDetection | null = null;

  constructor(config?: Partial<VWAPMeanReversionConfig>) {
    this.config = resolveVWAPMeanReversionConfig(config);
    this.validator = new VWAPMeanReversionValidator(this.config);
  }

  /**
   * Run VWAP Mean Reversion detection. Never throws.
   */
  detect(
    context: VWAPMeanReversionDetectionContext | null | undefined
  ): VWAPMeanReversionDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyVWAPMeanReversionDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectVWAPMeanReversion({
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
          : "VWAP Mean Reversion detection failed.";
      const empty = createEmptyVWAPMeanReversionDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): VWAPMeanReversionDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): VWAPMeanReversionConfig {
    return resolveVWAPMeanReversionConfig(this.config);
  }
}

let detectorSingleton: VWAPMeanReversionDetector | null = null;

export function getVWAPMeanReversionDetector(
  config?: Partial<VWAPMeanReversionConfig>
): VWAPMeanReversionDetector {
  if (!detectorSingleton) {
    detectorSingleton = new VWAPMeanReversionDetector(config);
  }
  return detectorSingleton;
}

export function resetVWAPMeanReversionDetector(): void {
  detectorSingleton = null;
}
