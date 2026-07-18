"use client";

import { AIWorkspaceProvider } from "@/components/ai/AskAIButton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { onUiEvent } from "@/src/design/command/uiBus";
import { TerminalExperience } from "@/src/design/command/TerminalExperience";
import { Breadcrumbs } from "@/src/design/navigation/BreadcrumbTrail";
import { PageTransition } from "@/src/design/navigation/PageTransition";
import { StatusBar } from "@/src/design/navigation/StatusBar";
import { matchShortcut } from "@/src/design/workspace/workspaceShortcuts";
import { useEffect, useState } from "react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? "68px" : "240px";

  useEffect(() => {
    const mobile = window.matchMedia("(max-width: 767px)");
    const syncSidebar = (matches: boolean) => {
      if (matches) setSidebarCollapsed(true);
    };
    syncSidebar(mobile.matches);
    const onChange = (event: MediaQueryListEvent) => syncSidebar(event.matches);
    mobile.addEventListener("change", onChange);
    return () => mobile.removeEventListener("change", onChange);
  }, []);

  // Sprint 10C.R6/R7 — Ctrl+B and the palette action toggle the sidebar.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(input|textarea|select)$/i.test(target.tagName)) return;
      if (matchShortcut(event) === "toggle-sidebar") {
        event.preventDefault();
        setSidebarCollapsed((collapsed) => !collapsed);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    const offToggle = onUiEvent("toggle-sidebar", () =>
      setSidebarCollapsed((collapsed) => !collapsed)
    );
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      offToggle();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <AIWorkspaceProvider sidebarOffset={sidebarWidth}>
        <TopNav sidebarWidth={sidebarWidth} />
        <main
          className="relative z-0 mt-14 min-h-[calc(100vh-3.5rem)] pb-8 transition-[margin-left] duration-300"
          style={{ marginLeft: sidebarWidth }}
        >
          <Breadcrumbs />
          <ErrorBoundary title="Application section failed">
            <PageTransition>{children}</PageTransition>
          </ErrorBoundary>
        </main>
        {/* Sprint 10C.R7 — command palette, notifications, help, onboarding, FAB. */}
        <TerminalExperience />
        <StatusBar sidebarWidth={sidebarWidth} />
      </AIWorkspaceProvider>
    </div>
  );
}
