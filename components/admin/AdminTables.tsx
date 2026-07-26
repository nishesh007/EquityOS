"use client";

import { useMemo, useState } from "react";
import { useAdmin } from "@/lib/ops";
import type { UserRole } from "@/lib/saas/types";

export function UserTable() {
  const { listUsers, forceLogout, suspendUser, reactivateUser, setRole } =
    useAdmin();
  const [q, setQ] = useState("");
  const rows = useMemo(() => {
    const all = listUsers();
    const qq = q.trim().toLowerCase();
    if (!qq) return all;
    return all.filter(
      (r) =>
        r.user.profile.email.includes(qq) ||
        r.user.profile.displayName.toLowerCase().includes(qq)
    );
  }, [listUsers, q]);

  return (
    <div className="space-y-3">
      <input
        className="w-full max-w-md rounded-lg border border-surface-border-subtle bg-surface-raised px-3 py-2 text-xs"
        placeholder="Search users"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search users"
      />
      <div className="overflow-x-auto" role="region" aria-label="Users">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead className="border-b border-surface-border-subtle text-text-faint">
            <tr>
              <th className="py-2 pr-3 font-medium">User</th>
              <th className="py-2 pr-3 font-medium">Plan</th>
              <th className="py-2 pr-3 font-medium">Role</th>
              <th className="py-2 pr-3 font-medium">License</th>
              <th className="py-2 pr-3 font-medium">Devices</th>
              <th className="py-2 pr-3 font-medium">Sessions</th>
              <th className="py-2 pr-3 font-medium">Last login</th>
              <th className="py-2 pr-3 font-medium">Status</th>
              <th className="py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.user.profile.id}
                className="border-b border-surface-border-subtle/60 text-text-secondary"
              >
                <td className="py-2 pr-3">
                  <div className="text-text-primary">{r.user.profile.displayName}</div>
                  <div className="text-[11px] text-text-faint">{r.user.profile.email}</div>
                </td>
                <td className="py-2 pr-3 capitalize">{r.planId}</td>
                <td className="py-2 pr-3">
                  <select
                    className="rounded border border-surface-border-subtle bg-surface-raised px-1 py-0.5"
                    value={r.role}
                    onChange={(e) =>
                      setRole(r.user.profile.id, e.target.value as UserRole)
                    }
                    aria-label={`Role for ${r.user.profile.email}`}
                  >
                    {(
                      [
                        "owner",
                        "admin",
                        "research_analyst",
                        "portfolio_manager",
                        "viewer",
                      ] as UserRole[]
                    ).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-3 font-mono text-[11px]">
                  {r.license?.licenseKey.slice(0, 12) ?? "—"}
                </td>
                <td className="py-2 pr-3">{r.deviceCount}</td>
                <td className="py-2 pr-3">{r.sessionCount}</td>
                <td className="py-2 pr-3">
                  {r.lastLoginAt
                    ? new Date(r.lastLoginAt).toLocaleString()
                    : "—"}
                </td>
                <td className="py-2 pr-3 capitalize">{r.status}</td>
                <td className="py-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      className="text-accent hover:underline"
                      onClick={() => forceLogout(r.user.profile.id)}
                    >
                      Force logout
                    </button>
                    <button
                      type="button"
                      className="text-danger hover:underline"
                      onClick={() => suspendUser(r.user.profile.id)}
                    >
                      Suspend
                    </button>
                    <button
                      type="button"
                      className="text-success hover:underline"
                      onClick={() => reactivateUser(r.user.profile.id)}
                    >
                      Reactivate
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LicenseTable() {
  const { licensePool } = useAdmin();
  const pool = licensePool();
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6 text-xs">
        {(
          [
            ["Total", pool.total],
            ["Assigned", pool.assigned],
            ["Available", pool.available],
            ["Expired", pool.expired],
            ["Revoked", pool.revoked],
            ["Offline/grace", pool.offline],
          ] as const
        ).map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-3"
          >
            <div className="text-text-faint">{label}</div>
            <div className="text-lg font-semibold">{value}</div>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-xs">
          <thead className="border-b border-surface-border-subtle text-text-faint">
            <tr>
              <th className="py-2 pr-3">Key</th>
              <th className="py-2 pr-3">Plan</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3">User</th>
              <th className="py-2">Seats</th>
            </tr>
          </thead>
          <tbody>
            {pool.licenses.map((l) => (
              <tr key={l.id} className="border-b border-surface-border-subtle/60">
                <td className="py-2 pr-3 font-mono text-[11px]">{l.licenseKey}</td>
                <td className="py-2 pr-3 capitalize">{l.planId}</td>
                <td className="py-2 pr-3 capitalize">{l.status}</td>
                <td className="py-2 pr-3 font-mono text-[11px]">{l.userId.slice(0, 12)}</td>
                <td className="py-2">
                  {l.seatsUsed}/{l.seats}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
