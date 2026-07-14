/**
 * Operational metrics for the Validation Dashboard service itself.
 */

export interface DashboardOperationalMetrics {
  dashboardRefreshTime: number;
  averageAggregationTime: number;
  cacheHitPercent: number;
  cacheMissPercent: number;
  moduleCount: number;
  snapshotCount: number;
  totalRefreshes: number;
  lastRefreshAt: string | null;
}

export class DashboardMetricsTracker {
  private totalRefreshes = 0;
  private refreshTimeSum = 0;
  private lastRefreshTime = 0;
  private lastRefreshAt: string | null = null;
  private moduleCount = 0;
  private snapshotCount = 0;
  private cacheHitPercent = 0;
  private cacheMissPercent = 0;

  recordRefresh(input: {
    runtimeMs: number;
    moduleCount: number;
    cacheHitPercent: number;
    cacheMissPercent: number;
  }): void {
    this.totalRefreshes += 1;
    this.refreshTimeSum += input.runtimeMs;
    this.lastRefreshTime = input.runtimeMs;
    this.lastRefreshAt = new Date().toISOString();
    this.moduleCount = input.moduleCount;
    this.cacheHitPercent = input.cacheHitPercent;
    this.cacheMissPercent = input.cacheMissPercent;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): DashboardOperationalMetrics {
    return {
      dashboardRefreshTime: this.lastRefreshTime,
      averageAggregationTime:
        this.totalRefreshes === 0
          ? 0
          : round2(this.refreshTimeSum / this.totalRefreshes),
      cacheHitPercent: this.cacheHitPercent,
      cacheMissPercent: this.cacheMissPercent,
      moduleCount: this.moduleCount,
      snapshotCount: this.snapshotCount,
      totalRefreshes: this.totalRefreshes,
      lastRefreshAt: this.lastRefreshAt,
    };
  }

  reset(): void {
    this.totalRefreshes = 0;
    this.refreshTimeSum = 0;
    this.lastRefreshTime = 0;
    this.lastRefreshAt = null;
    this.moduleCount = 0;
    this.snapshotCount = 0;
    this.cacheHitPercent = 0;
    this.cacheMissPercent = 0;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
