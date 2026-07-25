import { EventIntelligence } from "@/components/events/EventIntelligence";
import { fetchEventIntelligenceCatalog } from "@/services/eventIntelligence";
import { toDateKey } from "@/src/core/events";
import { Suspense } from "react";

export default async function EventsPage() {
  let events: Awaited<
    ReturnType<typeof fetchEventIntelligenceCatalog>
  >["events"] = [];
  let asOf = toDateKey(new Date());
  let initialError: string | null = null;

  try {
    const catalog = await fetchEventIntelligenceCatalog();
    events = catalog.events;
    asOf = catalog.asOf;
  } catch {
    initialError =
      "Unable to load the event catalog. Repository data is temporarily unavailable.";
  }

  return (
    <div className="p-4 sm:p-5 lg:p-6">
      <section className="animate-fade-in-up">
        <Suspense
          fallback={
            <div
              className="h-40 animate-pulse rounded-lg bg-surface/40"
              role="status"
              aria-label="Loading Event Intelligence"
            />
          }
        >
          <EventIntelligence
            events={events}
            asOf={asOf}
            initialError={initialError}
          />
        </Suspense>
      </section>
    </div>
  );
}
