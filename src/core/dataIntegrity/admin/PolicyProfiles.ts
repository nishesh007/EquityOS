/**
 * Built-in and custom governance policy profiles.
 */

import type { GovernanceProfileId } from "./AdministrationConfiguration";

export type ProfileEnvironment =
  | "development"
  | "testing"
  | "staging"
  | "production"
  | "research"
  | "institutional"
  | "custom";

export interface GovernanceProfile {
  profileId: GovernanceProfileId;
  name: string;
  description: string;
  environment: ProfileEnvironment;
  version: number;
  strictMode: boolean;
  safeMode: boolean;
  readOnlyMode: boolean;
  developmentMode: boolean;
  productionMode: boolean;
  allowedModules: string[];
  disabledModules: string[];
  defaultSeverity: string;
  metadata: Record<string, unknown>;
  updatedAt: string;
}

export const BUILTIN_PROFILES: GovernanceProfile[] = [
  {
    profileId: "development",
    name: "Development",
    description: "Local development — relaxed governance.",
    environment: "development",
    version: 1,
    strictMode: false,
    safeMode: false,
    readOnlyMode: false,
    developmentMode: true,
    productionMode: false,
    allowedModules: ["*"],
    disabledModules: [],
    defaultSeverity: "WARNING",
    metadata: {},
    updatedAt: new Date(0).toISOString(),
  },
  {
    profileId: "testing",
    name: "Testing",
    description: "Automated test environments.",
    environment: "testing",
    version: 1,
    strictMode: true,
    safeMode: false,
    readOnlyMode: false,
    developmentMode: false,
    productionMode: false,
    allowedModules: ["*"],
    disabledModules: [],
    defaultSeverity: "ERROR",
    metadata: {},
    updatedAt: new Date(0).toISOString(),
  },
  {
    profileId: "staging",
    name: "Staging",
    description: "Pre-production staging.",
    environment: "staging",
    version: 1,
    strictMode: true,
    safeMode: true,
    readOnlyMode: false,
    developmentMode: false,
    productionMode: false,
    allowedModules: ["*"],
    disabledModules: [],
    defaultSeverity: "ERROR",
    metadata: {},
    updatedAt: new Date(0).toISOString(),
  },
  {
    profileId: "production",
    name: "Production",
    description: "Live production governance.",
    environment: "production",
    version: 1,
    strictMode: true,
    safeMode: false,
    readOnlyMode: false,
    developmentMode: false,
    productionMode: true,
    allowedModules: ["*"],
    disabledModules: [],
    defaultSeverity: "CRITICAL",
    metadata: {},
    updatedAt: new Date(0).toISOString(),
  },
  {
    profileId: "institutional",
    name: "Institutional",
    description: "Institutional-grade strict governance.",
    environment: "institutional",
    version: 1,
    strictMode: true,
    safeMode: true,
    readOnlyMode: false,
    developmentMode: false,
    productionMode: true,
    allowedModules: ["*"],
    disabledModules: [],
    defaultSeverity: "CRITICAL",
    metadata: { institutional: true },
    updatedAt: new Date(0).toISOString(),
  },
  {
    profileId: "research",
    name: "Research",
    description: "Research / exploratory mode.",
    environment: "research",
    version: 1,
    strictMode: false,
    safeMode: false,
    readOnlyMode: true,
    developmentMode: true,
    productionMode: false,
    allowedModules: ["*"],
    disabledModules: [],
    defaultSeverity: "INFO",
    metadata: {},
    updatedAt: new Date(0).toISOString(),
  },
];

export class PolicyProfiles {
  private readonly profiles = new Map<string, GovernanceProfile>();
  private activeProfileId: GovernanceProfileId;

  constructor(defaultProfileId: GovernanceProfileId = "development") {
    for (const profile of BUILTIN_PROFILES) {
      this.profiles.set(profile.profileId, cloneProfile(profile));
    }
    this.activeProfileId = defaultProfileId;
    if (!this.profiles.has(defaultProfileId)) {
      this.activeProfileId = "development";
    }
  }

  listProfiles(): GovernanceProfile[] {
    return [...this.profiles.values()].map(cloneProfile);
  }

  getProfile(profileId: string): GovernanceProfile | null {
    const p = this.profiles.get(profileId);
    return p ? cloneProfile(p) : null;
  }

  getActiveProfile(): GovernanceProfile {
    return cloneProfile(
      this.profiles.get(this.activeProfileId) ??
        this.profiles.get("development")!
    );
  }

  switchProfile(profileId: GovernanceProfileId): {
    ok: boolean;
    profile: GovernanceProfile | null;
    previousId: GovernanceProfileId;
    errors: string[];
  } {
    const previousId = this.activeProfileId;
    const next = this.profiles.get(profileId);
    if (!next) {
      return {
        ok: false,
        profile: null,
        previousId,
        errors: [`Profile not found: ${profileId}`],
      };
    }
    this.activeProfileId = profileId;
    return {
      ok: true,
      profile: cloneProfile(next),
      previousId,
      errors: [],
    };
  }

  upsertProfile(profile: GovernanceProfile): GovernanceProfile {
    const existing = this.profiles.get(profile.profileId);
    const next: GovernanceProfile = {
      ...cloneProfile(profile),
      version: (existing?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(next.profileId, next);
    return cloneProfile(next);
  }

  createCustomProfile(
    input: Omit<GovernanceProfile, "version" | "updatedAt"> & {
      version?: number;
    }
  ): GovernanceProfile {
    const profile: GovernanceProfile = {
      ...input,
      profileId: input.profileId || `custom:${Math.random().toString(36).slice(2, 8)}`,
      version: 1,
      updatedAt: new Date().toISOString(),
      allowedModules: [...input.allowedModules],
      disabledModules: [...input.disabledModules],
      metadata: { ...input.metadata },
    };
    this.profiles.set(profile.profileId, profile);
    return cloneProfile(profile);
  }
}

function cloneProfile(profile: GovernanceProfile): GovernanceProfile {
  return {
    ...profile,
    allowedModules: [...profile.allowedModules],
    disabledModules: [...profile.disabledModules],
    metadata: { ...profile.metadata },
  };
}
