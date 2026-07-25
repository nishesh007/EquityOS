import {
  ResearchCardSection,
  ResearchMetricCard,
  scoreToTone,
} from "@/components/company/research-cards";
import {
  formatPercentValue,
  formatScore,
} from "@/lib/format/research-numbers";
import type { DataTransparency, ResearchConfidence } from "@/types";
import { Gauge } from "lucide-react";

interface ResearchConfidencePanelProps {
  confidence: ResearchConfidence;
  dataTransparency: DataTransparency;
}

export function ResearchConfidencePanel({
  confidence,
}: ResearchConfidencePanelProps) {
  const overall = scoreToTone(confidence.overall);

  return (
    <ResearchCardSection
      title="Research Confidence"
      subtitle="Composite confidence across data factors"
    >
      <ResearchMetricCard
        title="Overall"
        value={formatPercentValue(confidence.overall)}
        verdict={
          confidence.overall >= 70
            ? "High"
            : confidence.overall >= 50
              ? "Moderate"
              : "Low"
        }
        tone={overall.tone}
        icon={Gauge}
      />
      {confidence.factors.map((factor) => {
        const tone = scoreToTone(factor.score);
        return (
          <ResearchMetricCard
            key={factor.key}
            title={factor.label}
            value={formatScore(factor.score)}
            verdict={tone.verdict}
            tone={tone.tone}
            icon={Gauge}
          />
        );
      })}
    </ResearchCardSection>
  );
}
