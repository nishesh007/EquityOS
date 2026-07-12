import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { UpcomingResult } from "@/types";
import { Calendar, ChevronRight } from "lucide-react";

interface UpcomingResultsCalendarProps {
  results: UpcomingResult[];
}

function formatDate(dateStr: string): { day: string; month: string } {
  const date = new Date(dateStr);
  return {
    day: date.getDate().toString().padStart(2, "0"),
    month: date.toLocaleString("en-IN", { month: "short" }).toUpperCase(),
  };
}

export function UpcomingResultsCalendar({
  results,
}: UpcomingResultsCalendarProps) {
  return (
    <Card padding="lg" className="h-full">
      <CardHeader
        title="Upcoming Results"
        subtitle="Earnings calendar"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Calendar className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <div className="space-y-2">
        {results.map((result) => {
          const { day, month } = formatDate(result.date);

          return (
            <div
              key={result.id}
              className="group flex items-center gap-3 rounded-lg border border-surface-border-subtle bg-surface/50 p-3 transition-all hover:border-surface-border hover:bg-surface-hover/50"
            >
              <div className="flex h-12 w-12 flex-shrink-0 flex-col items-center justify-center rounded-lg border border-surface-border bg-surface-overlay">
                <span className="text-sm font-bold text-text-primary leading-none">
                  {day}
                </span>
                <span className="text-[9px] font-medium text-text-muted">
                  {month}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {result.company}
                  </p>
                  <Badge variant="default" size="sm">
                    {result.symbol}
                  </Badge>
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-text-muted">
                  <span>{result.quarter}</span>
                  <span>·</span>
                  <span>{result.sector}</span>
                  <span>·</span>
                  <span>{result.marketCap}</span>
                </div>
              </div>

              <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          );
        })}
      </div>
    </Card>
  );
}
