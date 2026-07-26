"use client";

import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/saas";
import { Card } from "@/components/ui/Card";

export default function VerifyEmailPage() {
  const { verifyEmail, error, clearError } = useAuth();
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") ?? "");
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const ok = await verifyEmail(token);
    if (ok) setDone(true);
  }

  return (
    <Card padding="lg">
      <h1 className="text-xl font-semibold text-text-primary">Verify email</h1>
      {done ? (
        <p className="mt-3 text-sm text-gain" role="status">
          Email verified successfully.
        </p>
      ) : (
        <form className="mt-5 space-y-3" onSubmit={onSubmit}>
          <label className="block text-xs text-text-faint">
            Verification token
            <input
              required
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1 w-full rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-sm font-mono"
            />
          </label>
          {error && <p className="text-sm text-loss">{error}</p>}
          <button type="submit" className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
            Verify
          </button>
        </form>
      )}
    </Card>
  );
}
