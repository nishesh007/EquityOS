"use client";

import {
  EventQuickActions,
  EventStatsStrip,
  MacroDashboardStrip,
} from "@/components/events/EventStatsStrip";
import { SECTION_ACCENTS } from "@/lib/ui/section-accents";
import { cn } from "@/lib/utils";
import type { EventIntelligenceEvent } from "@/types/event";
import { CalendarRange } from "lucide-react";
import { memo } from "react";

interface EventHeroProps {
  events: readonly EventIntelligenceEvent[];
  today: string;
  onApplyEarnings: () => void;
  onApplyCorporate: () => void;
  onApplyEconomic: () => void;
}

export const EventHero = memo(function EventHero({
  events,
  today,
  onApplyEarnings,
  onApplyCorporate,
  onApplyEconomic,
}: EventHeroProps) {
  const accent = SECTION_ACCENTS.indigo;

  return (
    <header
      className="mb-4 space-y-3"
      data-testid="event-hero"
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            accent.chipBg,
            accent.text
          )}
        >
          <CalendarRange className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-text-primary sm:text-2xl">
            Economic Calendar & Event Intelligence
          </h1>
          <p className="mt-1 max-w-3xl text-[14px] leading-relaxed text-text-muted sm:text-[15px]">
            Track earnings, corporate actions, macro events and market-moving
            catalysts that can impact your portfolio.
          </p>
        </div>
      </div>

      <div
        aria-hidden
        className={cn("h-px w-full bg-gradient-to-r", accent.divider)}
      />

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-faint">
          Quick Statistics
        </p>
        <EventStatsStrip events={events} today={today} />
      </div>

      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-faint">
          Macro Economic Intelligence
        </p>
        <MacroDashboardStrip events={events} today={today} />
      </div>

      <EventQuickActions
        onApplyEarnings={onApplyEarnings}
        onApplyCorporate={onApplyCorporate}
        onApplyEconomic={onApplyEconomic}
      />
    </header>
  );
});
