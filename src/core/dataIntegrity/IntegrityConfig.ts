/**
 * Institutional Data Integrity Engine — centralized configuration.
 * Enable/disable rules, score threshold, logging, strict/dev/prod modes.
 */

import {
  DEFAULT_RANGE_LIMITS,
  INTEGRITY_SCORE_THRESHOLD,
} from "./IntegrityConstants";
import type {
  IntegrityEnvironment,
  IntegrityLogLevel,
} from "./IntegrityTypes";

export interface RangeLimits {
  rsiMax: number;
  rsiMin: number;
  adxMax: number;
  adxMin: number;
  peMax: number;
  peMin: number;
  pbMax: number;
  pbMin: number;
  dividendYieldMax: number;
  dividendYieldMin: number;
  marketCapMax: number;
  marketCapMin: number;
  atrMin: number;
}

export interface IntegrityConfigSnapshot {
  /** Minimum score for approval. */
  scoreThreshold: number;
  /** When true, WARNING failures are treated more strictly for status. */
  strictMode: boolean;
  /** Allow negative equity values when explicitly supported. */
  allowNegativeEquity: boolean;
  /** Logging verbosity. */
  loggingLevel: IntegrityLogLevel;
  /** Runtime environment. */
  environment: IntegrityEnvironment;
  /** Per-rule enable overrides keyed by rule ID. */
  ruleOverrides: Record<string, boolean>;
  /** Configurable numeric range limits. */
  rangeLimits: RangeLimits;
  /** Default data source label when caller omits one. */
  defaultDataSource: string;
  /** Max concurrent validations in validateBatch. */
  batchConcurrency: number;
}

const DEFAULT_CONFIG: IntegrityConfigSnapshot = {
  scoreThreshold: INTEGRITY_SCORE_THRESHOLD,
  strictMode: false,
  allowNegativeEquity: false,
  loggingLevel: "info",
  environment: "production",
  ruleOverrides: {},
  rangeLimits: { ...DEFAULT_RANGE_LIMITS },
  defaultDataSource: "unknown",
  batchConcurrency: 8,
};

export class IntegrityConfig {
  private snapshot: IntegrityConfigSnapshot;

  constructor(overrides?: Partial<IntegrityConfigSnapshot>) {
    this.snapshot = IntegrityConfig.merge(DEFAULT_CONFIG, overrides);
  }

  static defaults(): IntegrityConfigSnapshot {
    return IntegrityConfig.merge(DEFAULT_CONFIG);
  }

  static merge(
    base: IntegrityConfigSnapshot,
    overrides?: Partial<IntegrityConfigSnapshot>
  ): IntegrityConfigSnapshot {
    if (!overrides) {
      return {
        ...base,
        ruleOverrides: { ...base.ruleOverrides },
        rangeLimits: { ...base.rangeLimits },
      };
    }
    return {
      ...base,
      ...overrides,
      ruleOverrides: {
        ...base.ruleOverrides,
        ...(overrides.ruleOverrides ?? {}),
      },
      rangeLimits: {
        ...base.rangeLimits,
        ...(overrides.rangeLimits ?? {}),
      },
    };
  }

  get(): IntegrityConfigSnapshot {
    return IntegrityConfig.merge(this.snapshot);
  }

  update(overrides: Partial<IntegrityConfigSnapshot>): void {
    this.snapshot = IntegrityConfig.merge(this.snapshot, overrides);
  }

  enableRule(ruleId: string): void {
    this.snapshot.ruleOverrides[ruleId] = true;
  }

  disableRule(ruleId: string): void {
    this.snapshot.ruleOverrides[ruleId] = false;
  }

  isRuleEnabled(ruleId: string, ruleDefaultEnabled: boolean): boolean {
    if (Object.prototype.hasOwnProperty.call(this.snapshot.ruleOverrides, ruleId)) {
      return this.snapshot.ruleOverrides[ruleId];
    }
    return ruleDefaultEnabled;
  }

  setScoreThreshold(threshold: number): void {
    this.snapshot.scoreThreshold = Math.max(0, Math.min(100, threshold));
  }

  setLoggingLevel(level: IntegrityLogLevel): void {
    this.snapshot.loggingLevel = level;
  }

  setStrictMode(enabled: boolean): void {
    this.snapshot.strictMode = enabled;
  }

  setEnvironment(environment: IntegrityEnvironment): void {
    this.snapshot.environment = environment;
    if (environment === "development") {
      this.snapshot.loggingLevel = "debug";
    }
  }

  getRangeLimits(): RangeLimits {
    return { ...this.snapshot.rangeLimits };
  }

  /** Create a child config with request-level overrides (no shared mutation). */
  withOverrides(
    overrides?: Partial<IntegrityConfigSnapshot>
  ): IntegrityConfig {
    return new IntegrityConfig(
      IntegrityConfig.merge(this.snapshot, overrides)
    );
  }
}
