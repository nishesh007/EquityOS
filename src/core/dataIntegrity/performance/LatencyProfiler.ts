/**
 * Latency profiler — average, percentiles, min/max from sample durations.
 */

export interface LatencyProfile {
  sampleCount: number;
  averageMs: number;
  p50Ms: number;
  p90Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  minMs: number;
  score: number;
}

export class LatencyProfiler {
  profile(samplesMs: number[], targetLatencyMs: number): LatencyProfile {
    const samples = samplesMs
      .filter((n) => Number.isFinite(n) && n >= 0)
      .slice()
      .sort((a, b) => a - b);

    if (samples.length === 0) {
      return {
        sampleCount: 0,
        averageMs: 0,
        p50Ms: 0,
        p90Ms: 0,
        p95Ms: 0,
        p99Ms: 0,
        maxMs: 0,
        minMs: 0,
        score: 0,
      };
    }

    const sum = samples.reduce((a, b) => a + b, 0);
    const averageMs = round2(sum / samples.length);
    const p50Ms = percentile(samples, 50);
    const p90Ms = percentile(samples, 90);
    const p95Ms = percentile(samples, 95);
    const p99Ms = percentile(samples, 99);
    const maxMs = samples[samples.length - 1]!;
    const minMs = samples[0]!;

    const target = Math.max(1, targetLatencyMs);
    const ratio = p95Ms / target;
    const score = clamp(Math.round(100 - Math.max(0, ratio - 1) * 50), 0, 100);

    return {
      sampleCount: samples.length,
      averageMs,
      p50Ms,
      p90Ms,
      p95Ms,
      p99Ms,
      maxMs,
      minMs,
      score,
    };
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0]!;
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  if (low === high) return round2(sorted[low]!);
  const w = rank - low;
  return round2(sorted[low]! * (1 - w) + sorted[high]! * w);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
