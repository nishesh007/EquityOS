import { EventIntelligence } from "@/components/events/EventIntelligence";
import { fetchEventIntelligenceCatalog } from "@/services/eventIntelligence";

export default async function EventsPage() {
  const catalog = await fetchEventIntelligenceCatalog();

  return (
    <div className="p-4 sm:p-5 lg:p-6">
      <section className="animate-fade-in-up">
        <EventIntelligence events={catalog.events} asOf={catalog.asOf} />
      </section>
    </div>
  );
}
