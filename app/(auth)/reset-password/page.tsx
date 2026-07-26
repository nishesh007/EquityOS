"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/saas";
import { Card } from "@/components/ui/Card";

export default function ResetPasswordPage() {
  const { resetPassword, error, clearError } = useAuth();
  const params = useSearchParams();
  const router = useRouter();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [password, setPassword] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const ok = await resetPassword(token, password);
    if (ok) router.replace("/login");
  }

  return (
    <Card padding="lg">
      <h1 className="text-xl font-semibold text-text-primary">Reset password</h1>
      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
        <label className="block text-xs text-text-faint">
          Reset token
          <input
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm font-mono"
          />
        </label>
        <label className="block text-xs text-text-faint">
          New password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm"
          />
        </label>
        {error && <p className="text-sm text-loss">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
          Update password
        </button>
      </form>
    </Card>
  );
}
