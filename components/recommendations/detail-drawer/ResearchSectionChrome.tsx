"use client";

import { cn } from "@/lib/utils";
import { FOCUS_RING_CLASS } from "@/src/design/motion/motionPresets";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CandlestickChart,
  CircleDollarSign,
  FileSpreadsheet,
  Gauge,
  LineChart,
  Newspaper,
  Scale,
  Shield,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type {
  SummaryMetric,
  SummaryVerdictTone,
} from "@/lib/recommendations/research-intelligence-presenter";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import { SectionShell, VerdictBadge } from "./SectionChrome";

const TONE_BADGE: Record<SummaryVerdictTone, string> = {
  positive: "border-emerald-500/35 bg-emerald-500/12 text-emerald-400",
  neutral: "border-amber-500/35 bg-amber-500/12 text-amber-400",
  negative: "border-rose-500/35 bg-rose-500/12 text-rose-400",
  info: "border-sky-500/35 bg-sky-500/12 text-sky-300",
  ai: "border-violet-500/35 bg-violet-500/12 text-violet-300",
};

export function SummaryVerdictPill({
  label,
  tone = "info",
}: {
  label: string;
  tone?: SummaryVerdictTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-tight",
        TONE_BADGE[tone]
      )}
    >
      {label}
    </span>
  );
}

export function SummaryMetricGrid({ metrics }: { metrics: SummaryMetric[] }) {
  return (
    <dl className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-surface-border-subtle/80 bg-surface/40 px-2.5 py-2"
        >
          <dt className="text-[10px] text-text-muted">{metric.label}</dt>
          <dd
            className={cn(
              "mt-0.5 text-[11px] font-semibold leading-snug text-text-primary",
              metric.tone === "positive" && "text-emerald-400",
              metric.tone === "negative" && "text-rose-400",
              metric.tone === "info" && "text-sky-300"
            )}
          >
            {metric.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function OpenAnalysisLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-accent transition-colors hover:text-accent/80",
        FOCUS_RING_CLASS
      )}
    >
      {label}
      <ArrowUpRight className="h-3 w-3" aria-hidden />
    </Link>
  );
}

export function ResearchSectionFrame({
  index,
  title,
  description,
  verdict,
  verdictTone,
  explanation,
  openHref,
  openLabel,
  children,
  loading,
}: {
  index: number;
  title: string;
  description?: string;
  verdict?: string;
  verdictTone?: SummaryVerdictTone;
  explanation?: string;
  openHref?: string;
  openLabel?: string;
  children: React.ReactNode;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <SectionShell index={index} title={title} description={description}>
        <div role="status" aria-busy="true" aria-label={`Loading ${title}`}>
          <Skeleton className="mb-2 h-4 w-1/3" />
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
          <div className="mt-2">
            <SkeletonText lines={2} />
          </div>
        </div>
      </SectionShell>
    );
  }

  return (
    <SectionShell index={index} title={title} description={description}>
      {verdict ? (
        <div className="mb-2">
          <SummaryVerdictPill label={verdict} tone={verdictTone} />
        </div>
      ) : null}
      {children}
      {explanation ? (
        <p className="mt-2 text-[11.5px] leading-relaxed text-text-secondary">
          {explanation}
        </p>
      ) : null}
      {openHref && openLabel ? (
        <OpenAnalysisLink href={openHref} label={openLabel} />
      ) : null}
    </SectionShell>
  );
}

export const RESEARCH_ICONS: Record<string, LucideIcon> = {
  revenue: LineChart,
  profitability: CircleDollarSign,
  efficiency: Gauge,
  "balance-sheet": Scale,
  "cash-flow": Activity,
  "capital-allocation": Sparkles,
  overall: Shield,
  company: Building2,
  technical: CandlestickChart,
  financials: FileSpreadsheet,
  peers: Users,
  quarterly: CalendarDays,
  news: Newspaper,
  events: CalendarDays,
  risk: AlertTriangle,
};

export { VerdictBadge };
