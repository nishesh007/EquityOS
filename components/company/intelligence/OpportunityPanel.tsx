import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { Card, CardHeader } from "@/components/ui/Card";
import type { DataTransparency, Opportunity } from "@/types";
import { Sparkles } from "lucide-react";

interface OpportunityPanelProps {
  opportunities: Opportunity[];
  dataTransparency: DataTransparency;
}

export function OpportunityPanel({ opportunities, dataTransparency }: OpportunityPanelProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Opportunity Engine"
        subtitle={opportunities.length > 0 ? `${opportunities.length} positive signal(s) identified` : "No standout opportunities"}
        action={<Sparkles className="h-4 w-4 text-gain" />}
      />
      {opportunities.length === 0 ? (
        <p className="text-xs text-text-muted">No significant opportunity signals in current data.</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {opportunities.map((opp) => (
            <div
              key={opp.key}
              className="rounded-lg border border-gain/15 bg-gain-bg p-4"
            >
              <p className="text-xs font-semibold text-gain">{opp.label}</p>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">{opp.description}</p>
              <p className="mt-1 font-mono text-[10px] text-gain tabular-nums">{opp.metric}</p>
            </div>
          ))}
        </div>
      )}
      <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />
    </Card>
  );
}
