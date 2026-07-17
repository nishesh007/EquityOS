import { cn } from "@/lib/utils";
import { StatusBadge, type StatusTone } from "../components/StatusBadge";

export interface TimelineEvent {
  id: string;
  title: string;
  caption?: string;
  /** Pre-formatted timestamp string. */
  time?: string;
  /** Category shown as a badge (Recommendation, Research, Alert, ...). */
  category?: string;
  tone?: StatusTone;
  /** Marks the current position in the timeline. */
  current?: boolean;
}

interface TimelineChartProps {
  events: readonly TimelineEvent[];
  className?: string;
}

/**
 * Professional vertical timeline — recommendations, research, alerts,
 * portfolio actions and AI decisions, with the current position highlighted.
 */
export function TimelineChart({ events, className }: TimelineChartProps) {
  return (
    <ol className={cn("relative space-y-4 border-l border-surface-border pl-4", className)}>
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span
            aria-hidden="true"
            className={cn(
              "absolute -left-[21.5px] top-1 h-2.5 w-2.5 rounded-full border-2 border-surface",
              event.current ? "bg-accent ring-2 ring-accent/30" : "bg-text-faint",
            )}
          />
          <div
            className={cn(
              "rounded-lg p-2 -m-2",
              event.current && "bg-accent/5 ring-1 ring-accent/20",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p
                className={cn(
                  "text-xs font-medium",
                  event.current ? "text-text-primary" : "text-text-secondary",
                )}
              >
                {event.title}
              </p>
              {event.category && (
                <StatusBadge tone={event.tone ?? "neutral"}>{event.category}</StatusBadge>
              )}
              {event.time && (
                <span className="ml-auto font-mono text-[10px] tabular-nums text-text-faint">
                  {event.time}
                </span>
              )}
            </div>
            {event.caption && (
              <p className="mt-0.5 text-[11px] text-text-muted">{event.caption}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
