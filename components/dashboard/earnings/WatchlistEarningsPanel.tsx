import { Card, CardHeader } from "@/components/ui/Card";
import { EarningsCard } from "@/components/dashboard/earnings/EarningsCard";
import {
  toEarningsCardView,
  type WatchlistEarningsSurface,
} from "@/src/core/earnings/calendar";
import { Star } from "lucide-react";

interface WatchlistEarningsPanelProps {
  surface: WatchlistEarningsSurface;
}

function Section({
  title,
  events,
  emptyMessage,
}: {
  title: string;
  events: WatchlistEarningsSurface["upcoming"];
  emptyMessage: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      {events.length === 0 ? (
        <p className="text-xs text-text-muted">{emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <EarningsCard
              key={event.id}
              card={toEarningsCardView(event)}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WatchlistEarningsPanel({
  surface,
}: WatchlistEarningsPanelProps) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Watchlist Earnings"
        subtitle="Upcoming results on your watchlist"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gain/10">
            <Star className="h-4 w-4 text-gain" />
          </div>
        }
      />

      {surface.empty ? (
        <p className="text-xs text-text-muted">{surface.emptyMessage}</p>
      ) : (
        <div className="space-y-4">
          <Section
            title="Upcoming Earnings"
            events={surface.upcoming}
            emptyMessage={surface.emptyMessage}
          />
          <Section
            title="Results Tomorrow"
            events={surface.resultsTomorrow}
            emptyMessage="No Earnings Tomorrow"
          />
          <Section
            title="High Priority Earnings"
            events={surface.highPriority}
            emptyMessage="No High Impact Results"
          />
        </div>
      )}
    </Card>
  );
}
