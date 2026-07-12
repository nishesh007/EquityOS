import { Card, CardHeader } from "@/components/ui/Card";
import type { CompanyEventType, CompanyTimelineEvent } from "@/types";
import {
  Award,
  Building2,
  CalendarDays,
  FileBarChart,
  GitBranch,
  Landmark,
  Scissors,
} from "lucide-react";

interface CompanyIntelligenceTimelineProps {
  events: CompanyTimelineEvent[];
}

const eventIcons = {
  Results: FileBarChart,
  Dividend: Landmark,
  Bonus: Award,
  Split: Scissors,
  Acquisition: Building2,
  "Management Change": GitBranch,
  "Corporate Action": CalendarDays,
} satisfies Record<CompanyEventType, typeof CalendarDays>;

export function CompanyIntelligenceTimeline({
  events,
}: CompanyIntelligenceTimelineProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Company Timeline"
        subtitle="Results, capital allocation and corporate actions"
        action={<CalendarDays className="h-4 w-4 text-accent" />}
      />
      <div className="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
        {events.map((event, index) => {
          const Icon = eventIcons[event.type];
          return (
            <div key={event.id} className="relative flex gap-4 pb-5">
              {index < events.length - 1 && (
                <div className="absolute bottom-0 left-4 top-8 w-px bg-surface-border-subtle lg:hidden" />
              )}
              <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold text-text-primary">{event.title}</p>
                  <span className="rounded-md border border-surface-border bg-surface-overlay px-1.5 py-0.5 text-[10px] text-text-muted">
                    {event.type}
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-mono text-text-faint">{event.date}</p>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">
                  {event.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
