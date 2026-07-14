/**
 * Runtime validation context shared across orchestrated engines.
 */

import type { ValidationRequest } from "./ValidationRequest";
import type { EngineScoreBag, ValidationTraceStep } from "./ValidationResponse";
import type { ValidationEngineId } from "./ValidationConfiguration";

export interface EngineRunResult {
  engineId: ValidationEngineId;
  ok: boolean;
  score: number;
  warnings: string[];
  errors: string[];
  executionTimeMs: number;
  cached: boolean;
  attempt: number;
  raw?: unknown;
  skipped?: boolean;
  timedOut?: boolean;
}

export class ValidationContext {
  readonly request: ValidationRequest;
  readonly startedAt: number;
  readonly results = new Map<ValidationEngineId, EngineRunResult>();
  readonly scores: EngineScoreBag = {
    integrityScore: 0,
    trustScore: 0,
    hallucinationScore: 0,
    historicalScore: 0,
    recommendationQuality: 0,
    tradeQuality: 0,
    overallValidationScore: 0,
  };
  readonly warnings: string[] = [];
  readonly errors: string[] = [];
  readonly trace: ValidationTraceStep[] = [];
  cancelled = false;

  constructor(request: ValidationRequest) {
    this.request = request;
    this.startedAt = Date.now();
  }

  record(result: EngineRunResult): void {
    this.results.set(result.engineId, result);
    this.scores[result.engineId] = result.score;
    this.mapKnownScore(result.engineId, result.score);
    this.warnings.push(...result.warnings);
    this.errors.push(...result.errors);
    this.trace.push({
      engineId: result.engineId,
      status: result.skipped
        ? "SKIPPED"
        : result.timedOut
          ? "TIMEOUT"
          : result.cached
            ? "CACHED"
            : result.ok
              ? "PASSED"
              : result.errors.length > 0
                ? "ERROR"
                : "FAILED",
      executionTimeMs: result.executionTimeMs,
      score: result.score,
      message: result.errors[0] ?? result.warnings[0],
      cached: result.cached,
      attempt: result.attempt,
    });
  }

  has(engineId: ValidationEngineId): boolean {
    return this.results.has(engineId);
  }

  getScore(engineId: ValidationEngineId): number {
    return this.results.get(engineId)?.score ?? 0;
  }

  elapsed(): number {
    return Date.now() - this.startedAt;
  }

  private mapKnownScore(engineId: ValidationEngineId, score: number): void {
    switch (engineId) {
      case "dataIntegrity":
        this.scores.integrityScore = score;
        break;
      case "trust":
        this.scores.trustScore = score;
        break;
      case "hallucination":
        this.scores.hallucinationScore = score;
        break;
      case "historical":
        this.scores.historicalScore = score;
        break;
      case "recommendation":
        this.scores.recommendationQuality = score;
        break;
      case "tradeSetup":
        this.scores.tradeQuality = score;
        break;
      default:
        break;
    }
  }
}
