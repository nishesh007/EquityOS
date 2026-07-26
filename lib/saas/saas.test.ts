import { describe, expect, it, beforeEach } from "vitest";
import {
  assignSeat,
  createLicense,
  evaluateFeatureGate,
  generateLicenseKey,
  getPlan,
  hashPassword,
  planMeetsMinimum,
  ROLE_PERMISSIONS,
  roleHasPermission,
  validateLicense,
  verifyPassword,
  revokeLicense,
} from "./index";
import { authService, permissionService, subscriptionService } from "./services";
import { emptyState, saveState, resetMemoryState } from "./persistence";
import type { UserProfile } from "./types";

describe("Sprint 12A SaaS platform", () => {
  beforeEach(() => {
    resetMemoryState();
    saveState(emptyState());
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });

  it("hashes and verifies passwords", () => {
    const hash = hashPassword("EquityOS!demo");
    expect(verifyPassword("EquityOS!demo", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
  });

  it("defines five plans with ascending ranks", () => {
    expect(getPlan("free").name).toBe("Free");
    expect(planMeetsMinimum("professional", "starter")).toBe(true);
    expect(planMeetsMinimum("free", "professional")).toBe(false);
    expect(getPlan("enterprise").limits.apiAccess).toBe(true);
  });

  it("maps roles to permissions", () => {
    expect(roleHasPermission("viewer", "canExport")).toBe(false);
    expect(roleHasPermission("research_analyst", "canOptimize")).toBe(true);
    expect(ROLE_PERMISSIONS.owner).toContain("canAccessAdmin");
  });

  it("generates and validates licenses", () => {
    const key = generateLicenseKey("professional");
    expect(key.startsWith("EOS-")).toBe(true);
    const license = createLicense({
      userId: "u1",
      planId: "professional",
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
    });
    const valid = validateLicense(license);
    expect(valid.status).toBe("valid");
    const revoked = validateLicense(revokeLicense(license));
    expect(revoked.status).toBe("revoked");
  });

  it("assigns seats until capacity", () => {
    let license = createLicense({ userId: "u1", planId: "starter", seats: 1 });
    license = { ...license, seatsUsed: 0 };
    const first = assignSeat(license);
    expect(first.ok).toBe(true);
    const second = assignSeat(first.license);
    expect(second.ok).toBe(false);
  });

  it("gates features by plan and role", () => {
    const profile: UserProfile = {
      id: "u1",
      email: "a@b.com",
      displayName: "A",
      phone: "",
      timezone: "Asia/Kolkata",
      country: "IN",
      preferredCurrency: "INR",
      avatarUrl: null,
      language: "en",
      emailVerified: true,
      role: "viewer",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      notificationPreferences: {
        emailAlerts: true,
        pushAlerts: false,
        weeklyDigest: true,
        productUpdates: true,
      },
      researchPreferences: {
        defaultUniverse: "Nifty 50",
        riskTolerance: "low",
        showAiSuggestions: true,
      },
      themePreferences: { mode: "dark", density: "comfortable" },
    };
    const license = createLicense({ userId: "u1", planId: "free" });
    const subscription = {
      id: "s1",
      userId: "u1",
      planId: "free" as const,
      status: "active" as const,
      licenseId: license.id,
      registeredEmail: profile.email,
      trialDays: null,
      trialStartedAt: null,
      trialEndsAt: null,
      renewalDate: null,
      expiryDate: null,
      usage: {
        exportsUsed: 0,
        researchReportsUsed: 0,
        aiRequestsUsed: 0,
        optimizationRunsUsed: 0,
        backtestsUsed: 0,
      },
      updatedAt: new Date().toISOString(),
    };
    const opt = evaluateFeatureGate({
      featureId: "optimization",
      profile,
      subscription,
      license,
    });
    expect(opt.allowed).toBe(false);
    expect(opt.visibility).toBe("upgrade_required");
  });

  it("signs up, logs in, and exposes permissions", () => {
    const signup = authService.signup({
      email: "new@equityos.test",
      password: "Password1!",
      displayName: "New User",
      planId: "professional",
      trialDays: 7,
    });
    expect(signup.ok).toBe(true);
    const login = authService.login({
      email: "new@equityos.test",
      password: "Password1!",
      rememberMe: true,
    });
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    const perms = permissionService.list(login.data.profile.id);
    expect(perms.length).toBeGreaterThan(0);
    const gate = permissionService.gate(login.data.profile.id, "optimization");
    expect(gate.allowed).toBe(true);
    const sub = subscriptionService.getForUser(login.data.profile.id);
    expect(sub?.status).toBe("trialing");
  });

  it("rejects duplicate signup emails", () => {
    authService.signup({
      email: "dup@equityos.test",
      password: "Password1!",
      displayName: "One",
    });
    const again = authService.signup({
      email: "dup@equityos.test",
      password: "Password1!",
      displayName: "Two",
    });
    expect(again.ok).toBe(false);
  });
});
