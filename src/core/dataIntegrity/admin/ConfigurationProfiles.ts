/**
 * Configuration profiles — switchable governance configuration bundles.
 */

import type { GovernanceProfileId } from "./AdministrationConfiguration";
import type { AdministrationConfiguration } from "./AdministrationConfiguration";
import {
  DEFAULT_ADMINISTRATION_CONFIGURATION,
  resolveAdministrationConfiguration,
} from "./AdministrationConfiguration";

export interface ConfigurationProfile {
  profileId: GovernanceProfileId;
  name: string;
  version: number;
  configuration: AdministrationConfiguration;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export class ConfigurationProfiles {
  private readonly profiles = new Map<string, ConfigurationProfile>();
  private activeProfileId: GovernanceProfileId;

  constructor(defaultProfileId: GovernanceProfileId = "development") {
    const builtins: Array<{
      id: GovernanceProfileId;
      name: string;
      patch: Partial<AdministrationConfiguration>;
    }> = [
      {
        id: "development",
        name: "Development Config",
        patch: {
          approvalRequired: false,
          strictGovernance: false,
          defaultProfileId: "development",
        },
      },
      {
        id: "testing",
        name: "Testing Config",
        patch: {
          approvalRequired: false,
          strictGovernance: true,
          defaultProfileId: "testing",
        },
      },
      {
        id: "staging",
        name: "Staging Config",
        patch: {
          approvalRequired: true,
          strictGovernance: true,
          defaultProfileId: "staging",
        },
      },
      {
        id: "production",
        name: "Production Config",
        patch: {
          approvalRequired: true,
          strictGovernance: true,
          allowDeleteWithoutApproval: false,
          defaultProfileId: "production",
        },
      },
      {
        id: "institutional",
        name: "Institutional Config",
        patch: {
          approvalRequired: true,
          strictGovernance: true,
          conflictBlocksApply: true,
          defaultProfileId: "institutional",
        },
      },
      {
        id: "research",
        name: "Research Config",
        patch: {
          approvalRequired: false,
          strictGovernance: false,
          defaultProfileId: "research",
        },
      },
    ];

    for (const b of builtins) {
      this.profiles.set(b.id, {
        profileId: b.id,
        name: b.name,
        version: 1,
        configuration: resolveAdministrationConfiguration({
          ...DEFAULT_ADMINISTRATION_CONFIGURATION,
          ...b.patch,
        }),
        updatedAt: new Date(0).toISOString(),
        metadata: {},
      });
    }

    this.activeProfileId = this.profiles.has(defaultProfileId)
      ? defaultProfileId
      : "development";
  }

  list(): ConfigurationProfile[] {
    return [...this.profiles.values()].map(cloneConfigProfile);
  }

  get(profileId: string): ConfigurationProfile | null {
    const p = this.profiles.get(profileId);
    return p ? cloneConfigProfile(p) : null;
  }

  getActive(): ConfigurationProfile {
    return cloneConfigProfile(
      this.profiles.get(this.activeProfileId) ??
        this.profiles.get("development")!
    );
  }

  switchTo(profileId: GovernanceProfileId): {
    ok: boolean;
    profile: ConfigurationProfile | null;
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
        errors: [`Configuration profile not found: ${profileId}`],
      };
    }
    this.activeProfileId = profileId;
    return {
      ok: true,
      profile: cloneConfigProfile(next),
      previousId,
      errors: [],
    };
  }

  upsert(profile: ConfigurationProfile): ConfigurationProfile {
    const existing = this.profiles.get(profile.profileId);
    const next: ConfigurationProfile = {
      ...cloneConfigProfile(profile),
      version: (existing?.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(next.profileId, next);
    return cloneConfigProfile(next);
  }

  createCustom(
    name: string,
    configuration: Partial<AdministrationConfiguration>,
    profileId?: string
  ): ConfigurationProfile {
    const id =
      profileId ??
      (`custom:${Math.random().toString(36).slice(2, 8)}` as GovernanceProfileId);
    const profile: ConfigurationProfile = {
      profileId: id,
      name,
      version: 1,
      configuration: resolveAdministrationConfiguration(configuration),
      updatedAt: new Date().toISOString(),
      metadata: { custom: true },
    };
    this.profiles.set(id, profile);
    return cloneConfigProfile(profile);
  }
}

function cloneConfigProfile(profile: ConfigurationProfile): ConfigurationProfile {
  return {
    ...profile,
    configuration: { ...profile.configuration },
    metadata: { ...profile.metadata },
  };
}
