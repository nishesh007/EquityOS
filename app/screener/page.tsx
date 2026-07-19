import { ScreenerWorkspace } from "@/components/screener/ScreenerWorkspace";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  fetchInstitutionalScreenerHealth,
  fetchScreenerInitialData,
} from "@/services/screenerData";

export const dynamic = "force-dynamic";

export default async function ScreenerPage() {
  const [{ universe, catalog }, institutional] = await Promise.all([
    fetchScreenerInitialData(),
    Promise.resolve(fetchInstitutionalScreenerHealth()),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        title="Stock Screener"
        subtitle={`Filter the market by fundamentals, technicals and momentum · ${institutional.screenCount} institutional AI screens`}
      />

      <ScreenerWorkspace
        universe={universe}
        filters={catalog.filters}
        filterCount={catalog.filterCount}
      />
    </div>
  );
}
