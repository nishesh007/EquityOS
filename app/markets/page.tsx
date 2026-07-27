import { InstitutionalMarketsView } from "@/components/markets/InstitutionalMarketsView";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  assertUniformMarketSnapshotTimestamp,
  loadMarketSnapshot,
} from "@/lib/market-orchestrator/marketsSnapshot";
import { LineChart } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MarketsPage() {
  const snapshot = await loadMarketSnapshot();
  const uniform = assertUniformMarketSnapshotTimestamp(snapshot);

  return (
    <div className="p-6">
      <PageHeader
        accent="indigo"
        icon={<LineChart className="h-5 w-5" />}
        title="Markets"
        subtitle="Institutional market snapshot — indices, pulse, breadth, sectors and flows"
      />

      {!uniform ? (
        <p className="mb-4 text-xs text-amber-400">
          Snapshot timestamp validation failed — widgets may show inconsistent
          as-of times.
        </p>
      ) : null}

      <InstitutionalMarketsView initial={snapshot} />
    </div>
  );
}
