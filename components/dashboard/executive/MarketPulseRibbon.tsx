/**
 * EquityOS Market Pulse Ribbon — compact executive chips only.
 * Presentation only; chips navigate to detail pages.
 * No panel title / subtitle — pairs with AI Daily Briefing in one row.
 */

"use client";

import type { ChipTone, PulseChip } from "@/lib/dashboard/executive-intelligence";
import { cn } from "@/lib/utils";
import Link from "next/link";

const TONE_CLASSES: Record<ChipTone, string> = {
  green: "border-gain/35 bg-gain-bg text-gain hover:bg-gain/15",
  amber: "border-warning/35 bg-warning/10 text-warning hover:bg-warning/15",
  red: "border-loss/35 bg-loss-bg text-loss hover:bg-loss/15",
  blue: "border-info/35 bg-info/10 text-info hover:bg-info/15",
  neutral:
    "border-surface-border bg-surface-hover/60 text-text-secondary hover:bg-surface-hover",
};

interface MarketPulseRibbonProps {
  chips: PulseChip[];
}

export function MarketPulseRibbon({ chips }: MarketPulseRibbonProps) {
  return (
    <nav
      aria-label="Market Pulse Ribbon"
      className="flex h-full flex-wrap content-start items-start gap-1.5 rounded-lg border border-surface-border-subtle bg-card/40 px-3 py-2"
    >
      {chips.map((chip) => (
        <Link
          key={chip.id}
          href={chip.href}
          className={cn(
            "inline-flex max-w-full items-baseline gap-1.5 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors",
            TONE_CLASSES[chip.tone]
          )}
          title={`${chip.label}: ${chip.value}`}
        >
          <span className="text-[9px] opacity-80">{chip.label}</span>
          <span className="truncate font-mono text-[11px] normal-case tracking-normal">
            {chip.value}
          </span>
        </Link>
      ))}
    </nav>
  );
}
