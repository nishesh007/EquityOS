/**
 * Operational metrics for the reliability engine.
 */

export interface ReliabilityOperationalMetrics {
  availability: number;
  recoveryRate: number;
  retryCount: number;
  timeoutCount: number;
  circuitTrips: number;
  resilienceScore: number;
  averageRecoveryTime: number;
  healthChecks: number;
  lastCheckedAt: string | null;
  snapshotCount: number;
}

export class ReliabilityMetricsTracker {
  private availability = 100;
  private recoveryRate = 100;
  private retryCount = 0;
  private timeoutCount = 0;
  private circuitTrips = 0;
  private resilienceScore = 100;
  private averageRecoveryTime = 0;
  private healthChecks = 0;
  private lastCheckedAt: string | null = null;
  private snapshotCount = 0;

  recordHealthCheck(input: {
    availability: number;
    resilienceScore: number;
  }): void {
    this.healthChecks += 1;
    this.availability = input.availability;
    this.resilienceScore = input.resilienceScore;
    this.lastCheckedAt = new Date().toISOString();
  }

  setRecovery(rate: number, averageRecoveryTime: number): void {
    this.recoveryRate = rate;
    this.averageRecoveryTime = averageRecoveryTime;
  }

  addRetries(n: number): void {
    this.retryCount += n;
  }

  setTimeoutCount(n: number): void {
    this.timeoutCount = n;
  }

  setCircuitTrips(n: number): void {
    this.circuitTrips = n;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): ReliabilityOperationalMetrics {
    return {
      availability: this.availability,
      recoveryRate: this.recoveryRate,
      retryCount: this.retryCount,
      timeoutCount: this.timeoutCount,
      circuitTrips: this.circuitTrips,
      resilienceScore: this.resilienceScore,
      averageRecoveryTime: this.averageRecoveryTime,
      healthChecks: this.healthChecks,
      lastCheckedAt: this.lastCheckedAt,
      snapshotCount: this.snapshotCount,
    };
  }

  reset(): void {
    this.availability = 100;
    this.recoveryRate = 100;
    this.retryCount = 0;
    this.timeoutCount = 0;
    this.circuitTrips = 0;
    this.resilienceScore = 100;
    this.averageRecoveryTime = 0;
    this.healthChecks = 0;
    this.lastCheckedAt = null;
    this.snapshotCount = 0;
  }
}
