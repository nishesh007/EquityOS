"use client";

/**
 * SaaS platform context — Auth / Subscription / License / Permission / Settings stores.
 * Sprint 12A.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  authService,
  deviceService,
  licenseService,
  permissionService,
  profileService,
  subscriptionService,
} from "./services";
import type {
  AuthSession,
  DeviceRecord,
  FeatureId,
  GateDecision,
  LicenseRecord,
  LoginHistoryEntry,
  PermissionId,
  PlanId,
  SubscriptionRecord,
  TrialDays,
  UserProfile,
} from "./types";
import { PLAN_DEFINITIONS } from "./plans";

interface SaasContextValue {
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  profile: UserProfile | null;
  session: AuthSession | null;
  subscription: SubscriptionRecord | null;
  license: LicenseRecord | null;
  permissions: PermissionId[];
  devices: DeviceRecord[];
  loginHistory: LoginHistoryEntry[];
  plans: typeof PLAN_DEFINITIONS;
  trialDaysRemaining: number;
  isAuthenticated: boolean;
  refresh: () => void;
  clearError: () => void;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  signup: (input: {
    email: string;
    password: string;
    displayName: string;
    planId?: PlanId;
    trialDays?: TrialDays;
  }) => Promise<boolean>;
  logout: () => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<boolean>;
  changePassword: (current: string, next: string) => Promise<boolean>;
  removeDevice: (deviceId: string) => Promise<boolean>;
  changePlan: (planId: PlanId) => Promise<boolean>;
  startTrial: (planId: PlanId, days: TrialDays) => Promise<boolean>;
  can: (permission: PermissionId) => boolean;
  gate: (featureId: FeatureId) => GateDecision;
  requestPasswordReset: (email: string) => Promise<string>;
  resetPassword: (token: string, password: string) => Promise<boolean>;
  verifyEmail: (token: string) => Promise<boolean>;
}

const SaasContext = createContext<SaasContextValue | null>(null);

export function SaasProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRecord | null>(
    null
  );
  const [license, setLicense] = useState<LicenseRecord | null>(null);
  const [permissions, setPermissions] = useState<PermissionId[]>([]);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);

  const syncFromServices = useCallback(() => {
    authService.ensureDemoSeed();
    const active = authService.refreshSession();
    if (!active.ok && active.error === "Session expired.") {
      setError("Session expired. Please sign in again.");
    }
    const sess = authService.getActiveSession();
    setSession(sess);
    if (!sess) {
      setProfile(null);
      setSubscription(null);
      setLicense(null);
      setPermissions([]);
      setDevices([]);
      setLoginHistory([]);
      return;
    }
    const userId = sess.userId;
    setProfile(profileService.getProfile(userId));
    setSubscription(subscriptionService.getForUser(userId));
    setLicense(licenseService.getForUser(userId));
    setPermissions(permissionService.list(userId));
    setDevices(deviceService.list(userId));
    setLoginHistory(deviceService.loginHistory(userId));
  }, []);

  useEffect(() => {
    syncFromServices();
    setHydrated(true);
    const id = window.setInterval(() => {
      authService.refreshSession();
      syncFromServices();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [syncFromServices]);

  const login = useCallback(
    async (email: string, password: string, rememberMe = false) => {
      setLoading(true);
      setError(null);
      const result = authService.login({ email, password, rememberMe });
      setLoading(false);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      syncFromServices();
      return true;
    },
    [syncFromServices]
  );

  const signup = useCallback(
    async (input: {
      email: string;
      password: string;
      displayName: string;
      planId?: PlanId;
      trialDays?: TrialDays;
    }) => {
      setLoading(true);
      setError(null);
      const created = authService.signup(input);
      if (!created.ok) {
        setLoading(false);
        setError(created.error);
        return false;
      }
      const logged = await login(input.email, input.password, true);
      setLoading(false);
      return logged;
    },
    [login]
  );

  const logout = useCallback(() => {
    authService.logout();
    setError(null);
    syncFromServices();
  }, [syncFromServices]);

  const updateProfile = useCallback(
    async (patch: Partial<UserProfile>) => {
      if (!profile) return false;
      const result = profileService.updateProfile(profile.id, patch);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      syncFromServices();
      return true;
    },
    [profile, syncFromServices]
  );

  const changePassword = useCallback(
    async (current: string, next: string) => {
      if (!profile) return false;
      const result = authService.changePassword(profile.id, current, next);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      return true;
    },
    [profile]
  );

  const removeDevice = useCallback(
    async (deviceId: string) => {
      if (!profile) return false;
      const result = deviceService.remove(profile.id, deviceId);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      syncFromServices();
      return true;
    },
    [profile, syncFromServices]
  );

  const changePlan = useCallback(
    async (planId: PlanId) => {
      if (!profile) return false;
      const result = subscriptionService.changePlan(profile.id, planId);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      syncFromServices();
      return true;
    },
    [profile, syncFromServices]
  );

  const startTrial = useCallback(
    async (planId: PlanId, days: TrialDays) => {
      if (!profile) return false;
      const result = subscriptionService.startTrial(profile.id, planId, days);
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      syncFromServices();
      return true;
    },
    [profile, syncFromServices]
  );

  const can = useCallback(
    (permission: PermissionId) => permissions.includes(permission),
    [permissions]
  );

  const gateSafe = useCallback(
    (featureId: FeatureId): GateDecision => {
      if (!profile) {
        return {
          featureId,
          visibility: "hidden",
          allowed: false,
          reason: "Authentication required.",
          requiredPlan: "free",
          currentPlan: "free",
        };
      }
      return permissionService.gate(profile.id, featureId);
    },
    [profile]
  );

  const requestPasswordReset = useCallback(async (email: string) => {
    const result = authService.requestPasswordReset(email);
    return result.ok ? result.data.token : "";
  }, []);

  const resetPassword = useCallback(async (token: string, password: string) => {
    const result = authService.resetPassword(token, password);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    return true;
  }, []);

  const verifyEmail = useCallback(async (token: string) => {
    const result = authService.verifyEmail(token);
    if (!result.ok) {
      setError(result.error);
      return false;
    }
    syncFromServices();
    return true;
  }, [syncFromServices]);

  const value = useMemo<SaasContextValue>(
    () => ({
      hydrated,
      loading,
      error,
      profile,
      session,
      subscription,
      license,
      permissions,
      devices,
      loginHistory,
      plans: PLAN_DEFINITIONS,
      trialDaysRemaining: subscriptionService.trialRemaining(subscription),
      isAuthenticated: Boolean(session && profile),
      refresh: syncFromServices,
      clearError: () => setError(null),
      login,
      signup,
      logout,
      updateProfile,
      changePassword,
      removeDevice,
      changePlan,
      startTrial,
      can,
      gate: gateSafe,
      requestPasswordReset,
      resetPassword,
      verifyEmail,
    }),
    [
      hydrated,
      loading,
      error,
      profile,
      session,
      subscription,
      license,
      permissions,
      devices,
      loginHistory,
      syncFromServices,
      login,
      signup,
      logout,
      updateProfile,
      changePassword,
      removeDevice,
      changePlan,
      startTrial,
      can,
      gateSafe,
      requestPasswordReset,
      resetPassword,
      verifyEmail,
    ]
  );

  return <SaasContext.Provider value={value}>{children}</SaasContext.Provider>;
}

function useSaas(): SaasContextValue {
  const ctx = useContext(SaasContext);
  if (!ctx) {
    throw new Error("useSaas must be used within SaasProvider");
  }
  return ctx;
}

export function useAuth() {
  const s = useSaas();
  return {
    hydrated: s.hydrated,
    loading: s.loading,
    error: s.error,
    clearError: s.clearError,
    isAuthenticated: s.isAuthenticated,
    session: s.session,
    login: s.login,
    signup: s.signup,
    logout: s.logout,
    refresh: s.refresh,
    requestPasswordReset: s.requestPasswordReset,
    resetPassword: s.resetPassword,
    verifyEmail: s.verifyEmail,
    changePassword: s.changePassword,
  };
}

export function useCurrentUser() {
  const s = useSaas();
  return {
    profile: s.profile,
    updateProfile: s.updateProfile,
    hydrated: s.hydrated,
  };
}

export function useSubscription() {
  const s = useSaas();
  return {
    subscription: s.subscription,
    plans: s.plans,
    trialDaysRemaining: s.trialDaysRemaining,
    changePlan: s.changePlan,
    startTrial: s.startTrial,
  };
}

export function useLicense() {
  const s = useSaas();
  return { license: s.license };
}

export function usePermissions() {
  const s = useSaas();
  return {
    permissions: s.permissions,
    can: s.can,
    gate: s.gate,
  };
}

export function useDevices() {
  const s = useSaas();
  return {
    devices: s.devices,
    loginHistory: s.loginHistory,
    removeDevice: s.removeDevice,
  };
}

export { useSaas };
