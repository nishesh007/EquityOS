import { Card, CardHeader } from "@/components/ui/Card";
import { EarningsIntelligenceHost } from "@/components/dashboard/earnings/EarningsIntelligenceHost";
import type { CalendarSectionView } from "@/src/core/earnings/calendar";

interface EarningsSectionProps {
  section: CalendarSectionView;
  compact?: boolean;
  className?: string;
}

export function EarningsSection({
  section,
  compact = true,
  className,
}: EarningsSectionProps) {
  return (
    <Card padding="md" className={className}>
      <CardHeader title={section.title} subtitle="Institutional calendar" />
      <EarningsIntelligenceHost
        cards={section.items}
        compact={compact}
        emptyMessage={section.emptyMessage}
      />
    </Card>
  );
}
