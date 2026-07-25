import {
  ResearchCardSection,
  ResearchMetricCard,
} from "@/components/company/research-cards";
import type { CompanyNews } from "@/types";
import { Newspaper } from "lucide-react";

interface CompanyNewsPanelProps {
  news: CompanyNews[];
  initialCount?: number;
}

const DEFAULT_VISIBLE = 4;

export function CompanyNewsPanel({
  news,
  initialCount = DEFAULT_VISIBLE,
}: CompanyNewsPanelProps) {
  const preview = news.slice(0, initialCount);

  return (
    <ResearchCardSection
      title="Latest Headlines"
      subtitle={
        news.length > 0
          ? `${news.length} stories · showing latest ${preview.length}`
          : "No recent headlines"
      }
    >
      {preview.map((item) => (
        <ResearchMetricCard
          key={item.id}
          title={item.source}
          value={
            item.title.length > 42
              ? `${item.title.slice(0, 42).trimEnd()}…`
              : item.title
          }
          verdict={item.timestamp}
          tone="macro"
          icon={Newspaper}
          className="min-h-[120px]"
        />
      ))}
    </ResearchCardSection>
  );
}
