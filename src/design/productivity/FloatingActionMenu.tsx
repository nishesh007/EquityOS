"use client";

/**
 * Sprint 10C.1 — floating quick action menu (FAB).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Download,
  Eye,
  FileText,
  LayoutDashboard,
  Plus,
  RefreshCw,
  ScanSearch,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { openCommandPalette, showNotificationCenter } from "../command/uiBus";
import { recordActivity } from "./activityFeed";

interface FabAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  run: (router: ReturnType<typeof useRouter>) => void;
}

const ACTIONS: readonly FabAction[] = [
  {
    id: "dashboard",
    label: "Open Dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
    run: (router) => router.push("/"),
  },
  {
    id: "portfolio",
    label: "Open Portfolio",
    icon: <Briefcase className="h-4 w-4" />,
    run: (router) => router.push("/portfolio"),
  },
  {
    id: "screener",
    label: "Open Screener",
    icon: <ScanSearch className="h-4 w-4" />,
    run: (router) => router.push("/screener"),
  },
  {
    id: "scan",
    label: "Scan Market",
    icon: <Sparkles className="h-4 w-4" />,
    run: (router) => router.push("/screener"),
  },
  {
    id: "research",
    label: "Run AI Research",
    icon: <FileText className="h-4 w-4" />,
    run: (router) => router.push("/ai/research"),
  },
  {
    id: "watchlist",
    label: "Create Watchlist",
    icon: <Eye className="h-4 w-4" />,
    run: (router) => router.push("/watchlist"),
  },
  {
    id: "refresh",
    label: "Refresh Market",
    icon: <RefreshCw className="h-4 w-4" />,
    run: (router) => {
      recordActivity("market", "Market data refreshed", "/markets");
      router.refresh();
    },
  },
  {
    id: "report",
    label: "Generate Report",
    icon: <Download className="h-4 w-4" />,
    run: () => openCommandPalette("export"),
  },
  {
    id: "hub",
    label: "Productivity Hub",
    icon: <Sparkles className="h-4 w-4" />,
    run: () => showNotificationCenter(),
  },
  {
    id: "settings",
    label: "Settings",
    icon: <Settings className="h-4 w-4" />,
    run: (router) => router.push("/settings"),
  },
];

export function FloatingActionMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="fixed bottom-12 right-5 z-40 flex flex-col items-end gap-2"
    >
      {open && (
        <div
          role="menu"
          aria-label="Quick actions"
          className="flex max-h-[60vh] flex-col items-end gap-1.5 overflow-y-auto animate-fade-in"
        >
          {ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              role="menuitem"
              onClick={() => {
                action.run(router);
                setOpen(false);
              }}
              className="flex items-center gap-2 rounded-full border border-surface-border bg-card py-1.5 pl-3 pr-2 text-xs font-medium text-text-secondary shadow-dropdown transition-colors hover:bg-surface-hover hover:text-text-primary"
            >
              {action.label}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/10 text-accent">
                {action.icon}
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-full bg-accent text-white shadow-floating transition-transform hover:scale-105",
          open && "rotate-45"
        )}
      >
        {open ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>
    </div>
  );
}
