import { Card, CardHeader } from "@/components/ui/Card";
import { EarningsCard } from "@/components/dashboard/earnings/EarningsCard";
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
      {section.empty ? (
        <p className="text-xs text-text-muted">{section.emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {section.items.map((card) => (
            <EarningsCard key={card.id} card={card} compact={compact} />
          ))}
        </div>
      )}
    </Card>
  );
}
