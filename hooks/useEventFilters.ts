"use client";

import { useCallback, useMemo, useState } from "react";
import {
  countActiveFilters,
  createEmptyEventFilters,
  eventsForView,
  extractFilterOptions,
  filterEvents,
  toDateKey,
} from "@/src/core/events";
import type {
  EventFilterState,
  EventIntelligenceEvent,
  EventViewMode,
} from "@/types/event";

export function useEventFilters(
  events: readonly EventIntelligenceEvent[],
  searchQuery: string,
  initialView: EventViewMode = "timeline"
) {
  const today = toDateKey(new Date());
  const [filters, setFilters] = useState<EventFilterState>(
    createEmptyEventFilters
  );
  const [view, setView] = useState<EventViewMode>(initialView);
  const [selectedDate, setSelectedDate] = useState(today);
  const [filtersOpen, setFiltersOpen] = useState(true);

  const filtered = useMemo(
    () => filterEvents(events, filters, searchQuery, today),
    [events, filters, searchQuery, today]
  );

  const visible = useMemo(
    () => eventsForView(filtered, view, selectedDate),
    [filtered, view, selectedDate]
  );

  const filterOptions = useMemo(
    () => extractFilterOptions(events),
    [events]
  );

  const activeFilterCount = useMemo(
    () => countActiveFilters(filters),
    [filters]
  );

  const updateFilters = useCallback(
    (patch: Partial<EventFilterState>) => {
      setFilters((prev) => ({ ...prev, ...patch }));
    },
    []
  );

  const resetFilters = useCallback(() => {
    setFilters(createEmptyEventFilters());
  }, []);

  const goToday = useCallback(() => {
    setSelectedDate(toDateKey(new Date()));
  }, []);

  return {
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
  };
}
