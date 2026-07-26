/**
 * Sprint 12A — Subscription, Authentication & Licensing types.
 */

export type PlanId =
  | "free"
  | "starter"
  | "professional"
  | "institutional"
  | "enterprise";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "grace"
  | "expired"
  | "revoked";

export type LicenseStatus =
  | "valid"
  | "expired"
  | "grace"
  | "revoked"
  | "invalid"
  | "transfer_pending";

export type UserRole =
  | "owner"
  | "admin"
  | "research_analyst"
  | "portfolio_manager"
  | "viewer";

export type PermissionId =
  | "canExport"
  | "canGenerateResearch"
  | "canRunBacktests"
  | "canOptimize"
  | "canCreatePortfolio"
  | "canAccessAdmin"
  | "canUsePaperTrading"
  | "canAccessDeveloperMode"
  | "canManageDevices"
  | "canManageBilling"
  | "canInviteMembers"
  | "canViewSubscription"
  | "canEditProfile"
  | "canUseAiRequests"
  | "canAccessApiKeys";

export type FeatureId =
  | "dashboard"
  | "research"
  | "optimization"
  | "strategyBuilder"
  | "backtesting"
  | "paperTrading"
  | "exports"
  | "aiInsights"
  | "watchlists"
  | "portfolio"
  | "apiKeys"
  | "customBranding"
  | "prioritySupport"
  | "adminConsole";

export type GateVisibility =
  | "visible"
  | "disabled"
  | "hidden"
  | "upgrade_required"
  | "expired"
  | "trial"
  | "grace_period";

export type TrialDays = 7 | 14 | 30;

export interface PlanLimits {
  storageGb: number;
  exportsPerMonth: number;
  researchReportsPerMonth: number;
  aiRequestsPerMonth: number;
  portfolioCount: number;
  watchlists: number;
  optimizationRunsPerMonth: number;
  backtestsPerMonth: number;
  paperTradingAccounts: number;
  maxDevices: number;
  maxSeats: number;
  apiAccess: boolean;
  prioritySupport: boolean;
  customBranding: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  description: string;
  features: FeatureId[];
  permissions: PermissionId[];
  limits: PlanLimits;
  trialEligible: boolean;
  sortOrder: number;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  phone: string;
  timezone: string;
  country: string;
  preferredCurrency: string;
  avatarUrl: string | null;
  language: string;
  emailVerified: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
  notificationPreferences: {
    emailAlerts: boolean;
    pushAlerts: boolean;
    weeklyDigest: boolean;
    productUpdates: boolean;
  };
  researchPreferences: {
    defaultUniverse: string;
    riskTolerance: "low" | "medium" | "high";
    showAiSuggestions: boolean;
  };
  themePreferences: {
    mode: "system" | "dark" | "light";
    density: "comfortable" | "compact";
  };
}

export interface AuthSession {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  rememberMe: boolean;
  userAgent: string;
  ipHint: string;
}

export interface DeviceRecord {
  id: string;
  userId: string;
  label: string;
  browser: string;
  os: string;
  lastActiveAt: string;
  loginAt: string;
  location: string | null;
  trusted: boolean;
  current: boolean;
}

export interface LoginHistoryEntry {
  id: string;
  userId: string;
  at: string;
  success: boolean;
  browser: string;
  os: string;
  location: string | null;
  ipHint: string;
}

export interface LicenseRecord {
  id: string;
  licenseKey: string;
  userId: string;
  planId: PlanId;
  status: LicenseStatus;
  issuedAt: string;
  expiresAt: string | null;
  graceEndsAt: string | null;
  seats: number;
  seatsUsed: number;
  maxDevices: number;
  metadata: Record<string, string>;
  revokedAt: string | null;
  transferToken: string | null;
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  planId: PlanId;
  status: SubscriptionStatus;
  licenseId: string;
  registeredEmail: string;
  trialDays: TrialDays | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  renewalDate: string | null;
  expiryDate: string | null;
  usage: {
    exportsUsed: number;
    researchReportsUsed: number;
    aiRequestsUsed: number;
    optimizationRunsUsed: number;
    backtestsUsed: number;
  };
  updatedAt: string;
}

export interface FeatureRequirement {
  featureId: FeatureId;
  requiredPlan: PlanId;
  requiredPermission?: PermissionId;
  requiredSeat?: boolean;
  requiredLicense?: boolean;
}

export interface GateDecision {
  featureId: FeatureId;
  visibility: GateVisibility;
  allowed: boolean;
  reason: string;
  requiredPlan: PlanId;
  currentPlan: PlanId;
}

export interface AuthUserRecord {
  profile: UserProfile;
  passwordHash: string;
  recoveryCodes: string[];
  twoFactorEnabled: boolean;
  verifyToken: string | null;
  resetToken: string | null;
  resetTokenExpiresAt: string | null;
}

export interface SaasPersistedState {
  version: 1;
  users: AuthUserRecord[];
  sessions: AuthSession[];
  devices: DeviceRecord[];
  loginHistory: LoginHistoryEntry[];
  licenses: LicenseRecord[];
  subscriptions: SubscriptionRecord[];
  activeSessionId: string | null;
}

export const SESSION_COOKIE = "equityos_session";
export const SAAS_STORAGE_KEY = "equityos.saas.platform.v1";
export const SESSION_TIMEOUT_MS = 1000 * 60 * 60 * 8;
export const SESSION_REMEMBER_MS = 1000 * 60 * 60 * 24 * 30;
export const OFFLINE_GRACE_DAYS = 7;
