import { Card, CardHeader } from "@/components/ui/Card";
import { ShareholdingChart } from "@/components/company/ShareholdingChart";
import type { ShareholdingPattern } from "@/types";
import { PieChart } from "lucide-react";

interface ShareholdingTabProps {
  shareholding: ShareholdingPattern;
}

export function ShareholdingTab({ shareholding }: ShareholdingTabProps) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Shareholding Pattern"
        subtitle="Ownership breakdown"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <PieChart className="h-4 w-4 text-accent" />
          </div>
        }
      />
      <ShareholdingChart shareholding={shareholding} />
    </Card>
  );
}
