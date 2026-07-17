"use client";

import { AIWorkspaceProvider } from "@/components/ai/AskAIButton";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";
import { matchShortcut } from "@/src/design/workspace/workspaceShortcuts";
import { useEffect, useState } from "react";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarWidth = sidebarCollapsed ? "68px" : "240px";

  // Sprint 10C.R6 — Ctrl+B toggles the sidebar (workspace shortcut).
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
    return () => window.removeEventListener("keydown", onKeyDown);
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
          className="relative z-0 mt-14 min-h-[calc(100vh-3.5rem)] transition-[margin-left] duration-300"
          style={{ marginLeft: sidebarWidth }}
        >
          <ErrorBoundary title="Application section failed">
            {children}
          </ErrorBoundary>
        </main>
      </AIWorkspaceProvider>
    </div>
  );
}
