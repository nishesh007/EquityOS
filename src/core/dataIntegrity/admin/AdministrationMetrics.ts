/**
 * Operational metrics for the administration engine.
 */

export interface AdministrationOperationalMetrics {
  policies: number;
  enabledPolicies: number;
  overrides: number;
  activeProfiles: number;
  disabledRules: number;
  disabledModules: number;
  configurationChanges: number;
  rollbackCount: number;
  lastChangeAt: string | null;
}

export class AdministrationMetricsTracker {
  private policies = 0;
  private enabledPolicies = 0;
  private overrides = 0;
  private activeProfiles = 1;
  private disabledRules = 0;
  private disabledModules = 0;
  private configurationChanges = 0;
  private rollbackCount = 0;
  private lastChangeAt: string | null = null;

  setPolicyCounts(total: number, enabled: number): void {
    this.policies = total;
    this.enabledPolicies = enabled;
    this.touch();
  }

  setOverrideCount(n: number): void {
    this.overrides = n;
    this.touch();
  }

  setActiveProfiles(n: number): void {
    this.activeProfiles = n;
  }

  setDisabledRules(n: number): void {
    this.disabledRules = n;
    this.touch();
  }

  setDisabledModules(n: number): void {
    this.disabledModules = n;
    this.touch();
  }

  recordConfigurationChange(): void {
    this.configurationChanges += 1;
    this.touch();
  }

  recordRollback(): void {
    this.rollbackCount += 1;
    this.touch();
  }

  getMetrics(): AdministrationOperationalMetrics {
    return {
      policies: this.policies,
      enabledPolicies: this.enabledPolicies,
      overrides: this.overrides,
      activeProfiles: this.activeProfiles,
      disabledRules: this.disabledRules,
      disabledModules: this.disabledModules,
      configurationChanges: this.configurationChanges,
      rollbackCount: this.rollbackCount,
      lastChangeAt: this.lastChangeAt,
    };
  }

  reset(): void {
    this.policies = 0;
    this.enabledPolicies = 0;
    this.overrides = 0;
    this.activeProfiles = 1;
    this.disabledRules = 0;
    this.disabledModules = 0;
    this.configurationChanges = 0;
    this.rollbackCount = 0;
    this.lastChangeAt = null;
  }

  private touch(): void {
    this.lastChangeAt = new Date().toISOString();
  }
}
