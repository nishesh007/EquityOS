import { Suspense } from "react";
import { FlaskConical } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaperTradingLab } from "@/components/paper-trading";
import { PaperLabModuleSkeleton } from "@/components/paper-trading/PaperLabModuleSkeleton";
import { PageContainer } from "@/src/design";
import { fetchPaperTradingDashboard } from "@/services/paperTrading";

export const dynamic = "force-dynamic";

export default function PaperTradingPage() {
  const dashboard = fetchPaperTradingDashboard();

  return (
    <PageContainer>
      <PageHeader
        accent="violet"
        icon={<FlaskConical className="h-5 w-5" />}
        title="Paper Trading Lab"
        subtitle="Automated AI Recommendation Validation Engine · virtual execution only · no manual buy/sell"
      />
      <Suspense fallback={<PaperLabModuleSkeleton variant="dashboard" />}>
        <PaperTradingLab initialDashboard={dashboard} />
      </Suspense>
    </PageContainer>
  );
}
