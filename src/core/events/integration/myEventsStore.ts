/**
 * My Events (saved / starred events) — localStorage only (Sprint 10D.5).
 */

import type { SavedEventRecord } from "@/types/eventIntegration";

const STORAGE_KEY = "equityos.events.saved.v1";

function readRaw(): SavedEventRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedEventRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(records: SavedEventRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // ignore quota / private mode
  }
}

export function listSavedEvents(): SavedEventRecord[] {
  return readRaw().sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export function isEventSaved(eventId: string): boolean {
  return readRaw().some((r) => r.eventId === eventId);
}

export function starEvent(eventId: string): SavedEventRecord[] {
  const existing = readRaw().filter((r) => r.eventId !== eventId);
  const next = [
    { eventId, savedAt: new Date().toISOString() },
    ...existing,
  ];
  writeRaw(next);
  return next;
}

export function unstarEvent(eventId: string): SavedEventRecord[] {
  const next = readRaw().filter((r) => r.eventId !== eventId);
  writeRaw(next);
  return next;
}

export function toggleStarEvent(eventId: string): {
  saved: boolean;
  records: SavedEventRecord[];
} {
  if (isEventSaved(eventId)) {
    return { saved: false, records: unstarEvent(eventId) };
  }
  return { saved: true, records: starEvent(eventId) };
}

export const myEventsStore = {
  list: listSavedEvents,
  isSaved: isEventSaved,
  star: starEvent,
  unstar: unstarEvent,
  toggle: toggleStarEvent,
};
