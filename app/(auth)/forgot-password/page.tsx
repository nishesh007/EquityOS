"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/saas";
import { Card } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const { requestPasswordReset, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    clearError();
    const t = await requestPasswordReset(email);
    setToken(t || "sent");
  }

  return (
    <Card padding="lg">
      <h1 className="text-xl font-semibold text-text-primary">Forgot password</h1>
      <p className="mt-1 text-sm text-text-secondary">
        We will issue a local reset token (demo mode — no email provider).
      </p>
      <form className="mt-5 space-y-3" onSubmit={onSubmit}>
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
        {error && <p className="text-sm text-loss">{error}</p>}
        <button type="submit" className="w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white">
          Send reset link
        </button>
      </form>
      {token && token !== "sent" && (
        <p className="mt-4 break-all text-xs text-text-secondary" role="status">
          Demo reset token:{" "}
          <Link className="text-accent underline" href={`/reset-password?token=${token}`}>
            {token}
          </Link>
        </p>
      )}
      {token === "sent" && (
        <p className="mt-4 text-xs text-text-secondary" role="status">
          If an account exists, a reset token was prepared.
        </p>
      )}
    </Card>
  );
}
