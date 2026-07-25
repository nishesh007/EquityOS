"use client";

/**
 * Dashboard chrome — QuoteProvider + layout shell.
 * Hydrates without the widget Flight trees (those are WorkspaceDashboard children).
 */

import { DashboardQuoteProvider } from "@/components/dashboard/DashboardQuoteProvider";
import { WorkspaceDashboard } from "@/src/design/workspace/WorkspaceDashboard";
import type { ReactNode } from "react";
import { ScrollToTopButton } from "./ScrollToTopButton";

export interface PersonalizedDashboardProps {
  /**
   * Executive strip (Market Pulse + AI Briefing + Flash Cards).
   * Rendered after the single header toolbar, before widgets.
   */
  executive?: ReactNode;
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
  executive,
  children,
}: PersonalizedDashboardProps) {
  return (
    <DashboardQuoteProvider>
      <div className="relative">
        <WorkspaceDashboard executive={executive}>{children}</WorkspaceDashboard>
        <ScrollToTopButton />
      </div>
    </DashboardQuoteProvider>
  );
}
