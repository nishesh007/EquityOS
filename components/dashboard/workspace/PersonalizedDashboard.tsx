"use client";

/**
 * Dashboard chrome — QuoteProvider + header band + actions.
 * Hydrates without the widget Flight trees (those are WorkspaceDashboard children).
 */

import { DashboardQuoteProvider } from "@/components/dashboard/DashboardQuoteProvider";
import { WorkspaceDashboard } from "@/src/design/workspace/WorkspaceDashboard";
import type { ReactNode } from "react";
import { QuickActionBar } from "./QuickActionBar";
import { ScrollToTopButton } from "./ScrollToTopButton";

export interface PersonalizedDashboardProps {
  header: ReactNode;
  /**
   * DashboardWidget children (Suspense-wrapped slots).
   * Streamed as Flight children — not a giant widgets Record prop.
   */
  children: ReactNode;
}

/**
 * Pure layout shell. Edit Mode / DnD / persistence live in WorkspaceDashboard.
 * Widget data loaders stay in app/page.tsx Suspense slots.
 */
export function PersonalizedDashboard({
  header,
  children,
}: PersonalizedDashboardProps) {
  return (
    <DashboardQuoteProvider>
      <DashboardChrome header={header}>
        <WorkspaceDashboard>{children}</WorkspaceDashboard>
      </DashboardChrome>
    </DashboardQuoteProvider>
  );
}

/** Chrome only — mounts before workspace widget holes resolve. */
function DashboardChrome({
  header,
  children,
}: {
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {header}
      <QuickActionBar />
      {children}
      <ScrollToTopButton />
    </div>
  );
}
