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

export function isDashboardWidgetElement(
  element: { type: unknown }
): boolean {
  const type = element.type;
  return (
    typeof type === "function" &&
    "slot" in type &&
    (type as { slot?: unknown }).slot === true
  );
}
