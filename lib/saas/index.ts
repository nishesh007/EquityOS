/**
 * Sprint 12A — SaaS public API.
 */

export type * from "./types";
export {
  PLAN_DEFINITIONS,
  getPlan,
  planRank,
  planMeetsMinimum,
} from "./plans";
export {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  permissionsForRole,
  roleHasPermission,
} from "./roles";
export {
  FEATURE_REQUIREMENTS,
  getFeatureRequirement,
  evaluateFeatureGate,
  effectivePermissions,
} from "./feature-gate";
export {
  generateLicenseKey,
  createLicense,
  validateLicense,
  revokeLicense,
  beginLicenseTransfer,
  completeLicenseTransfer,
  assignSeat,
  releaseSeat,
  trialExpiry,
} from "./license-engine";
export {
  authService,
  profileService,
  deviceService,
  subscriptionService,
  licenseService,
  permissionService,
} from "./services";
export {
  SaasProvider,
  useAuth,
  useCurrentUser,
  useSubscription,
  useLicense,
  usePermissions,
  useDevices,
  useSaas,
} from "./context";
export { hashPassword, verifyPassword, daysRemaining } from "./utils";
