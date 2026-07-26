import { ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StrategyValidationWorkspace } from "@/components/backtesting/validation";
import { fetchStrategyValidationDashboard } from "@/services/backtesting";

export const dynamic = "force-dynamic";

export default function StrategyValidationPage() {
  const dashboard = fetchStrategyValidationDashboard();

  return (
    <>
      <PageHeader
        accent="indigo"
        icon={<ShieldCheck className="h-5 w-5" />}
        title="Strategy Validation"
        subtitle="Institutional comparison · recommendation quality · conviction calibration · failure & benchmark analysis"
      />
      <StrategyValidationWorkspace dashboard={dashboard} />
    </>
  );
}
