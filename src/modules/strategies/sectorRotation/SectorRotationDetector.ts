/**
 * Sector Rotation Detector — Sprint 11B.3J.
 */

import type { SectorRotationConfig } from "./SectorRotationConstants";
import type {
  SectorRotationDetection,
  SectorRotationDetectionContext,
} from "./SectorRotationTypes";
import {
  createEmptySectorRotationDetection,
  detectSectorRotation,
  resolveSectorRotationConfig,
} from "./SectorRotationUtils";
import { SectorRotationValidator } from "./SectorRotationValidator";

export class SectorRotationDetector {
  private readonly config: SectorRotationConfig;
  private readonly validator: SectorRotationValidator;
  private lastDetection: SectorRotationDetection | null = null;

  constructor(config?: Partial<SectorRotationConfig>) {
    this.config = resolveSectorRotationConfig(config);
    this.validator = new SectorRotationValidator(this.config);
  }

  detect(
    context: SectorRotationDetectionContext | null | undefined
  ): SectorRotationDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptySectorRotationDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectSectorRotation({
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
          : "Sector Rotation detection failed.";
      const empty = createEmptySectorRotationDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): SectorRotationDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): SectorRotationConfig {
    return resolveSectorRotationConfig(this.config);
  }
}

let detectorSingleton: SectorRotationDetector | null = null;

export function getSectorRotationDetector(
  config?: Partial<SectorRotationConfig>
): SectorRotationDetector {
  if (!detectorSingleton) {
    detectorSingleton = new SectorRotationDetector(config);
  }
  return detectorSingleton;
}

export function resetSectorRotationDetector(): void {
  detectorSingleton = null;
}
