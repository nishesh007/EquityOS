"use client";

/**
 * Sprint 10C.R7 — floating action menu (FAB).
 *
 * Bottom-right quick launcher for the most common flows. Sits above
 * the status bar; actions navigate or fire UI-bus events.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Eye,
  FileText,
  GitCompare,
  LayoutGrid,
  Plus,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { openCommandPalette } from "../command/uiBus";

interface FabAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  run: (router: ReturnType<typeof useRouter>) => void;
}

const ACTIONS: readonly FabAction[] = [
  { id: "workspace", label: "New Workspace", icon: <LayoutGrid className="h-4 w-4" />, run: (router) => router.push("/") },
  { id: "research", label: "Research", icon: <FileText className="h-4 w-4" />, run: (router) => router.push("/research") },
  { id: "watchlist", label: "Watchlist", icon: <Eye className="h-4 w-4" />, run: (router) => router.push("/watchlist") },
  { id: "export", label: "Export", icon: <Download className="h-4 w-4" />, run: () => openCommandPalette("export") },
  { id: "compare", label: "Compare", icon: <GitCompare className="h-4 w-4" />, run: () => openCommandPalette("compare") },
  { id: "settings", label: "Settings", icon: <Settings className="h-4 w-4" />, run: (router) => router.push("/settings") },
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
        <div role="menu" aria-label="Quick actions" className="flex flex-col items-end gap-1.5 animate-fade-in">
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
