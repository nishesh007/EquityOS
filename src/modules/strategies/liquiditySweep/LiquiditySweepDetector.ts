/**
 * Liquidity Sweep Detector — Sprint 11B.3E.
 * Orchestrates validation + pure detection utilities.
 */

import type { LiquiditySweepConfig } from "./LiquiditySweepConstants";
import type {
  LiquiditySweepDetection,
  LiquiditySweepDetectionContext,
} from "./LiquiditySweepTypes";
import {
  createEmptyLiquiditySweepDetection,
  detectLiquiditySweep,
  resolveLiquiditySweepConfig,
} from "./LiquiditySweepUtils";
import { LiquiditySweepValidator } from "./LiquiditySweepValidator";

export class LiquiditySweepDetector {
  private readonly config: LiquiditySweepConfig;
  private readonly validator: LiquiditySweepValidator;
  private lastDetection: LiquiditySweepDetection | null = null;

  constructor(config?: Partial<LiquiditySweepConfig>) {
    this.config = resolveLiquiditySweepConfig(config);
    this.validator = new LiquiditySweepValidator(this.config);
  }

  /**
   * Run Liquidity Sweep detection. Never throws.
   */
  detect(
    context: LiquiditySweepDetectionContext | null | undefined
  ): LiquiditySweepDetection {
    try {
      const validation = this.validator.validate(context);
      if (!context || !validation.valid) {
        const empty = createEmptyLiquiditySweepDetection(
          [...validation.warnings],
          []
        );
        empty.warnings = [...validation.errors, ...validation.warnings];
        empty.reasons = validation.errors;
        this.lastDetection = empty;
        return empty;
      }

      const detection = detectLiquiditySweep({
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
          : "Liquidity Sweep detection failed.";
      const empty = createEmptyLiquiditySweepDetection([message], []);
      this.lastDetection = empty;
      return empty;
    }
  }

  getLastDetection(): LiquiditySweepDetection | null {
    return this.lastDetection;
  }

  getConfiguration(): LiquiditySweepConfig {
    return resolveLiquiditySweepConfig(this.config);
  }
}

let detectorSingleton: LiquiditySweepDetector | null = null;

export function getLiquiditySweepDetector(
  config?: Partial<LiquiditySweepConfig>
): LiquiditySweepDetector {
  if (!detectorSingleton) {
    detectorSingleton = new LiquiditySweepDetector(config);
  }
  return detectorSingleton;
}

export function resetLiquiditySweepDetector(): void {
  detectorSingleton = null;
}
