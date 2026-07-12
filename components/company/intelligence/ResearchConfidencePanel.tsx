import { IntelligenceProgress } from "@/components/company/intelligence/IntelligenceProgress";
import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { DataTransparency, ResearchConfidence } from "@/types";
import { Gauge } from "lucide-react";

interface ResearchConfidencePanelProps {
  confidence: ResearchConfidence;
  dataTransparency: DataTransparency;
}

export function ResearchConfidencePanel({ confidence, dataTransparency }: ResearchConfidencePanelProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Research Confidence"
        subtitle="Composite confidence across research dimensions"
        action={<Gauge className="h-4 w-4 text-accent" />}
      />
      <div className="mb-4 rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="data-label">Overall Confidence</p>
            <p className="mt-1 font-mono text-2xl font-semibold text-text-primary tabular-nums">
              {confidence.overall}%
            </p>
          </div>
          <span className={cn("text-xs font-medium", confidence.overall >= 70 ? "text-gain" : confidence.overall >= 50 ? "text-accent" : "text-loss")}>
            {confidence.overall >= 70 ? "High" : confidence.overall >= 50 ? "Moderate" : "Low"}
          </span>
        </div>
        <IntelligenceProgress
          className="mt-3"
          value={confidence.overall}
          tone={confidence.overall >= 70 ? "gain" : confidence.overall >= 50 ? "accent" : "loss"}
          showValue={false}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {confidence.factors.map((factor) => (
          <div
            key={factor.key}
            className="rounded-lg border border-surface-border-subtle bg-surface/50 p-3"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-text-primary">{factor.label}</p>
              <span className={cn("font-mono text-xs font-semibold tabular-nums", factor.score >= 70 ? "text-gain" : factor.score >= 50 ? "text-accent" : "text-loss")}>
                {factor.score}
              </span>
            </div>
            <IntelligenceProgress className="mt-2" value={factor.score} tone={factor.score >= 70 ? "gain" : factor.score >= 50 ? "accent" : "loss"} showValue={false} />
            <p className="mt-2 text-[10px] leading-relaxed text-text-faint">{factor.explanation}</p>
          </div>
        ))}
      </div>
      <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />
    </Card>
  );
}
