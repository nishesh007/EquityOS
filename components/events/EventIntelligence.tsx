"use client";

import { DayView } from "@/components/events/views/DayView";
import { WeekView } from "@/components/events/views/WeekView";
import { MonthView } from "@/components/events/views/MonthView";
import { AgendaView } from "@/components/events/views/AgendaView";
import { EventDetailDrawer } from "@/components/events/EventDetailDrawer";
import { EventErrorState } from "@/components/events/EventErrorState";
import { EventFilters } from "@/components/events/EventFilters";
import { EventHero } from "@/components/events/EventHero";
import { EventSkeleton } from "@/components/events/EventSkeleton";
import { QUICK_ACTION_PRESETS } from "@/components/events/EventStatsStrip";
import { EventTimeline } from "@/components/events/EventTimeline";
import { EventToolbar } from "@/components/events/EventToolbar";
import { MyEventsPanel } from "@/components/events/MyEventsPanel";
import { useOptionalGlobalEventDrawer } from "@/components/events/GlobalEventDrawerProvider";
import { useEventFilters } from "@/hooks/useEventFilters";
import { useEventSearch } from "@/hooks/useEventSearch";
import { createEmptyEventFilters } from "@/src/core/events";
import type { EventIntelligenceEvent } from "@/types/event";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

interface EventIntelligenceProps {
  events: EventIntelligenceEvent[];
  asOf: string;
  /** SSR / repository failure message — shown with retry. */
  initialError?: string | null;
}

export function EventIntelligence({
  events,
  asOf,
  initialError = null,
}: EventIntelligenceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const globalDrawer = useOptionalGlobalEventDrawer();
  const { query, debouncedQuery, setQuery } = useEventSearch();
  const {
    today,
    filters,
    setFilters,
    updateFilters,
    resetFilters,
    view,
    setView,
    selectedDate,
    setSelectedDate,
    goToday,
    filtersOpen,
    setFiltersOpen,
    filtered,
    visible,
    filterOptions,
    activeFilterCount,
  } = useEventFilters(events, debouncedQuery, "timeline");

  const [error, setError] = useState<string | null>(initialError);
  const [isPending, startTransition] = useTransition();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    setError(initialError);
  }, [initialError]);

  const handleRefresh = useCallback(() => {
    startTransition(() => {
      setError(null);
      router.refresh();
    });
  }, [router]);

  const handleRetry = useCallback(() => {
    handleRefresh();
  }, [handleRefresh]);

  const handleViewDetails = useCallback(
    (event: EventIntelligenceEvent) => {
      if (globalDrawer) {
        globalDrawer.openEvent(event);
        return;
      }
      setSelectedEventId(event.id);
    },
    [globalDrawer]
  );

  const handleCloseDrawer = useCallback(() => {
    setSelectedEventId(null);
  }, []);

  useEffect(() => {
    const eventId = searchParams.get("event");
    if (!eventId) return;
    const match = events.find((event) => event.id === eventId);
    if (match) handleViewDetails(match);
  }, [searchParams, events, handleViewDetails]);

  const applyQuickPreset = useCallback(
    (eventTypes: typeof QUICK_ACTION_PRESETS.earnings) => {
      setFilters({
        ...createEmptyEventFilters(),
        eventTypes: [...eventTypes],
        quickRanges: ["upcoming"],
      });
      setFiltersOpen(true);
    },
    [setFilters, setFiltersOpen]
  );

  const handleApplyEarnings = useCallback(() => {
    setFilters({
      ...createEmptyEventFilters(),
      quickRanges: ["upcoming_earnings"],
    });
    setFiltersOpen(true);
  }, [setFilters, setFiltersOpen]);

  const handleApplyCorporate = useCallback(() => {
    applyQuickPreset(QUICK_ACTION_PRESETS.corporate);
  }, [applyQuickPreset]);

  const handleApplyEconomic = useCallback(() => {
    applyQuickPreset(QUICK_ACTION_PRESETS.economic);
  }, [applyQuickPreset]);

  const selectedEvent =
    selectedEventId != null
      ? (events.find((event) => event.id === selectedEventId) ?? null)
      : null;

  return (
    <div className="space-y-3" data-testid="event-intelligence">
      <EventHero
        events={events}
        today={today}
        onApplyEarnings={handleApplyEarnings}
        onApplyCorporate={handleApplyCorporate}
        onApplyEconomic={handleApplyEconomic}
      />

      <MyEventsPanel
        catalog={events}
        today={today}
        onOpenEvent={handleViewDetails}
      />

      <EventToolbar
        searchQuery={query}
        onSearchChange={setQuery}
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onToday={goToday}
        onRefresh={handleRefresh}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
        activeFilterCount={activeFilterCount}
        view={view}
        onViewChange={setView}
        isRefreshing={isPending}
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <EventFilters
          filters={filters}
          onChange={updateFilters}
          onReset={resetFilters}
          sectors={filterOptions.sectors}
          industries={filterOptions.industries}
          exchanges={filterOptions.exchanges}
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-5rem)]"
        />

        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-muted">
            <p>
              Showing{" "}
              <span className="font-semibold text-text-secondary">
                {visible.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-text-secondary">
                {filtered.length}
              </span>{" "}
              filtered · {events.length} catalog · as of {asOf}
            </p>
          </div>

          {error ? (
            <EventErrorState message={error} onRetry={handleRetry} />
          ) : isPending ? (
            <EventSkeleton
              variant={view === "month" ? "calendar" : "list"}
              count={view === "day" ? 4 : 6}
            />
          ) : events.length === 0 ? (
            <EventErrorState
              message="No events could be loaded. Retry refresh or check repository connectivity."
              onRetry={handleRetry}
            />
          ) : (
            <>
              {view === "day" ? (
                <DayView
                  date={selectedDate}
                  events={visible}
                  onViewDetails={handleViewDetails}
                  onResetFilters={resetFilters}
                />
              ) : null}
              {view === "week" ? (
                <WeekView
                  selectedDate={selectedDate}
                  today={today}
                  events={visible}
                  onSelectDate={setSelectedDate}
                  onViewDetails={handleViewDetails}
                  onResetFilters={resetFilters}
                />
              ) : null}
              {view === "month" ? (
                <MonthView
                  selectedDate={selectedDate}
                  today={today}
                  events={visible}
                  onSelectDate={setSelectedDate}
                  onViewDetails={handleViewDetails}
                  onResetFilters={resetFilters}
                />
              ) : null}
              {view === "timeline" ? (
                <EventTimeline
                  events={visible}
                  today={today}
                  onViewDetails={handleViewDetails}
                  onResetFilters={resetFilters}
                />
              ) : null}
              {view === "agenda" ? (
                <AgendaView
                  events={visible}
                  onViewDetails={handleViewDetails}
                  onResetFilters={resetFilters}
                />
              ) : null}
            </>
          )}
        </div>
      </div>

      {!globalDrawer ? (
        <EventDetailDrawer
          event={selectedEvent}
          today={today}
          open={selectedEvent != null}
          onClose={handleCloseDrawer}
          relatedEvents={events}
        />
      ) : null}
    </div>
  );
}
