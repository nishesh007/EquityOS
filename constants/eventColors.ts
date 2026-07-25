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
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    chip: "bg-sky-500/15 text-sky-400 border-sky-500/25",
    dot: "bg-sky-400",
    strip: "bg-sky-500/70",
  },
  corporate_actions: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/25",
    chip: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    dot: "bg-emerald-400",
    strip: "bg-emerald-500/70",
  },
  economic: {
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    chip: "bg-orange-500/15 text-orange-400 border-orange-500/25",
    dot: "bg-orange-400",
    strip: "bg-orange-500/70",
  },
  central_bank: {
    text: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/25",
    chip: "bg-purple-500/15 text-purple-400 border-purple-500/25",
    dot: "bg-purple-400",
    strip: "bg-purple-500/70",
  },
  ipo: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/25",
    chip: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
    dot: "bg-cyan-400",
    strip: "bg-cyan-500/70",
  },
  critical: {
    text: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/25",
    chip: "bg-red-500/15 text-red-400 border-red-500/25",
    dot: "bg-red-400",
    strip: "bg-red-500/70",
  },
  neutral: {
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/25",
    chip: "bg-slate-500/15 text-slate-400 border-slate-500/25",
    dot: "bg-slate-400",
    strip: "bg-slate-500/70",
  },
});

export const EVENT_IMPORTANCE_COLORS: Readonly<
  Record<EventImportance, EventColorTokens>
> = Object.freeze({
  critical: EVENT_CATEGORY_COLORS.critical,
  high: {
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/25",
    chip: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    dot: "bg-amber-400",
    strip: "bg-amber-500/70",
  },
  medium: {
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    chip: "bg-sky-500/15 text-sky-400 border-sky-500/25",
    dot: "bg-sky-400",
    strip: "bg-sky-500/70",
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
