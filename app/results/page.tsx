import {
  EarningsNotificationCenterPanel,
  InstitutionalEarningsDashboardPanel,
} from "@/components/dashboard/earnings";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  fetchEarningsDashboard,
  fetchUpcomingEarningsEvents,
} from "@/services/earningsCalendar";

export default async function ResultsPage() {
  const [dashboard, events] = await Promise.all([
    fetchEarningsDashboard({ pageSize: 8 }),
    fetchUpcomingEarningsEvents(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Institutional Earnings Dashboard"
        subtitle="Rank, filter and prioritize upcoming earnings with AI scorecards"
      />

      <section className="mb-6 animate-fade-in-up max-w-6xl">
        <EarningsNotificationCenterPanel events={events} />
      </section>

      <section className="animate-fade-in-up max-w-6xl">
        <InstitutionalEarningsDashboardPanel
          events={events}
          initialMetrics={dashboard.metrics}
          pageSize={8}
        />
      </section>
    </div>
  );
}
