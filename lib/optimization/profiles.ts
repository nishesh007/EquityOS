import {
  cloneConstraints,
  hydrateParameters,
} from "./parameters";
import type {
  ConstraintDefinition,
  OptimizationProfile,
  ParameterState,
} from "./types";

export const PROFILES_STORAGE_KEY = "equityos.research.optimization.profiles.v1";
export const RECENT_PROFILES_KEY = "equityos.research.optimization.recent.v1";

interface ProfilesPayload {
  version: 1;
  profiles: OptimizationProfile[];
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(): string {
  return `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDefaultProfile(
  strategyId = "swing-breakout"
): OptimizationProfile {
  const ts = nowIso();
  return {
    id: "profile-default",
    name: "Default Profile",
    strategyId,
    parameters: hydrateParameters(),
    constraints: cloneConstraints(),
    isDefault: true,
    createdAt: ts,
    updatedAt: ts,
  };
}

export function loadProfiles(): OptimizationProfile[] {
  if (typeof window === "undefined") return [createDefaultProfile()];
  try {
    const raw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      const defaults = [createDefaultProfile()];
      saveProfiles(defaults);
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<ProfilesPayload>;
    if (!Array.isArray(parsed.profiles) || parsed.profiles.length === 0) {
      return [createDefaultProfile()];
    }
    return parsed.profiles.map((p) => ({
      ...p,
      parameters: Array.isArray(p.parameters)
        ? (p.parameters as ParameterState[])
        : hydrateParameters(),
      constraints: Array.isArray(p.constraints)
        ? (p.constraints as ConstraintDefinition[])
        : cloneConstraints(),
      isDefault: Boolean(p.isDefault),
    }));
  } catch {
    return [createDefaultProfile()];
  }
}

export function saveProfiles(profiles: OptimizationProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    const payload: ProfilesPayload = { version: 1, profiles };
    window.localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — fail silently.
  }
}

export function loadRecentProfileIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_PROFILES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function saveRecentProfileIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      RECENT_PROFILES_KEY,
      JSON.stringify(ids.slice(0, 8))
    );
  } catch {
    // ignore
  }
}

export function touchRecent(ids: string[], profileId: string): string[] {
  return [profileId, ...ids.filter((id) => id !== profileId)].slice(0, 8);
}

export function saveNewProfile(input: {
  profiles: OptimizationProfile[];
  name: string;
  strategyId: string;
  parameters: ParameterState[];
  constraints: ConstraintDefinition[];
}): { profiles: OptimizationProfile[]; error?: string; profile?: OptimizationProfile } {
  const trimmed = input.name.trim();
  if (!trimmed) {
    return { profiles: input.profiles, error: "Profile name is required." };
  }
  const duplicate = input.profiles.some(
    (p) => p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return {
      profiles: input.profiles,
      error: `A profile named "${trimmed}" already exists.`,
    };
  }

  const ts = nowIso();
  const profile: OptimizationProfile = {
    id: createId(),
    name: trimmed,
    strategyId: input.strategyId,
    parameters: input.parameters.map((p) => ({ ...p })),
    constraints: input.constraints.map((c) => ({ ...c })),
    isDefault: false,
    createdAt: ts,
    updatedAt: ts,
  };

  const profiles = [...input.profiles, profile];
  saveProfiles(profiles);
  return { profiles, profile };
}

export function renameProfile(
  profiles: OptimizationProfile[],
  id: string,
  name: string
): { profiles: OptimizationProfile[]; error?: string } {
  const trimmed = name.trim();
  if (!trimmed) {
    return { profiles, error: "Profile name is required." };
  }
  const duplicate = profiles.some(
    (p) => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    return { profiles, error: `A profile named "${trimmed}" already exists.` };
  }

  const next = profiles.map((p) =>
    p.id === id ? { ...p, name: trimmed, updatedAt: nowIso() } : p
  );
  saveProfiles(next);
  return { profiles: next };
}

export function duplicateProfile(
  profiles: OptimizationProfile[],
  id: string
): { profiles: OptimizationProfile[]; error?: string; profile?: OptimizationProfile } {
  const source = profiles.find((p) => p.id === id);
  if (!source) {
    return { profiles, error: "Profile not found." };
  }

  let name = `${source.name} Copy`;
  let n = 2;
  while (profiles.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
    name = `${source.name} Copy ${n}`;
    n += 1;
  }

  const ts = nowIso();
  const profile: OptimizationProfile = {
    ...source,
    id: createId(),
    name,
    isDefault: false,
    createdAt: ts,
    updatedAt: ts,
    parameters: source.parameters.map((p) => ({ ...p })),
    constraints: source.constraints.map((c) => ({ ...c })),
  };

  const next = [...profiles, profile];
  saveProfiles(next);
  return { profiles: next, profile };
}

export function deleteProfile(
  profiles: OptimizationProfile[],
  id: string
): { profiles: OptimizationProfile[]; error?: string } {
  const target = profiles.find((p) => p.id === id);
  if (!target) {
    return { profiles, error: "Profile not found." };
  }
  if (target.isDefault) {
    return { profiles, error: "The default profile cannot be deleted." };
  }
  if (profiles.length <= 1) {
    return { profiles, error: "At least one profile must remain." };
  }
  const next = profiles.filter((p) => p.id !== id);
  saveProfiles(next);
  return { profiles: next };
}

export function setDefaultProfile(
  profiles: OptimizationProfile[],
  id: string
): OptimizationProfile[] {
  const next = profiles.map((p) => ({
    ...p,
    isDefault: p.id === id,
    updatedAt: p.id === id ? nowIso() : p.updatedAt,
  }));
  saveProfiles(next);
  return next;
}

export function updateExistingProfile(
  profiles: OptimizationProfile[],
  id: string,
  patch: {
    strategyId: string;
    parameters: ParameterState[];
    constraints: ConstraintDefinition[];
  }
): OptimizationProfile[] {
  const next = profiles.map((p) =>
    p.id === id
      ? {
          ...p,
          strategyId: patch.strategyId,
          parameters: patch.parameters.map((x) => ({ ...x })),
          constraints: patch.constraints.map((x) => ({ ...x })),
          updatedAt: nowIso(),
        }
      : p
  );
  saveProfiles(next);
  return next;
}
