"use client";

import { DashboardQuoteProvider } from "@/components/dashboard/DashboardQuoteProvider";
import { WorkspaceDashboard } from "@/src/design";
import type { ReactNode } from "react";
import { QuickActionBar } from "./QuickActionBar";
import { ScrollToTopButton } from "./ScrollToTopButton";

export interface PersonalizedDashboardProps {
  header: ReactNode;
  /** Rendered widget content keyed by registered widget id. */
  widgets: Record<string, ReactNode>;
}

/**
 * Dashboard workspace shell — Edit Mode, DnD, resize, library and profiles
 * live in WorkspaceDashboard (presentation only, localStorage).
 * DashboardQuoteProvider owns one shared quote poll for all widgets.
 */
export function PersonalizedDashboard({
  header,
  widgets,
}: PersonalizedDashboardProps) {
  return (
    <DashboardQuoteProvider>
      <div className="relative">
        {header}
        <QuickActionBar />
        <WorkspaceDashboard widgets={widgets} />
        <ScrollToTopButton />
      </div>
    </DashboardQuoteProvider>
  );
}
