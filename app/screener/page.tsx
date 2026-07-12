import { ScreenerWorkspace } from "@/components/screener/ScreenerWorkspace";
import { PageHeader } from "@/components/layout/PageHeader";
import { fetchScreenerInitialData } from "@/services/screenerData";

export default async function ScreenerPage() {
  const { universe, catalog } = await fetchScreenerInitialData();

  return (
    <div className="p-6">
      <PageHeader
        title="Stock Screener"
        subtitle="Filter the market by fundamentals, technicals and momentum"
      />

      <ScreenerWorkspace
        universe={universe}
        filters={catalog.filters}
        filterCount={catalog.filterCount}
      />
    </div>
  );
}
