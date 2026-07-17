"use client";

/**
 * Sprint 10C.R7 — bottom status bar.
 *
 * Terminal-style strip: market session, connection, last refresh,
 * active workspace, theme and app version. Display only — market state
 * comes from the pure session helper, everything else from existing
 * presentation engines.
 */

import { useEffect, useState } from "react";
import { Circle, Clock, Layers, Palette, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getTheme, getThemeEngine } from "../theme/ThemeEngine";
import { getActiveWorkspace } from "../workspace/workspaceEngine";
import { getMarketSession } from "./marketSession";

export const APP_VERSION = "10C.R7";

export function StatusBar({ sidebarWidth = "240px" }: { sidebarWidth?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [online, setOnline] = useState(true);
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [themeLabel, setThemeLabel] = useState("");

  useEffect(() => {
    const refresh = () => setNow(new Date());
    refresh();
    const timer = window.setInterval(refresh, 30_000);

    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    setWorkspaceName(getActiveWorkspace().name);
    setThemeLabel(getTheme().label);
    const unsubscribe = getThemeEngine().subscribe((theme) =>
      setThemeLabel(theme.label)
    );

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      unsubscribe();
    };
  }, []);

  const session = now ? getMarketSession(now) : null;

  return (
    <footer
      role="status"
      aria-label="Application status bar"
      className="fixed bottom-0 right-0 z-20 flex h-7 items-center justify-between gap-4 border-t border-surface-border-subtle bg-surface/90 px-4 text-[11px] text-text-muted backdrop-blur-xl transition-[left] duration-300"
      style={{ left: sidebarWidth }}
    >
      <div className="flex min-w-0 items-center gap-4">
        <span className="flex items-center gap-1.5">
          <Circle
            className={cn(
              "h-2 w-2",
              session?.open
                ? "fill-gain text-gain"
                : "fill-text-faint text-text-faint"
            )}
          />
          {session ? session.label : "Market status"}
        </span>
        <span className="hidden items-center gap-1.5 sm:flex">
          {online ? (
            <Wifi className="h-3 w-3 text-gain" />
          ) : (
            <WifiOff className="h-3 w-3 text-loss" />
          )}
          {online ? "Connected" : "Offline"}
        </span>
        <span className="hidden items-center gap-1.5 md:flex">
          <Clock className="h-3 w-3" />
          Refreshed{" "}
          {now
            ? now.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "—"}
        </span>
      </div>
      <div className="flex min-w-0 items-center gap-4">
        <span className="hidden items-center gap-1.5 truncate md:flex">
          <Layers className="h-3 w-3" />
          {workspaceName}
        </span>
        <span className="hidden items-center gap-1.5 lg:flex">
          <Palette className="h-3 w-3" />
          {themeLabel || "Theme"}
        </span>
        <span className="font-medium text-text-secondary">
          EquityOS {APP_VERSION}
        </span>
      </div>
    </footer>
  );
}
