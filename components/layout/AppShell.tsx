"use client";

import { AIWorkspaceProvider } from "@/components/ai/AskAIButton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { GlobalEventDrawerProvider } from "@/components/events/GlobalEventDrawerProvider";
import { RecommendationDetailDrawerProvider } from "@/components/recommendations/detail-drawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { UpgradeBanner } from "@/components/saas";
import { onUiEvent } from "@/src/design/command/uiBus";
import { Breadcrumbs } from "@/src/design/navigation/BreadcrumbTrail";
import { PageTransition } from "@/src/design/navigation/PageTransition";
import { StatusBar } from "@/src/design/navigation/StatusBar";
import { matchShortcut } from "@/src/design/workspace/workspaceShortcuts";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

const TerminalExperience = dynamic(
  () =>
    import("@/src/design/command/TerminalExperience").then(
      (mod) => mod.TerminalExperience
    ),
  { ssr: false }
);

const AUTH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isAuthRoute = AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
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

  useEffect(() => {
    if (isAuthRoute) return;
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
  }, [isAuthRoute]);

  useEffect(() => {
    if (isAuthRoute) return;
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
  }, [isAuthRoute]);

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-surface">
        <ErrorBoundary title="Authentication failed">{children}</ErrorBoundary>
      </div>
    );
  }

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
              <div className="px-4 pt-3 md:px-6">
                <UpgradeBanner />
              </div>
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
