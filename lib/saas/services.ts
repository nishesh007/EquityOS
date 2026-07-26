/**
 * Auth / profile / device / subscription services — Sprint 12A.
 * Local-first (no payment gateway).
 */

import { evaluateFeatureGate, effectivePermissions } from "./feature-gate";
import {
  createLicense,
  revokeLicense,
  trialExpiry,
  validateLicense,
  beginLicenseTransfer,
  completeLicenseTransfer,
} from "./license-engine";
import { getPlan } from "./plans";
import { loadState, saveState, setSessionCookie, emptyState } from "./persistence";
import type {
  AuthSession,
  AuthUserRecord,
  DeviceRecord,
  FeatureId,
  GateDecision,
  LicenseRecord,
  LoginHistoryEntry,
  PlanId,
  SaasPersistedState,
  SubscriptionRecord,
  TrialDays,
  UserProfile,
  UserRole,
} from "./types";
import {
  SESSION_REMEMBER_MS,
  SESSION_TIMEOUT_MS,
} from "./types";
import {
  createId,
  hashPassword,
  nowIso,
  parseUserAgent,
  randomToken,
  verifyPassword,
  daysRemaining,
} from "./utils";

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function persist(state: SaasPersistedState): ServiceResult<SaasPersistedState> {
  const saved = saveState(state);
  if (!saved.ok) return { ok: false, error: saved.error ?? "Persist failed" };
  return { ok: true, data: state };
}

function ua(): string {
  return typeof navigator !== "undefined" ? navigator.userAgent : "EquityOS/SSR";
}

function defaultProfile(partial: {
  email: string;
  displayName: string;
  role?: UserRole;
}): UserProfile {
  const ts = nowIso();
  return {
    id: createId("usr"),
    email: partial.email.trim().toLowerCase(),
    displayName: partial.displayName.trim() || partial.email.split("@")[0]!,
    phone: "",
    timezone: "Asia/Kolkata",
    country: "IN",
    preferredCurrency: "INR",
    avatarUrl: null,
    language: "en",
    emailVerified: false,
    role: partial.role ?? "owner",
    createdAt: ts,
    updatedAt: ts,
    notificationPreferences: {
      emailAlerts: true,
      pushAlerts: false,
      weeklyDigest: true,
      productUpdates: true,
    },
    researchPreferences: {
      defaultUniverse: "Nifty 500",
      riskTolerance: "medium",
      showAiSuggestions: true,
    },
    themePreferences: {
      mode: "dark",
      density: "comfortable",
    },
  };
}

function createSubscriptionBundle(input: {
  userId: string;
  email: string;
  planId: PlanId;
  trialDays?: TrialDays | null;
}): { license: LicenseRecord; subscription: SubscriptionRecord } {
  const now = nowIso();
  const trialDays = input.trialDays ?? null;
  const expiresAt = trialDays ? trialExpiry(now, trialDays) : null;
  const license = createLicense({
    userId: input.userId,
    planId: input.planId,
    expiresAt,
  });
  const subscription: SubscriptionRecord = {
    id: createId("sub"),
    userId: input.userId,
    planId: input.planId,
    status: trialDays ? "trialing" : input.planId === "free" ? "active" : "active",
    licenseId: license.id,
    registeredEmail: input.email,
    trialDays,
    trialStartedAt: trialDays ? now : null,
    trialEndsAt: trialDays ? expiresAt : null,
    renewalDate: expiresAt,
    expiryDate: expiresAt,
    usage: {
      exportsUsed: 0,
      researchReportsUsed: 0,
      aiRequestsUsed: 0,
      optimizationRunsUsed: 0,
      backtestsUsed: 0,
    },
    updatedAt: now,
  };
  return { license, subscription };
}

function refreshSubscriptionStatus(
  sub: SubscriptionRecord,
  license: LicenseRecord
): { subscription: SubscriptionRecord; license: LicenseRecord } {
  const validated = validateLicense(license);
  let status = sub.status;
  if (validated.status === "revoked") status = "revoked";
  else if (validated.status === "expired") status = "expired";
  else if (validated.status === "grace") status = "grace";
  else if (sub.trialEndsAt && new Date(sub.trialEndsAt).getTime() > Date.now())
    status = "trialing";
  else if (validated.status === "valid") status = "active";

  return {
    license: validated.license,
    subscription: { ...sub, status, updatedAt: nowIso() },
  };
}

export const authService = {
  getState(): SaasPersistedState {
    return loadState();
  },

  ensureDemoSeed(): SaasPersistedState {
    const state = loadState();
    if (state.users.length > 0) return state;
    const profile = defaultProfile({
      email: "analyst@equityos.demo",
      displayName: "Demo Analyst",
      role: "owner",
    });
    profile.emailVerified = true;
    const user: AuthUserRecord = {
      profile,
      passwordHash: hashPassword("EquityOS!demo"),
      recoveryCodes: [randomToken(4), randomToken(4), randomToken(4)],
      twoFactorEnabled: false,
      verifyToken: null,
      resetToken: null,
      resetTokenExpiresAt: null,
    };
    const { license, subscription } = createSubscriptionBundle({
      userId: profile.id,
      email: profile.email,
      planId: "professional",
      trialDays: 14,
    });
    const next: SaasPersistedState = {
      ...emptyState(),
      users: [user],
      licenses: [license],
      subscriptions: [subscription],
    };
    saveState(next);
    return next;
  },

  signup(input: {
    email: string;
    password: string;
    displayName: string;
    planId?: PlanId;
    trialDays?: TrialDays;
  }): ServiceResult<{ profile: UserProfile }> {
    const state = this.ensureDemoSeed();
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) return { ok: false, error: "Enter a valid email." };
    if (input.password.length < 8)
      return { ok: false, error: "Password must be at least 8 characters." };
    if (state.users.some((u) => u.profile.email === email))
      return { ok: false, error: "An account with this email already exists." };

    const profile = defaultProfile({
      email,
      displayName: input.displayName,
      role: "owner",
    });
    const verifyToken = randomToken(16);
    const user: AuthUserRecord = {
      profile,
      passwordHash: hashPassword(input.password),
      recoveryCodes: [randomToken(4), randomToken(4), randomToken(4)],
      twoFactorEnabled: false,
      verifyToken,
      resetToken: null,
      resetTokenExpiresAt: null,
    };
    const planId = input.planId ?? "starter";
    const { license, subscription } = createSubscriptionBundle({
      userId: profile.id,
      email,
      planId,
      trialDays: input.trialDays ?? 14,
    });
    const next: SaasPersistedState = {
      ...state,
      users: [...state.users, user],
      licenses: [...state.licenses, license],
      subscriptions: [...state.subscriptions, subscription],
    };
    return persist(next).ok
      ? { ok: true, data: { profile } }
      : { ok: false, error: "Unable to create account." };
  },

  login(input: {
    email: string;
    password: string;
    rememberMe?: boolean;
  }): ServiceResult<{ session: AuthSession; profile: UserProfile }> {
    const state = this.ensureDemoSeed();
    const email = input.email.trim().toLowerCase();
    const user = state.users.find((u) => u.profile.email === email);
    const { browser, os } = parseUserAgent(ua());
    const historyBase: Omit<LoginHistoryEntry, "id" | "success"> = {
      userId: user?.profile.id ?? "unknown",
      at: nowIso(),
      browser,
      os,
      location: null,
      ipHint: "local",
    };

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      const fail: LoginHistoryEntry = {
        ...historyBase,
        id: createId("login"),
        success: false,
      };
      persist({ ...state, loginHistory: [fail, ...state.loginHistory].slice(0, 100) });
      return { ok: false, error: "Authentication failed. Check email and password." };
    }

    const remember = Boolean(input.rememberMe);
    const ttl = remember ? SESSION_REMEMBER_MS : SESSION_TIMEOUT_MS;
    const now = nowIso();
    const session: AuthSession = {
      id: createId("sess"),
      userId: user.profile.id,
      createdAt: now,
      expiresAt: new Date(Date.now() + ttl).toISOString(),
      lastActiveAt: now,
      rememberMe: remember,
      userAgent: ua(),
      ipHint: "local",
    };

    const devices = state.devices.map((d) =>
      d.userId === user.profile.id ? { ...d, current: false } : d
    );
    const device: DeviceRecord = {
      id: createId("dev"),
      userId: user.profile.id,
      label: `${browser} on ${os}`,
      browser,
      os,
      lastActiveAt: now,
      loginAt: now,
      location: null,
      trusted: remember,
      current: true,
    };

    const userDevices = devices.filter((d) => d.userId === user.profile.id);
    const plan = getPlan(
      state.subscriptions.find((s) => s.userId === user.profile.id)?.planId ??
        "free"
    );
    if (userDevices.length + 1 > plan.limits.maxDevices) {
      return {
        ok: false,
        error: `Device limit reached (${plan.limits.maxDevices}). Remove a device in Settings.`,
      };
    }

    const success: LoginHistoryEntry = {
      ...historyBase,
      id: createId("login"),
      userId: user.profile.id,
      success: true,
    };

    const next: SaasPersistedState = {
      ...state,
      sessions: [...state.sessions.filter((s) => s.userId !== user.profile.id), session],
      devices: [...devices, device],
      loginHistory: [success, ...state.loginHistory].slice(0, 100),
      activeSessionId: session.id,
    };
    const saved = persist(next);
    if (!saved.ok) return { ok: false, error: saved.error };
    setSessionCookie(session.id, Math.floor(ttl / 1000));
    return { ok: true, data: { session, profile: user.profile } };
  },

  logout(): ServiceResult<true> {
    const state = loadState();
    const next: SaasPersistedState = {
      ...state,
      sessions: state.sessions.filter((s) => s.id !== state.activeSessionId),
      devices: state.devices.map((d) =>
        d.current ? { ...d, current: false } : d
      ),
      activeSessionId: null,
    };
    persist(next);
    setSessionCookie(null, 0);
    return { ok: true, data: true };
  },

  refreshSession(): ServiceResult<AuthSession | null> {
    const state = loadState();
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    if (!session) return { ok: true, data: null };
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.logout();
      return { ok: false, error: "Session expired." };
    }
    const ttl = session.rememberMe ? SESSION_REMEMBER_MS : SESSION_TIMEOUT_MS;
    const updated: AuthSession = {
      ...session,
      lastActiveAt: nowIso(),
      expiresAt: new Date(Date.now() + ttl).toISOString(),
    };
    const next = {
      ...state,
      sessions: state.sessions.map((s) => (s.id === updated.id ? updated : s)),
      devices: state.devices.map((d) =>
        d.current && d.userId === session.userId
          ? { ...d, lastActiveAt: nowIso() }
          : d
      ),
    };
    persist(next);
    setSessionCookie(updated.id, Math.floor(ttl / 1000));
    return { ok: true, data: updated };
  },

  getActiveSession(): AuthSession | null {
    const state = loadState();
    const session = state.sessions.find((s) => s.id === state.activeSessionId);
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.logout();
      return null;
    }
    return session;
  },

  requestPasswordReset(email: string): ServiceResult<{ token: string }> {
    const state = loadState();
    const user = state.users.find(
      (u) => u.profile.email === email.trim().toLowerCase()
    );
    if (!user) {
      // Do not leak account existence
      return { ok: true, data: { token: "" } };
    }
    const token = randomToken(16);
    const next = {
      ...state,
      users: state.users.map((u) =>
        u.profile.id === user.profile.id
          ? {
              ...u,
              resetToken: token,
              resetTokenExpiresAt: new Date(Date.now() + 3600_000).toISOString(),
            }
          : u
      ),
    };
    persist(next);
    return { ok: true, data: { token } };
  },

  resetPassword(token: string, password: string): ServiceResult<true> {
    if (password.length < 8)
      return { ok: false, error: "Password must be at least 8 characters." };
    const state = loadState();
    const user = state.users.find(
      (u) =>
        u.resetToken === token &&
        u.resetTokenExpiresAt &&
        new Date(u.resetTokenExpiresAt).getTime() > Date.now()
    );
    if (!user) return { ok: false, error: "Reset link is invalid or expired." };
    const next = {
      ...state,
      users: state.users.map((u) =>
        u.profile.id === user.profile.id
          ? {
              ...u,
              passwordHash: hashPassword(password),
              resetToken: null,
              resetTokenExpiresAt: null,
            }
          : u
      ),
    };
    persist(next);
    return { ok: true, data: true };
  },

  verifyEmail(token: string): ServiceResult<true> {
    const state = loadState();
    const user = state.users.find((u) => u.verifyToken === token);
    if (!user) return { ok: false, error: "Verification token is invalid." };
    const next = {
      ...state,
      users: state.users.map((u) =>
        u.profile.id === user.profile.id
          ? {
              ...u,
              verifyToken: null,
              profile: { ...u.profile, emailVerified: true, updatedAt: nowIso() },
            }
          : u
      ),
    };
    persist(next);
    return { ok: true, data: true };
  },

  changePassword(
    userId: string,
    current: string,
    nextPassword: string
  ): ServiceResult<true> {
    const state = loadState();
    const user = state.users.find((u) => u.profile.id === userId);
    if (!user) return { ok: false, error: "User not found." };
    if (!verifyPassword(current, user.passwordHash))
      return { ok: false, error: "Current password is incorrect." };
    if (nextPassword.length < 8)
      return { ok: false, error: "Password must be at least 8 characters." };
    const next = {
      ...state,
      users: state.users.map((u) =>
        u.profile.id === userId
          ? { ...u, passwordHash: hashPassword(nextPassword) }
          : u
      ),
    };
    persist(next);
    return { ok: true, data: true };
  },
};

export const profileService = {
  getProfile(userId: string): UserProfile | null {
    return (
      loadState().users.find((u) => u.profile.id === userId)?.profile ?? null
    );
  },

  updateProfile(
    userId: string,
    patch: Partial<UserProfile>
  ): ServiceResult<UserProfile> {
    const state = loadState();
    const user = state.users.find((u) => u.profile.id === userId);
    if (!user) return { ok: false, error: "User not found." };
    const profile: UserProfile = {
      ...user.profile,
      ...patch,
      id: user.profile.id,
      email: user.profile.email,
      updatedAt: nowIso(),
      notificationPreferences: {
        ...user.profile.notificationPreferences,
        ...(patch.notificationPreferences ?? {}),
      },
      researchPreferences: {
        ...user.profile.researchPreferences,
        ...(patch.researchPreferences ?? {}),
      },
      themePreferences: {
        ...user.profile.themePreferences,
        ...(patch.themePreferences ?? {}),
      },
    };
    const next = {
      ...state,
      users: state.users.map((u) =>
        u.profile.id === userId ? { ...u, profile } : u
      ),
    };
    const saved = persist(next);
    if (!saved.ok) return { ok: false, error: saved.error };
    return { ok: true, data: profile };
  },
};

export const deviceService = {
  list(userId: string): DeviceRecord[] {
    return loadState().devices.filter((d) => d.userId === userId);
  },

  remove(userId: string, deviceId: string): ServiceResult<true> {
    const state = loadState();
    const device = state.devices.find(
      (d) => d.id === deviceId && d.userId === userId
    );
    if (!device) return { ok: false, error: "Device not found." };
    if (device.current)
      return { ok: false, error: "Cannot remove the current device. Log out instead." };
    const next = {
      ...state,
      devices: state.devices.filter((d) => d.id !== deviceId),
    };
    persist(next);
    return { ok: true, data: true };
  },

  loginHistory(userId: string): LoginHistoryEntry[] {
    return loadState().loginHistory.filter((h) => h.userId === userId);
  },

  sessions(userId: string): AuthSession[] {
    return loadState().sessions.filter((s) => s.userId === userId);
  },
};

export const subscriptionService = {
  getForUser(userId: string): SubscriptionRecord | null {
    const state = loadState();
    const sub = state.subscriptions.find((s) => s.userId === userId) ?? null;
    const license = state.licenses.find((l) => l.id === sub?.licenseId) ?? null;
    if (!sub || !license) return sub;
    const refreshed = refreshSubscriptionStatus(sub, license);
    const next = {
      ...state,
      subscriptions: state.subscriptions.map((s) =>
        s.id === sub.id ? refreshed.subscription : s
      ),
      licenses: state.licenses.map((l) =>
        l.id === license.id ? refreshed.license : l
      ),
    };
    persist(next);
    return refreshed.subscription;
  },

  startTrial(userId: string, planId: PlanId, days: TrialDays): ServiceResult<SubscriptionRecord> {
    const state = loadState();
    const plan = getPlan(planId);
    if (!plan.trialEligible)
      return { ok: false, error: "This plan is not trial-eligible." };
    const email =
      state.users.find((u) => u.profile.id === userId)?.profile.email ?? "";
    const { license, subscription } = createSubscriptionBundle({
      userId,
      email,
      planId,
      trialDays: days,
    });
    const next = {
      ...state,
      licenses: [
        ...state.licenses.filter((l) => l.userId !== userId),
        license,
      ],
      subscriptions: [
        ...state.subscriptions.filter((s) => s.userId !== userId),
        subscription,
      ],
    };
    const saved = persist(next);
    if (!saved.ok) return { ok: false, error: saved.error };
    return { ok: true, data: subscription };
  },

  changePlan(userId: string, planId: PlanId): ServiceResult<SubscriptionRecord> {
    // No payment — plan change is entitlement-only for 12A.
    const state = loadState();
    const sub = state.subscriptions.find((s) => s.userId === userId);
    if (!sub) return { ok: false, error: "No subscription found." };
    const license = createLicense({
      userId,
      planId,
      expiresAt: sub.expiryDate,
    });
    const updated: SubscriptionRecord = {
      ...sub,
      planId,
      licenseId: license.id,
      status: "active",
      updatedAt: nowIso(),
    };
    const next = {
      ...state,
      licenses: [
        ...state.licenses.filter((l) => l.userId !== userId),
        license,
      ],
      subscriptions: state.subscriptions.map((s) =>
        s.id === sub.id ? updated : s
      ),
    };
    const saved = persist(next);
    if (!saved.ok) return { ok: false, error: saved.error };
    return { ok: true, data: updated };
  },

  trialRemaining(sub: SubscriptionRecord | null): number {
    if (!sub?.trialEndsAt || sub.status !== "trialing") return 0;
    return daysRemaining(sub.trialEndsAt);
  },
};

export const licenseService = {
  getForUser(userId: string): LicenseRecord | null {
    const state = loadState();
    const lic =
      state.licenses.find(
        (l) => l.userId === userId && l.status !== "revoked"
      ) ?? null;
    if (!lic) return null;
    return validateLicense(lic).license;
  },

  revoke(userId: string): ServiceResult<LicenseRecord> {
    const state = loadState();
    const lic = state.licenses.find((l) => l.userId === userId);
    if (!lic) return { ok: false, error: "License not found." };
    const revoked = revokeLicense(lic);
    const next = {
      ...state,
      licenses: state.licenses.map((l) => (l.id === lic.id ? revoked : l)),
      subscriptions: state.subscriptions.map((s) =>
        s.userId === userId
          ? { ...s, status: "revoked" as const, updatedAt: nowIso() }
          : s
      ),
    };
    persist(next);
    return { ok: true, data: revoked };
  },

  beginTransfer(userId: string): ServiceResult<LicenseRecord> {
    const state = loadState();
    const lic = state.licenses.find((l) => l.userId === userId);
    if (!lic) return { ok: false, error: "License not found." };
    const pending = beginLicenseTransfer(lic);
    persist({
      ...state,
      licenses: state.licenses.map((l) => (l.id === lic.id ? pending : l)),
    });
    return { ok: true, data: pending };
  },

  completeTransfer(
    transferToken: string,
    newUserId: string
  ): ServiceResult<LicenseRecord> {
    const state = loadState();
    const lic = state.licenses.find((l) => l.transferToken === transferToken);
    if (!lic) return { ok: false, error: "Transfer token invalid." };
    const transferred = completeLicenseTransfer(lic, newUserId);
    persist({
      ...state,
      licenses: state.licenses.map((l) => (l.id === lic.id ? transferred : l)),
    });
    return { ok: true, data: transferred };
  },
};

export const permissionService = {
  list(userId: string) {
    const profile = profileService.getProfile(userId);
    const sub = subscriptionService.getForUser(userId);
    if (!profile || !sub) return [] as ReturnType<typeof effectivePermissions>;
    return effectivePermissions(sub.planId, profile.role);
  },

  can(userId: string, permission: import("./types").PermissionId): boolean {
    return this.list(userId).includes(permission);
  },

  gate(userId: string, featureId: FeatureId): GateDecision {
    const profile = profileService.getProfile(userId);
    const subscription = subscriptionService.getForUser(userId);
    const license = licenseService.getForUser(userId);
    return evaluateFeatureGate({
      featureId,
      profile,
      subscription,
      license,
    });
  },
};
