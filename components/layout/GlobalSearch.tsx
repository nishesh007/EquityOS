"use client";

/**
 * Top-bar search trigger — opens the global Command Palette (Ctrl/Cmd+K).
 * Presentation only; search logic lives in the palette.
 */

import { Command, Search } from "lucide-react";
import { openCommandPalette } from "@/src/design/command/uiBus";

export function GlobalSearch() {
  return (
    <button
      type="button"
      onClick={() => openCommandPalette()}
      aria-label="Open command palette"
      className="group relative flex w-full items-center gap-2 rounded-lg border border-surface-border bg-surface-overlay py-2 pl-10 pr-16 text-left transition-all hover:border-accent/40 hover:bg-surface-hover focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <span className="truncate text-sm text-text-faint group-hover:text-text-muted">
        Search stocks, pages, commands…
      </span>
      <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded border border-surface-border bg-surface px-1.5 py-0.5">
        <Command className="h-3 w-3 text-text-faint" aria-hidden />
        <span className="text-[10px] text-text-faint">K</span>
      </span>
    </button>
  );
}
