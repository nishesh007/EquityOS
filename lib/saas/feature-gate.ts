/**
 * Feature requirement registry + gating engine — Sprint 12A.
 */

import { getPlan, planMeetsMinimum } from "./plans";
import { permissionsForRole, roleHasPermission } from "./roles";
import type {
  FeatureId,
  FeatureRequirement,
  GateDecision,
  GateVisibility,
  LicenseRecord,
  PermissionId,
  PlanId,
  SubscriptionRecord,
  UserProfile,
  UserRole,
} from "./types";

export const FEATURE_REQUIREMENTS: readonly FeatureRequirement[] = [
  { featureId: "dashboard", requiredPlan: "free" },
  {
    featureId: "research",
    requiredPlan: "free",
    requiredPermission: "canGenerateResearch",
  },
  { featureId: "watchlists", requiredPlan: "free" },
  {
    featureId: "portfolio",
    requiredPlan: "free",
    requiredPermission: "canCreatePortfolio",
  },
  {
    featureId: "exports",
    requiredPlan: "starter",
    requiredPermission: "canExport",
    requiredLicense: true,
  },
  {
    featureId: "aiInsights",
    requiredPlan: "starter",
    requiredPermission: "canUseAiRequests",
  },
  {
    featureId: "paperTrading",
    requiredPlan: "starter",
    requiredPermission: "canUsePaperTrading",
    requiredLicense: true,
  },
  {
    featureId: "optimization",
    requiredPlan: "professional",
    requiredPermission: "canOptimize",
    requiredLicense: true,
    requiredSeat: true,
  },
  {
    featureId: "strategyBuilder",
    requiredPlan: "professional",
    requiredPermission: "canOptimize",
    requiredLicense: true,
  },
  {
    featureId: "backtesting",
    requiredPlan: "professional",
    requiredPermission: "canRunBacktests",
    requiredLicense: true,
  },
  {
    featureId: "apiKeys",
    requiredPlan: "institutional",
    requiredPermission: "canAccessApiKeys",
    requiredLicense: true,
  },
  {
    featureId: "prioritySupport",
    requiredPlan: "professional",
    requiredLicense: true,
  },
  {
    featureId: "customBranding",
    requiredPlan: "enterprise",
    requiredLicense: true,
  },
  {
    featureId: "adminConsole",
    requiredPlan: "institutional",
    requiredPermission: "canAccessAdmin",
    requiredSeat: true,
    requiredLicense: true,
  },
] as const;

export function getFeatureRequirement(
  featureId: FeatureId
): FeatureRequirement {
  return (
    FEATURE_REQUIREMENTS.find((f) => f.featureId === featureId) ?? {
      featureId,
      requiredPlan: "enterprise",
      requiredLicense: true,
    }
  );
}

function licenseOk(license: LicenseRecord | null | undefined): boolean {
  if (!license) return false;
  return license.status === "valid" || license.status === "grace";
}

export function evaluateFeatureGate(input: {
  featureId: FeatureId;
  profile: UserProfile | null;
  subscription: SubscriptionRecord | null;
  license: LicenseRecord | null;
}): GateDecision {
  const req = getFeatureRequirement(input.featureId);
  const currentPlan: PlanId = input.subscription?.planId ?? "free";
  const base = {
    featureId: input.featureId,
    requiredPlan: req.requiredPlan,
    currentPlan,
  };

  if (!input.profile || !input.subscription) {
    return {
      ...base,
      visibility: "hidden" as GateVisibility,
      allowed: false,
      reason: "Authentication required.",
    };
  }

  const status = input.subscription.status;

  if (status === "revoked") {
    return {
      ...base,
      visibility: "expired",
      allowed: false,
      reason: "License revoked.",
    };
  }

  if (status === "expired") {
    return {
      ...base,
      visibility: "expired",
      allowed: false,
      reason: "Subscription expired.",
    };
  }

  if (req.requiredLicense && !licenseOk(input.license)) {
    const grace = input.license?.status === "grace";
    return {
      ...base,
      visibility: grace ? "grace_period" : "expired",
      allowed: Boolean(grace),
      reason: grace
        ? "Operating in offline grace period."
        : "Valid license required.",
    };
  }

  if (!planMeetsMinimum(currentPlan, req.requiredPlan)) {
    return {
      ...base,
      visibility: "upgrade_required",
      allowed: false,
      reason: `Requires ${getPlan(req.requiredPlan).name} plan or higher.`,
    };
  }

  if (
    req.requiredPermission &&
    !roleHasPermission(input.profile.role, req.requiredPermission)
  ) {
    return {
      ...base,
      visibility: "disabled",
      allowed: false,
      reason: "Your role does not include this permission.",
    };
  }

  if (
    req.requiredSeat &&
    input.license &&
    input.license.seatsUsed > input.license.seats
  ) {
    return {
      ...base,
      visibility: "disabled",
      allowed: false,
      reason: "No seats remaining on this license.",
    };
  }

  if (status === "trialing") {
    return {
      ...base,
      visibility: "trial",
      allowed: true,
      reason: "Available during trial.",
    };
  }

  if (status === "grace") {
    return {
      ...base,
      visibility: "grace_period",
      allowed: true,
      reason: "Available during grace period.",
    };
  }

  return {
    ...base,
    visibility: "visible",
    allowed: true,
    reason: "Entitled.",
  };
}

export function effectivePermissions(
  planId: PlanId,
  role: UserRole
): PermissionId[] {
  const planPerms = new Set(getPlan(planId).permissions);
  return permissionsForRole(role).filter((p) => planPerms.has(p));
}
