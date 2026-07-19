"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/src/design";
import { CalendarClock } from "lucide-react";

/** Presentation placeholder for widgets scheduled in a later sprint. */
export function ComingSoonWidget({
  title,
  subtitle = "Coming in Sprint 10D",
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <Card padding="lg" accent="orange">
      <CardHeader
        title={title}
        subtitle={subtitle}
        icon={<CalendarClock className="h-4 w-4 text-orange-400" />}
        badge={
          <StatusBadge tone="warning" size="sm">
            Coming soon
          </StatusBadge>
        }
      />
      <p className="text-[12px] leading-relaxed text-text-muted">
        This widget is reserved in the library so you can pin layout space now.
        Live data arrives in a later sprint — no mock figures are shown.
      </p>
    </Card>
  );
}
