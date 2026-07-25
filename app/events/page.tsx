import { EventIntelligence } from "@/components/events/EventIntelligence";
import { fetchEventIntelligenceCatalog } from "@/services/eventIntelligence";
import { Suspense } from "react";

export default async function EventsPage() {
  const catalog = await fetchEventIntelligenceCatalog();

  return (
    <div className="p-4 sm:p-5 lg:p-6">
      <section className="animate-fade-in-up">
        <Suspense fallback={<div className="h-40 animate-pulse rounded-lg bg-surface/40" />}>
          <EventIntelligence events={catalog.events} asOf={catalog.asOf} />
        </Suspense>
      </section>
    </div>
  );
}
