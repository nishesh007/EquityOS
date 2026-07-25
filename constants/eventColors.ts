/**
 * Centralized event color system (Sprint 10D.1).
 * Institutional category → Tailwind token mapping. Never hardcode ad-hoc.
 */

import { getEventCategory } from "@/constants/eventTypes";
import type { EventCategory, EventImportance, EventType } from "@/types/event";

export interface EventColorTokens {
  text: string;
  bg: string;
  border: string;
  chip: string;
  dot: string;
  strip: string;
}

export const EVENT_CATEGORY_COLORS: Readonly<
  Record<EventCategory, EventColorTokens>
> = Object.freeze({
  results: {
    text: "text-sky-300",
    bg: "bg-sky-500/15",
    border: "border-sky-400/40",
    chip: "bg-sky-500/20 text-sky-300 border-sky-400/40",
    dot: "bg-sky-300",
    strip: "bg-sky-400/80",
  },
  corporate_actions: {
    text: "text-emerald-300",
    bg: "bg-emerald-500/15",
    border: "border-emerald-400/40",
    chip: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
    dot: "bg-emerald-300",
    strip: "bg-emerald-400/80",
  },
  economic: {
    text: "text-orange-300",
    bg: "bg-orange-500/15",
    border: "border-orange-400/40",
    chip: "bg-orange-500/20 text-orange-300 border-orange-400/40",
    dot: "bg-orange-300",
    strip: "bg-orange-400/80",
  },
  central_bank: {
    text: "text-violet-300",
    bg: "bg-violet-500/15",
    border: "border-violet-400/40",
    chip: "bg-violet-500/20 text-violet-300 border-violet-400/40",
    dot: "bg-violet-300",
    strip: "bg-violet-400/80",
  },
  ipo: {
    text: "text-cyan-300",
    bg: "bg-cyan-500/15",
    border: "border-cyan-400/40",
    chip: "bg-cyan-500/20 text-cyan-300 border-cyan-400/40",
    dot: "bg-cyan-300",
    strip: "bg-cyan-400/80",
  },
  critical: {
    text: "text-red-300",
    bg: "bg-red-500/15",
    border: "border-red-400/45",
    chip: "bg-red-500/20 text-red-300 border-red-400/45",
    dot: "bg-red-300",
    strip: "bg-red-400/80",
  },
  neutral: {
    text: "text-zinc-300",
    bg: "bg-zinc-500/15",
    border: "border-zinc-400/40",
    chip: "bg-zinc-500/20 text-zinc-300 border-zinc-400/40",
    dot: "bg-zinc-300",
    strip: "bg-zinc-400/80",
  },
});

export const EVENT_IMPORTANCE_COLORS: Readonly<
  Record<EventImportance, EventColorTokens>
> = Object.freeze({
  critical: EVENT_CATEGORY_COLORS.critical,
  high: {
    text: "text-amber-300",
    bg: "bg-amber-500/15",
    border: "border-amber-400/45",
    chip: "bg-amber-500/20 text-amber-300 border-amber-400/45",
    dot: "bg-amber-300",
    strip: "bg-amber-400/80",
  },
  medium: {
    text: "text-sky-300",
    bg: "bg-sky-500/15",
    border: "border-sky-400/40",
    chip: "bg-sky-500/20 text-sky-300 border-sky-400/40",
    dot: "bg-sky-300",
    strip: "bg-sky-400/80",
  },
  low: EVENT_CATEGORY_COLORS.neutral,
});

export function getCategoryColors(category: EventCategory): EventColorTokens {
  return EVENT_CATEGORY_COLORS[category];
}

export function getEventTypeColors(type: EventType): EventColorTokens {
  return getCategoryColors(getEventCategory(type));
}

export function getImportanceColors(
  importance: EventImportance
): EventColorTokens {
  return EVENT_IMPORTANCE_COLORS[importance];
}
