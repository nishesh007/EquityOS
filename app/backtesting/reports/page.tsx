import { FileBarChart } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { InstitutionalReportCenter } from "@/components/backtesting/reports";
import { fetchReportCenterDashboard } from "@/services/backtesting";

export const dynamic = "force-dynamic";

export default function InstitutionalReportsPage() {
  const dashboard = fetchReportCenterDashboard();

  return (
    <>
      <PageHeader
        accent="violet"
        icon={<FileBarChart className="h-5 w-5" />}
        title="Institutional Report Center"
        subtitle="Professional backtest reports · reusable templates · visual analytics · shared export contracts"
      />
      <InstitutionalReportCenter dashboard={dashboard} />
    </>
  );
}
