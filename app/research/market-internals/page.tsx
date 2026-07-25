/**
 * Research → Market Internals
 *
 * Dedicated deep-analysis surface for Breadth, Participation, Strength and
 * Market Mood. These widgets were removed from the executive Dashboard layout
 * (Sprint 10C IA) — calculations, APIs and components are unchanged.
 */

import { MarketBreadth } from "@/components/dashboard/MarketBreadth";
import { MarketIntelligenceStrip } from "@/components/market";
import { PageHeader } from "@/components/layout/PageHeader";
import { getMarketIntelligenceSnapshot } from "@/services/marketIntelligence";
import { fetchMarketBreadth } from "@/services/researchDashboardData";
import { Activity } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MarketInternalsPage() {
  const [breadth, marketIntelligence] = await Promise.all([
    fetchMarketBreadth(),
    getMarketIntelligenceSnapshot(),
  ]);

  return (
    <div className="p-6">
      <PageHeader
        accent="violet"
        icon={<Activity className="h-5 w-5" />}
        title="Market Internals"
        subtitle="Detailed breadth, participation, strength and mood for research analysis"
      />

      <p className="mb-4 text-sm text-text-muted">
        <Link
          href="/research"
          className="font-medium text-accent hover:underline"
        >
          Research Workspace
        </Link>
        <span className="mx-1.5 text-text-muted/60">→</span>
        Market Internals
      </p>

      <section className="mb-6 animate-fade-in-up [animation-delay:40ms]">
        <MarketIntelligenceStrip snapshot={marketIntelligence} />
      </section>

      <section className="animate-fade-in-up [animation-delay:80ms]">
        <MarketBreadth breadth={breadth} />
      </section>
    </div>
  );
}
