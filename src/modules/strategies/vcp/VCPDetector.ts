/**
 * VCP Detector — Sprint 11B.3L.
 */

import type { VCPConfig } from "./VCPConstants";
import type { VCPDetection, VCPDetectionContext } from "./VCPTypes";
import {
  createEmptyVCPDetection,
  detectVCP,
  resolveVCPConfig,
} from "./VCPUtils";
import { VCPValidator } from "./VCPValidator";

export class VCPDetector {
  private readonly config: VCPConfig;
  private readonly validator: VCPValidator;
  private lastDetection: VCPDetection | null = null;

  constructor(config?: Partial<VCPConfig>) {
    this.config = resolveVCPConfig(config);
    this.validator = new VCPValidator(this.config);
  }

  detect(context: VCPDetectionContext | null | undefined): VCPDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyVCPDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectVCP({
        ...context,
        config: this.config,
      });
      detection.warnings = [...validation.warnings, ...detection.warnings];
      this.lastDetection = detection;
      return detection;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "VCP detection failed.";
      const empty = createEmptyVCPDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): VCPDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): VCPConfig {
    return resolveVCPConfig(this.config);
  }
}

let detectorSingleton: VCPDetector | null = null;

export function getVCPDetector(config?: Partial<VCPConfig>): VCPDetector {
  if (!detectorSingleton) {
    detectorSingleton = new VCPDetector(config);
  }
  return detectorSingleton;
}

export function resetVCPDetector(): void {
  detectorSingleton = null;
}
