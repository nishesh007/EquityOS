/**
 * Participation publish gate — never surface EMA20/50/200 from a partial scan.
 */

/** Must match engine technical sample cap. */
export const MAX_TECHNICAL_FETCHES = 120;

/** Require at least half of the attempted technical sample to succeed. */
export const MIN_PARTICIPATION_SAMPLE_RATIO = 0.5;

export function participationAttemptedSize(universeSize: number): number {
  return Math.min(MAX_TECHNICAL_FETCHES, Math.max(0, universeSize));
}

export function minParticipationSampleSize(universeSize: number): number {
  const attempted = participationAttemptedSize(universeSize);
  if (attempted === 0) return Number.POSITIVE_INFINITY;
  return Math.max(1, Math.ceil(attempted * MIN_PARTICIPATION_SAMPLE_RATIO));
}

/** True only when the technical sample is complete enough to publish. */
export function isParticipationCoverageSufficient(input: {
  sampleSize: number;
  universeSize: number;
}): boolean {
  return input.sampleSize >= minParticipationSampleSize(input.universeSize);
}
