/**
 * Unified AI engine errors.
 */

export class AIEngineError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 500, code = "AI_ENGINE_ERROR") {
    super(message);
    this.name = "AIEngineError";
    this.status = status;
    this.code = code;
  }
}

export class ResearchEngineError extends AIEngineError {
  constructor(message: string, status = 500) {
    super(message, status, "RESEARCH_ENGINE_ERROR");
    this.name = "ResearchEngineError";
  }
}

export class ExplainEngineError extends AIEngineError {
  constructor(message: string, status = 500) {
    super(message, status, "EXPLAIN_ENGINE_ERROR");
    this.name = "ExplainEngineError";
  }
}

export class CompareEngineError extends AIEngineError {
  constructor(message: string, status = 400) {
    super(message, status, "COMPARE_ENGINE_ERROR");
    this.name = "CompareEngineError";
  }
}

export function mapEngineError(error: unknown): AIEngineError {
  if (error instanceof AIEngineError) return error;
  if (error instanceof Error) return new AIEngineError(error.message, 500);
  return new AIEngineError("Unknown AI engine failure", 500);
}
