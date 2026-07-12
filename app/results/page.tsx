import { UpcomingResultsCalendar } from "@/components/dashboard/UpcomingResultsCalendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchUpcomingResults } from "@/services/marketData";

export default async function ResultsPage() {
  const results = await fetchUpcomingResults();

  return (
    <div className="p-6">
      <PageHeader
        title="Results Calendar"
        subtitle="Upcoming earnings announcements and quarterly results"
      />

      <section className="animate-fade-in-up max-w-3xl">
        <UpcomingResultsCalendar results={results} />
      </section>
    </div>
  );
}
