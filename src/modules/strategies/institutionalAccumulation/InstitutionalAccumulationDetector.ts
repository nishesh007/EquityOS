/**
 * Institutional Accumulation Detector — Sprint 11B.3H.
 */

import type { InstitutionalAccumulationConfig } from "./InstitutionalAccumulationConstants";
import type {
  InstitutionalAccumulationDetection,
  InstitutionalAccumulationDetectionContext,
} from "./InstitutionalAccumulationTypes";
import {
  createEmptyInstitutionalAccumulationDetection,
  detectInstitutionalAccumulation,
  resolveInstitutionalAccumulationConfig,
} from "./InstitutionalAccumulationUtils";
import { InstitutionalAccumulationValidator } from "./InstitutionalAccumulationValidator";

export class InstitutionalAccumulationDetector {
  private readonly config: InstitutionalAccumulationConfig;
  private readonly validator: InstitutionalAccumulationValidator;
  private lastDetection: InstitutionalAccumulationDetection | null = null;

  constructor(config?: Partial<InstitutionalAccumulationConfig>) {
    this.config = resolveInstitutionalAccumulationConfig(config);
    this.validator = new InstitutionalAccumulationValidator(this.config);
  }

  detect(
    context: InstitutionalAccumulationDetectionContext | null | undefined
  ): InstitutionalAccumulationDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyInstitutionalAccumulationDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectInstitutionalAccumulation({
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
          : "Institutional Accumulation detection failed.";
      const empty = createEmptyInstitutionalAccumulationDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): InstitutionalAccumulationDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): InstitutionalAccumulationConfig {
    return resolveInstitutionalAccumulationConfig(this.config);
  }
}

let detectorSingleton: InstitutionalAccumulationDetector | null = null;

export function getInstitutionalAccumulationDetector(
  config?: Partial<InstitutionalAccumulationConfig>
): InstitutionalAccumulationDetector {
  if (!detectorSingleton) {
    detectorSingleton = new InstitutionalAccumulationDetector(config);
  }
  return detectorSingleton;
}

export function resetInstitutionalAccumulationDetector(): void {
  detectorSingleton = null;
}
