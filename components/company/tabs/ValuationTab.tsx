import { Card, CardHeader } from "@/components/ui/Card";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { ValuationMetricRow } from "@/components/company/ValuationMetricRow";
import type { DataTransparency, ValuationMetric } from "@/types";
import { Scale } from "lucide-react";

interface ValuationTabProps {
  valuation: ValuationMetric[];
  dataTransparency?: DataTransparency;
}

export function ValuationTab({ valuation, dataTransparency }: ValuationTabProps) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Valuation Analysis"
        subtitle="vs industry averages"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Scale className="h-4 w-4 text-accent" />
          </div>
        }
      />
      <div className="space-y-2">
        {valuation.map((metric) => (
          <ValuationMetricRow key={metric.label} metric={metric} />
        ))}
      </div>
      {dataTransparency && <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />}
    </Card>
  );
}
