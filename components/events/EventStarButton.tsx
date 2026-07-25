"use client";

import { myEventsStore } from "@/src/core/events/integration/myEventsStore";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface EventStarButtonProps {
  eventId: string;
  className?: string;
  onChange?: (saved: boolean) => void;
}

export function EventStarButton({
  eventId,
  className,
  onChange,
}: EventStarButtonProps) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(myEventsStore.isSaved(eventId));
  }, [eventId]);

  const toggle = useCallback(() => {
    const result = myEventsStore.toggle(eventId);
    setSaved(result.saved);
    onChange?.(result.saved);
  }, [eventId, onChange]);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      aria-label={saved ? "Remove from My Events" : "Save to My Events"}
      title={saved ? "Saved to My Events" : "Save to My Events"}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md border border-surface-border-subtle transition-colors",
        saved
          ? "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30"
          : "bg-surface/40 text-text-secondary hover:bg-surface-hover hover:text-text-primary",
        className
      )}
    >
      <Star className={cn("h-3.5 w-3.5", saved && "fill-current")} />
    </button>
  );
}
