import { Card } from "@/components/ui/Card";
import type { UpcomingResult } from "@/types";
import { CalendarDays, ChevronRight } from "lucide-react";
import Link from "next/link";

interface DashboardResultsSnapshotProps {
  results: UpcomingResult[];
}

function toDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

export function DashboardResultsSnapshot({
  results,
}: DashboardResultsSnapshotProps) {
  const now = new Date();
  const today = toDateKey(now);
  const tomorrow = toDateKey(addDays(now, 1));
  const weekEnd = toDateKey(addDays(now, 7));
  const cards = [
    {
      label: "Results Today",
      items: results.filter((result) => result.date === today),
    },
    {
      label: "Results Tomorrow",
      items: results.filter((result) => result.date === tomorrow),
    },
    {
      label: "Results Next 7 Days",
      items: results.filter(
        (result) => result.date >= today && result.date <= weekEnd
      ),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Link key={card.label} href="/results" className="group">
          <Card hover padding="md" className="h-full">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="data-label">{card.label}</p>
                <p className="mt-2 font-mono text-3xl font-semibold text-text-primary tabular-nums">
                  {card.items.length}
                </p>
              </div>
              <CalendarDays className="h-4 w-4 text-accent" />
            </div>
            <p className="mt-3 truncate text-xs text-text-muted">
              {card.items.length > 0
                ? card.items
                    .slice(0, 3)
                    .map((item) => item.symbol)
                    .join(" · ")
                : "No scheduled results"}
            </p>
            <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-accent">
              Open Earnings
              <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Card>
        </Link>
      ))}
    </div>
  );
}
