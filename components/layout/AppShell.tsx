"use client";

import { AIWorkspaceProvider } from "@/components/ai/AskAIButton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GlobalEventDrawerProvider } from "@/components/events/GlobalEventDrawerProvider";
import { RecommendationDetailDrawerProvider } from "@/components/recommendations/detail-drawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { onUiEvent } from "@/src/design/command/uiBus";
import { Breadcrumbs } from "@/src/design/navigation/BreadcrumbTrail";
import { PageTransition } from "@/src/design/navigation/PageTransition";
import { StatusBar } from "@/src/design/navigation/StatusBar";
import { matchShortcut } from "@/src/design/workspace/workspaceShortcuts";
import dynamic from "next/dynamic";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Command palette / help / notifications — client-only, idle-deferred.
 * Keeps root layout compile free of the TerminalExperience graph.
 */
const TerminalExperience = dynamic(
  () =>
    import("@/src/design/command/TerminalExperience").then(
      (mod) => mod.TerminalExperience
    ),
  { ssr: false }
);

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [terminalReady, setTerminalReady] = useState(false);
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

  // Defer TerminalExperience chunk until after first paint / idle.
  useEffect(() => {
    let cancelled = false;
    const enable = () => {
      if (!cancelled) setTerminalReady(true);
    };
    const idle =
      typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback(enable, { timeout: 1500 })
        : null;
    const timeout = window.setTimeout(enable, idle == null ? 0 : 1500);
    return () => {
      cancelled = true;
      if (idle != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idle);
      }
      window.clearTimeout(timeout);
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <AIWorkspaceProvider sidebarOffset={sidebarWidth}>
        <GlobalEventDrawerProvider>
          <RecommendationDetailDrawerProvider>
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
            {terminalReady ? <TerminalExperience /> : null}
            <StatusBar sidebarWidth={sidebarWidth} />
          </RecommendationDetailDrawerProvider>
        </GlobalEventDrawerProvider>
      </AIWorkspaceProvider>
    </div>
  );
}
