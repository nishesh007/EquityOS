/**
 * Module governance — enable/disable and operational modes.
 */

export type ModuleOperationalMode =
  | "NORMAL"
  | "MAINTENANCE"
  | "READ_ONLY"
  | "SAFE"
  | "STRICT"
  | "DEVELOPMENT"
  | "PRODUCTION";

export interface ModuleGovernanceState {
  moduleId: string;
  name: string;
  enabled: boolean;
  maintenanceMode: boolean;
  readOnlyMode: boolean;
  safeMode: boolean;
  strictMode: boolean;
  developmentMode: boolean;
  productionMode: boolean;
  operationalMode: ModuleOperationalMode;
  version: number;
  updatedAt: string;
  updatedBy?: string;
  reason?: string;
}

export class ModuleGovernance {
  private readonly modules = new Map<string, ModuleGovernanceState>();

  ensureModule(
    input: Partial<ModuleGovernanceState> & { moduleId: string; name?: string }
  ): ModuleGovernanceState {
    const existing = this.modules.get(input.moduleId);
    if (existing) return this.clone(existing);
    const created: ModuleGovernanceState = {
      moduleId: input.moduleId,
      name: input.name ?? input.moduleId,
      enabled: input.enabled ?? true,
      maintenanceMode: input.maintenanceMode ?? false,
      readOnlyMode: input.readOnlyMode ?? false,
      safeMode: input.safeMode ?? false,
      strictMode: input.strictMode ?? false,
      developmentMode: input.developmentMode ?? true,
      productionMode: input.productionMode ?? false,
      operationalMode: input.operationalMode ?? "NORMAL",
      version: 1,
      updatedAt: new Date().toISOString(),
      updatedBy: input.updatedBy,
      reason: input.reason,
    };
    this.modules.set(created.moduleId, created);
    return this.clone(created);
  }

  enableModule(moduleId: string, updatedBy?: string): ModuleGovernanceState | null {
    return this.patch(moduleId, {
      enabled: true,
      maintenanceMode: false,
      operationalMode: "NORMAL",
      updatedBy,
      reason: "enable",
    });
  }

  disableModule(moduleId: string, updatedBy?: string): ModuleGovernanceState | null {
    return this.patch(moduleId, {
      enabled: false,
      operationalMode: "MAINTENANCE",
      updatedBy,
      reason: "disable",
    });
  }

  setMaintenanceMode(
    moduleId: string,
    enabled: boolean,
    updatedBy?: string
  ): ModuleGovernanceState | null {
    return this.patch(moduleId, {
      maintenanceMode: enabled,
      operationalMode: enabled ? "MAINTENANCE" : "NORMAL",
      updatedBy,
      reason: enabled ? "maintenance on" : "maintenance off",
    });
  }

  setReadOnlyMode(
    moduleId: string,
    enabled: boolean,
    updatedBy?: string
  ): ModuleGovernanceState | null {
    return this.patch(moduleId, {
      readOnlyMode: enabled,
      operationalMode: enabled ? "READ_ONLY" : "NORMAL",
      updatedBy,
      reason: enabled ? "read-only on" : "read-only off",
    });
  }

  setSafeMode(
    moduleId: string,
    enabled: boolean,
    updatedBy?: string
  ): ModuleGovernanceState | null {
    return this.patch(moduleId, {
      safeMode: enabled,
      operationalMode: enabled ? "SAFE" : "NORMAL",
      updatedBy,
      reason: enabled ? "safe mode on" : "safe mode off",
    });
  }

  setStrictMode(
    moduleId: string,
    enabled: boolean,
    updatedBy?: string
  ): ModuleGovernanceState | null {
    return this.patch(moduleId, {
      strictMode: enabled,
      operationalMode: enabled ? "STRICT" : "NORMAL",
      updatedBy,
      reason: enabled ? "strict on" : "strict off",
    });
  }

  setDevelopmentMode(
    moduleId: string,
    enabled: boolean,
    updatedBy?: string
  ): ModuleGovernanceState | null {
    return this.patch(moduleId, {
      developmentMode: enabled,
      productionMode: enabled ? false : true,
      operationalMode: enabled ? "DEVELOPMENT" : "PRODUCTION",
      updatedBy,
      reason: enabled ? "development mode" : "exit development mode",
    });
  }

  setProductionMode(
    moduleId: string,
    enabled: boolean,
    updatedBy?: string
  ): ModuleGovernanceState | null {
    return this.patch(moduleId, {
      productionMode: enabled,
      developmentMode: enabled ? false : true,
      strictMode: enabled ? true : false,
      operationalMode: enabled ? "PRODUCTION" : "DEVELOPMENT",
      updatedBy,
      reason: enabled ? "production mode" : "exit production mode",
    });
  }

  listModules(): ModuleGovernanceState[] {
    return [...this.modules.values()].map((m) => this.clone(m));
  }

  getModule(moduleId: string): ModuleGovernanceState | null {
    const m = this.modules.get(moduleId);
    return m ? this.clone(m) : null;
  }

  disabledCount(): number {
    return [...this.modules.values()].filter((m) => !m.enabled).length;
  }

  reset(): void {
    this.modules.clear();
  }

  private patch(
    moduleId: string,
    patch: Partial<ModuleGovernanceState>
  ): ModuleGovernanceState | null {
    if (!this.modules.has(moduleId)) {
      this.ensureModule({ moduleId, ...patch });
    }
    const existing = this.modules.get(moduleId);
    if (!existing) return null;
    const next: ModuleGovernanceState = {
      ...existing,
      ...patch,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };
    this.modules.set(moduleId, next);
    return this.clone(next);
  }

  private clone(mod: ModuleGovernanceState): ModuleGovernanceState {
    return { ...mod };
  }
}
