import { InstitutionalEarningsCalendarPanel } from "@/components/dashboard/earnings";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  fetchEarningsCalendarResultsPage,
  fetchUpcomingEarningsEvents,
} from "@/services/earningsCalendar";

export default async function ResultsPage() {
  const [resultsView, events] = await Promise.all([
    fetchEarningsCalendarResultsPage({ pageSize: 8 }),
    fetchUpcomingEarningsEvents(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Results Calendar"
        subtitle="Institutional earnings calendar — upcoming announcements and quarterly results"
      />

      <section className="animate-fade-in-up max-w-5xl">
        <InstitutionalEarningsCalendarPanel
          events={events}
          metrics={resultsView.metrics}
          pageSize={8}
        />
      </section>
    </div>
  );
}
