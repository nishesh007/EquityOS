/**
 * Opportunity Engine pipeline stage counters — production diagnostics.
 */

export interface PipelineStageCounts {
  universeReceived: number;
  quotesReceived: number;
  metricsScanned: number;
  shortlisted: number;
  rawCandidates: number;
  pipelinePassed: number;
  scoredStored: number;
  recommendationsStored: number;
  apiReturned?: number;
}

export function emptyPipelineStageCounts(): PipelineStageCounts {
  return {
    universeReceived: 0,
    quotesReceived: 0,
    metricsScanned: 0,
    shortlisted: 0,
    rawCandidates: 0,
    pipelinePassed: 0,
    scoredStored: 0,
    recommendationsStored: 0,
  };
}

export function logPipelineStages(
  label: string,
  counts: PipelineStageCounts,
  extra?: Record<string, unknown>
): void {
  const firstZero =
    counts.universeReceived === 0
      ? "universeReceived"
      : counts.quotesReceived === 0
        ? "quotesReceived"
        : counts.metricsScanned === 0
          ? "metricsScanned"
          : counts.shortlisted === 0
            ? "shortlisted"
            : counts.rawCandidates === 0
              ? "rawCandidates"
              : counts.pipelinePassed === 0
                ? "pipelinePassed"
                : counts.scoredStored === 0
                  ? "scoredStored"
                  : counts.recommendationsStored === 0
                    ? "recommendationsStored"
                    : counts.apiReturned === 0
                      ? "apiReturned"
                      : null;

  console.info(
    `[OpportunityEngine:pipeline] ${label}`,
    JSON.stringify({
      ...counts,
      firstZeroStage: firstZero,
      ...extra,
    })
  );
}

export function countCategoryCandidates(
  categories: Record<string, unknown[]> | null | undefined
): number {
  if (!categories) return 0;
  return Object.values(categories).reduce(
    (n, list) => n + (Array.isArray(list) ? list.length : 0),
    0
  );
}
