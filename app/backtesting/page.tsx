import { History } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { HistoricalReplayCenter } from "@/components/backtesting";
import { fetchReplayCenterDashboard } from "@/services/backtesting";

export const dynamic = "force-dynamic";

export default function BacktestingReplayPage() {
  const dashboard = fetchReplayCenterDashboard();

  return (
    <>
      <PageHeader
        accent="cyan"
        icon={<History className="h-5 w-5" />}
        title="Historical Replay Center"
        subtitle="Candle-by-candle recreation of past market conditions · no look-ahead · deterministic sessions"
      />
      <HistoricalReplayCenter dashboard={dashboard} />
    </>
  );
}
