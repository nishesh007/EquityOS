"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/src/design";
import { CalendarClock } from "lucide-react";

/** Reserved layout slot when a widget has no live feed on this surface. */
export function ComingSoonWidget({
  title,
  subtitle = "Data unavailable",
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
            Unavailable
          </StatusBadge>
        }
      />
      <p className="text-[12px] leading-relaxed text-text-muted">
        This slot is reserved in the layout library. No placeholder sprint
        roadmap is shown — open the linked live surface when noted in the
        subtitle.
      </p>
    </Card>
  );
}
