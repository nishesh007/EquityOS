"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/saas";
import { Card } from "@/components/ui/Card";
import type { PlanId, TrialDays } from "@/lib/saas";

export function SignupForm() {
  const { signup, loading, error, clearError } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [planId, setPlanId] = useState<PlanId>("starter");
  const [trialDays, setTrialDays] = useState<TrialDays>(14);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const ok = await signup({
      email,
      password,
      displayName,
      planId,
      trialDays,
    });
    if (ok) router.replace("/settings/profile");
  }

  return (
    <Card padding="lg" data-testid="signup-form">
      <h1 className="text-xl font-semibold text-text-primary">Create account</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Start a trial — payment collection arrives in Sprint 12B.
      </p>
      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <label className="block text-xs text-text-faint">
          Display name
          <input
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-text-faint">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs text-text-faint">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-text-faint">
            Plan
            <select
              value={planId}
              onChange={(e) => setPlanId(e.target.value as PlanId)}
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
            >
              <option value="starter">Starter</option>
              <option value="professional">Professional</option>
              <option value="institutional">Institutional</option>
            </select>
          </label>
          <label className="block text-xs text-text-faint">
            Trial length
            <select
              value={trialDays}
              onChange={(e) => setTrialDays(Number(e.target.value) as TrialDays)}
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-loss">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-xs text-text-secondary">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
