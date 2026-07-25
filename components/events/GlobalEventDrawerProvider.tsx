"use client";

import { EventDetailDrawer } from "@/components/events/EventDetailDrawer";
import {
  buildEventSeedCatalog,
  toDateKey,
} from "@/src/core/events";
import { findEventById } from "@/src/core/events/integration/eventLinkingService";
import type { EventIntelligenceEvent } from "@/types/event";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface GlobalEventDrawerContextValue {
  openEventById: (eventId: string) => void;
  openEvent: (event: EventIntelligenceEvent) => void;
  closeEventDrawer: () => void;
  catalog: EventIntelligenceEvent[];
  today: string;
}

const GlobalEventDrawerContext =
  createContext<GlobalEventDrawerContextValue | null>(null);

export function GlobalEventDrawerProvider({ children }: { children: ReactNode }) {
  const today = useMemo(() => toDateKey(new Date()), []);
  const catalog = useMemo(() => buildEventSeedCatalog(today), [today]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overrideEvent, setOverrideEvent] =
    useState<EventIntelligenceEvent | null>(null);

  const openEventById = useCallback((eventId: string) => {
    setOverrideEvent(null);
    setSelectedId(eventId);
  }, []);

  const openEvent = useCallback((event: EventIntelligenceEvent) => {
    setOverrideEvent(event);
    setSelectedId(event.id);
  }, []);

  const closeEventDrawer = useCallback(() => {
    setSelectedId(null);
    setOverrideEvent(null);
  }, []);

  const selectedEvent =
    overrideEvent ??
    (selectedId ? findEventById(catalog, selectedId) : null);

  const value = useMemo(
    () => ({
      openEventById,
      openEvent,
      closeEventDrawer,
      catalog,
      today,
    }),
    [openEventById, openEvent, closeEventDrawer, catalog, today]
  );

  return (
    <GlobalEventDrawerContext.Provider value={value}>
      {children}
      <EventDetailDrawer
        event={selectedEvent}
        today={today}
        open={selectedEvent != null}
        onClose={closeEventDrawer}
        relatedEvents={catalog}
      />
    </GlobalEventDrawerContext.Provider>
  );
}

export function useGlobalEventDrawer(): GlobalEventDrawerContextValue {
  const ctx = useContext(GlobalEventDrawerContext);
  if (!ctx) {
    throw new Error(
      "useGlobalEventDrawer must be used within GlobalEventDrawerProvider"
    );
  }
  return ctx;
}

/** Safe hook when provider may be absent (optional surfaces). */
export function useOptionalGlobalEventDrawer(): GlobalEventDrawerContextValue | null {
  return useContext(GlobalEventDrawerContext);
}
