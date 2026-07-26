"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/lib/saas";
import { Card } from "@/components/ui/Card";

export function LoginForm() {
  const { login, loading, error, clearError } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("analyst@equityos.demo");
  const [password, setPassword] = useState("EquityOS!demo");
  const [rememberMe, setRememberMe] = useState(true);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const ok = await login(email, password, rememberMe);
    if (ok) {
      const next = params.get("next") || "/settings/subscription";
      router.replace(next);
    }
  }

  return (
    <Card padding="lg" data-testid="login-form">
      <h1 className="text-xl font-semibold text-text-primary">Sign in</h1>
      <p className="mt-1 text-sm text-text-secondary">
        Access your EquityOS research terminal. Demo: analyst@equityos.demo / EquityOS!demo
      </p>
      <form className="mt-5 space-y-3" onSubmit={onSubmit} noValidate>
        <label className="block text-xs text-text-faint">
          Email
          <input
            type="email"
            autoComplete="email"
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          Remember me
        </label>
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
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-secondary">
        <Link href="/signup" className="underline">
          Create account
        </Link>
        <Link href="/forgot-password" className="underline">
          Forgot password
        </Link>
      </div>
    </Card>
  );
}
