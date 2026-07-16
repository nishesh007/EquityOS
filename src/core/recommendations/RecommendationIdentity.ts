/**
 * Stable recommendation identity.
 * Format: REC-YYYYMMDD-HHMMSS-SYMBOL-ENGINE (UTC).
 */

export interface RecommendationIdentityInput {
  symbol: string;
  engine: string;
  generatedAt?: string | Date;
}

const ID_PART = /[^A-Z0-9]/g;

export function normalizeRecommendationIdentityPart(value: string): string {
  const normalized = value.trim().toUpperCase().replace(ID_PART, "");
  if (!normalized) {
    throw new Error("Recommendation identity parts cannot be empty");
  }
  return normalized;
}

export function generateRecommendationId(
  input: RecommendationIdentityInput
): string {
  const date =
    input.generatedAt instanceof Date
      ? new Date(input.generatedAt.getTime())
      : new Date(input.generatedAt ?? Date.now());

  if (Number.isNaN(date.getTime())) {
    throw new Error("Recommendation generated timestamp is invalid");
  }

  const compact = date
    .toISOString()
    .slice(0, 19)
    .replace(/[-:T]/g, "");
  const day = compact.slice(0, 8);
  const time = compact.slice(8);
  const symbol = normalizeRecommendationIdentityPart(input.symbol);
  const engine = normalizeRecommendationIdentityPart(input.engine);

  return `REC-${day}-${time}-${symbol}-${engine}`;
}

export function isRecommendationId(value: string): boolean {
  return /^REC-\d{8}-\d{6}-[A-Z0-9]+-[A-Z0-9]+$/.test(value);
}
