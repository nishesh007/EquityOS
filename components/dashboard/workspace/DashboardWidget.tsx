"use client";

/**
 * Flight slot marker for workspace widgets.
 * Server pages pass these as children of WorkspaceDashboard (not a Record prop)
 * so each Suspense tree streams as an independent child hole.
 */

import type { ReactNode } from "react";

export interface DashboardWidgetProps {
  /** Registered widget id (must match widgetRegistry / workspace placements). */
  id: string;
  children: ReactNode;
}

/**
 * Identity wrapper — WorkspaceDashboard unwraps `children` by `id`.
 * Must stay a Client Component so the same module reference is visible
 * when collecting slots on the client.
 */
export function DashboardWidget({ children }: DashboardWidgetProps) {
  return <>{children}</>;
}

DashboardWidget.displayName = "DashboardWidget";
/** Stable marker for Children collection (survives minification better than name). */
DashboardWidget.slot = true as const;

/**
 * Detect DashboardWidget markers in WorkspaceDashboard children.
 *
 * Direct function references expose `.slot`. Across the RSC → Client boundary,
 * Next/React 19 often wraps Client Components as lazy proxies
 * (`{ $$typeof, _payload, _init }`) where `.slot` is not visible on `type`.
 * Those proxies still carry our `id` prop — required for placement.
 */
export function isDashboardWidgetElement(element: {
  type: unknown;
  props?: unknown;
}): boolean {
  const type = element.type;
  if (
    typeof type === "function" &&
    "slot" in type &&
    (type as { slot?: unknown }).slot === true
  ) {
    return true;
  }

  const props = element.props as { id?: unknown } | null | undefined;
  if (!props || typeof props.id !== "string" || props.id.length === 0) {
    return false;
  }

  if (!type || typeof type !== "object") return false;

  const ref = type as {
    slot?: unknown;
    displayName?: string;
    name?: string;
    _payload?: unknown;
    _init?: unknown;
  };

  if (ref.slot === true) return true;
  if (
    ref.displayName === "DashboardWidget" ||
    ref.name === "DashboardWidget"
  ) {
    return true;
  }

  // Flight lazy / client reference proxy for a Client Component marker.
  return "_payload" in ref && "_init" in ref;
}
