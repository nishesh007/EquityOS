/**
 * Role → permission registry — Sprint 12A.
 */

import type { PermissionId, UserRole } from "./types";

const VIEWER: PermissionId[] = [
  "canViewSubscription",
  "canEditProfile",
];

const ANALYST: PermissionId[] = [
  ...VIEWER,
  "canGenerateResearch",
  "canExport",
  "canUseAiRequests",
  "canRunBacktests",
  "canOptimize",
  "canUsePaperTrading",
];

const PM: PermissionId[] = [
  ...ANALYST,
  "canCreatePortfolio",
  "canManageDevices",
];

const ADMIN: PermissionId[] = [
  ...PM,
  "canInviteMembers",
  "canAccessAdmin",
  "canAccessApiKeys",
  "canAccessDeveloperMode",
  "canManageBilling",
];

const OWNER: PermissionId[] = [...ADMIN];

export const ROLE_PERMISSIONS: Record<UserRole, readonly PermissionId[]> = {
  viewer: VIEWER,
  research_analyst: ANALYST,
  portfolio_manager: PM,
  admin: ADMIN,
  owner: OWNER,
};

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner",
  admin: "Admin",
  research_analyst: "Research Analyst",
  portfolio_manager: "Portfolio Manager",
  viewer: "Viewer",
};

export function permissionsForRole(role: UserRole): readonly PermissionId[] {
  return ROLE_PERMISSIONS[role] ?? VIEWER;
}

export function roleHasPermission(
  role: UserRole,
  permission: PermissionId
): boolean {
  return permissionsForRole(role).includes(permission);
}
