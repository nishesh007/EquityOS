"use client";

import type { PlatformInstitutionalBadge } from "@/lib/dashboard/institutional-exposure";
import { InstitutionalTrustBadges } from "@/components/dashboard/opportunity-intelligence/InstitutionalTrustBadges";

export function PortfolioInstitutionalBadges({
  badges,
  compact = false,
}: {
  badges: PlatformInstitutionalBadge[];
  compact?: boolean;
}) {
  return (
    <div data-testid="portfolio-institutional-badges">
      <InstitutionalTrustBadges badges={badges} compact={compact} />
    </div>
  );
}
