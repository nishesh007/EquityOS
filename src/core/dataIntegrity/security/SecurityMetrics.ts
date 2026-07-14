/**
 * Operational metrics for the security engine.
 */

export interface SecurityHealthScore {
  policyCoverage: number;
  permissionIntegrity: number;
  roleConsistency: number;
  auditCompleteness: number;
  configurationSecurity: number;
  accessValidation: number;
  overall: number;
}

export interface SecurityOperationalMetrics {
  accessRequests: number;
  deniedRequests: number;
  successfulRequests: number;
  roles: number;
  permissions: number;
  policies: number;
  averageAuthorizationTime: number;
  securityHealthScore: number;
  snapshotCount: number;
  lastRunAt: string | null;
}

export class SecurityMetricsTracker {
  private accessRequests = 0;
  private deniedRequests = 0;
  private successfulRequests = 0;
  private roles = 0;
  private permissions = 0;
  private policies = 0;
  private authTimeSum = 0;
  private authCount = 0;
  private securityHealthScore = 0;
  private snapshotCount = 0;
  private lastRunAt: string | null = null;

  setCounts(input: {
    roles: number;
    permissions: number;
    policies: number;
  }): void {
    this.roles = input.roles;
    this.permissions = input.permissions;
    this.policies = input.policies;
  }

  recordAuthorization(input: {
    allowed: boolean;
    executionTimeMs: number;
    healthScore?: number;
  }): void {
    this.accessRequests += 1;
    if (input.allowed) this.successfulRequests += 1;
    else this.deniedRequests += 1;
    this.authTimeSum += input.executionTimeMs;
    this.authCount += 1;
    if (input.healthScore !== undefined) {
      this.securityHealthScore = input.healthScore;
    }
    this.lastRunAt = new Date().toISOString();
  }

  setHealthScore(score: number): void {
    this.securityHealthScore = score;
  }

  setSnapshotCount(n: number): void {
    this.snapshotCount = n;
  }

  getMetrics(): SecurityOperationalMetrics {
    return {
      accessRequests: this.accessRequests,
      deniedRequests: this.deniedRequests,
      successfulRequests: this.successfulRequests,
      roles: this.roles,
      permissions: this.permissions,
      policies: this.policies,
      averageAuthorizationTime:
        this.authCount === 0
          ? 0
          : round2(this.authTimeSum / this.authCount),
      securityHealthScore: this.securityHealthScore,
      snapshotCount: this.snapshotCount,
      lastRunAt: this.lastRunAt,
    };
  }

  reset(): void {
    this.accessRequests = 0;
    this.deniedRequests = 0;
    this.successfulRequests = 0;
    this.roles = 0;
    this.permissions = 0;
    this.policies = 0;
    this.authTimeSum = 0;
    this.authCount = 0;
    this.securityHealthScore = 0;
    this.snapshotCount = 0;
    this.lastRunAt = null;
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
