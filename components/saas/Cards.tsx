"use client";

import { cn } from "@/lib/utils";
import type { PlanDefinition, LicenseRecord, DeviceRecord, UserRole, PermissionId } from "@/lib/saas";
import { ROLE_LABELS } from "@/lib/saas";
import { getPlan } from "@/lib/saas";

export function PlanCard({
  plan,
  current,
  onSelect,
  highlight,
}: {
  plan: PlanDefinition;
  current?: boolean;
  onSelect?: () => void;
  highlight?: boolean;
}) {
  return (
    <article
      className={cn(
        "flex h-full flex-col rounded-xl border p-4",
        current || highlight
          ? "border-accent bg-accent/10"
          : "border-surface-border-subtle bg-surface-overlay/40"
      )}
      data-testid={`plan-card-${plan.id}`}
    >
      <h3 className="text-sm font-semibold text-text-primary">{plan.name}</h3>
      <p className="mt-1 text-xs text-text-secondary">{plan.description}</p>
      <ul className="mt-3 flex-1 space-y-1 text-[11px] text-text-secondary">
        <li>{plan.limits.watchlists} watchlists</li>
        <li>{plan.limits.portfolioCount} portfolios</li>
        <li>{plan.limits.backtestsPerMonth} backtests / mo</li>
        <li>{plan.limits.optimizationRunsPerMonth} optimizations / mo</li>
        <li>{plan.limits.maxDevices} devices · {plan.limits.maxSeats} seats</li>
        <li>{plan.limits.apiAccess ? "API access" : "No API"}</li>
      </ul>
      {onSelect && (
        <button
          type="button"
          onClick={onSelect}
          className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          disabled={current}
        >
          {current ? "Current plan" : "Select plan"}
        </button>
      )}
    </article>
  );
}

export function LicenseCard({ license }: { license: LicenseRecord | null }) {
  if (!license) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border-subtle p-4 text-sm text-text-secondary">
        No license issued.
      </div>
    );
  }
  const plan = getPlan(license.planId);
  return (
    <div className="rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-4" data-testid="license-card">
      <div className="text-xs text-text-faint">License ID</div>
      <div className="font-mono text-sm text-text-primary">{license.id}</div>
      <div className="mt-3 text-xs text-text-faint">Key</div>
      <div className="font-mono text-xs text-accent">{license.licenseKey}</div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-text-faint">Plan</dt>
          <dd>{plan.name}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Status</dt>
          <dd className="capitalize">{license.status}</dd>
        </div>
        <div>
          <dt className="text-text-faint">Seats</dt>
          <dd>
            {license.seatsUsed}/{license.seats}
          </dd>
        </div>
        <div>
          <dt className="text-text-faint">Devices</dt>
          <dd>max {license.maxDevices}</dd>
        </div>
      </dl>
    </div>
  );
}

export function DeviceCard({
  device,
  onRemove,
}: {
  device: DeviceRecord;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-surface-border-subtle bg-surface-overlay/40 p-3">
      <div>
        <div className="text-sm font-medium text-text-primary">
          {device.label}
          {device.current && (
            <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-[10px] text-accent">
              Current
            </span>
          )}
        </div>
        <div className="mt-1 text-xs text-text-secondary">
          {device.browser} · {device.os}
          {device.location ? ` · ${device.location}` : ""}
        </div>
        <div className="mt-1 text-[11px] text-text-faint">
          Last active {new Date(device.lastActiveAt).toLocaleString()}
        </div>
      </div>
      {onRemove && !device.current && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-lg border border-loss/40 px-2 py-1 text-xs text-loss"
        >
          Remove
        </button>
      )}
    </div>
  );
}

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="rounded-md border border-surface-border-subtle bg-surface-raised px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-secondary">
      {ROLE_LABELS[role]}
    </span>
  );
}

export function PermissionBadge({ permission }: { permission: PermissionId }) {
  return (
    <span className="rounded-md bg-surface-raised px-2 py-0.5 font-mono text-[10px] text-text-secondary">
      {permission}
    </span>
  );
}
