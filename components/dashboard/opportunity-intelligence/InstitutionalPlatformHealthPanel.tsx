"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Gauge,
  Server,
} from "lucide-react";
import type { InstitutionalPlatformSnapshot } from "@/lib/opportunity-engine/institutional-presentation";
import {
  buildInstitutionalPlatformHealthDashboard,
  type EngineHealthRow,
  type PlatformMetricCell,
} from "@/lib/dashboard/institutional-platform-health-presentation";
import { InstitutionalTrustBadges } from "@/components/dashboard/opportunity-intelligence/InstitutionalTrustBadges";
import { InstitutionalPanelSkeleton } from "@/components/dashboard/opportunity-intelligence/InstitutionalPanelSkeleton";
import { InstitutionalMetricTooltip } from "@/components/dashboard/opportunity-intelligence/InstitutionalMetricTooltip";
import { RecommendationTimeline } from "@/components/dashboard/opportunity-intelligence/RecommendationTimeline";
import { MetricGrid } from "@/components/dashboard/opportunity-intelligence/MetricBlocks";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

function TrendIcon({ trend }: { trend: PlatformMetricCell["trend"] }) {
  if (trend === "UP") return <ArrowUpRight className="h-3 w-3 text-gain" />;
  if (trend === "DOWN") return <ArrowDownRight className="h-3 w-3 text-loss" />;
  return <ArrowRight className="h-3 w-3 text-text-faint" />;
}

function HealthMetric({ metric }: { metric: PlatformMetricCell }) {
  return (
    <div className="rounded-md border border-surface-border-subtle/70 bg-surface-hover/30 px-2.5 py-2">
      <div className="flex items-center gap-1">
        <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
          {metric.label}
        </p>
        <InstitutionalMetricTooltip
          meta={{
            description: metric.tooltip.description,
            calculation: `Healthy range: ${metric.tooltip.healthyRange}`,
            meaning: `Current ${metric.tooltip.currentValue} · Trend ${metric.tooltip.trend}`,
            healthyRange: metric.tooltip.healthyRange,
            lastUpdated: metric.tooltip.lastUpdated,
          }}
        />
      </div>
      <p
        className={`mt-0.5 font-mono text-sm font-semibold tabular-nums transition-colors duration-500 ${metric.toneClass}`}
      >
        {metric.value}
      </p>
      <div className="mt-1 flex items-center gap-1 text-[9px] text-text-faint">
        <TrendIcon trend={metric.trend} />
        {metric.trendLabel}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <p className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      {children}
    </section>
  );
}

function EngineTable({ rows }: { rows: EngineHealthRow[] }) {
  if (rows.length === 0) {
    return <p className="text-[11px] text-text-muted">Awaiting Next Run</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-[11px]">
        <thead>
          <tr className="text-[9px] uppercase tracking-wider text-text-faint">
            <th className="pb-1.5 font-medium">Engine</th>
            <th className="pb-1.5 font-medium">Health</th>
            <th className="pb-1.5 font-medium">Latency</th>
            <th className="pb-1.5 font-medium">Last Execution</th>
            <th className="pb-1.5 font-medium">Trend</th>
            <th className="pb-1.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-t border-surface-border-subtle/50 text-text-secondary"
            >
              <td className="py-1.5 font-medium text-text-primary">{row.label}</td>
              <td className={`py-1.5 font-mono tabular-nums ${
                row.tone === "excellent" || row.tone === "healthy"
                  ? "text-gain"
                  : row.tone === "critical"
                    ? "text-loss"
                    : ""
              }`}>
                {row.health}
              </td>
              <td className="py-1.5 font-mono tabular-nums">{row.latency}</td>
              <td className="py-1.5">{row.lastExecution}</td>
              <td className="py-1.5">
                <span className="inline-flex items-center gap-0.5">
                  <TrendIcon trend={row.trend} />
                  {row.trendLabel}
                </span>
              </td>
              <td className="py-1.5">{row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GaugeBar({ label, value }: { label: string; value: string }) {
  const numeric = Number.parseInt(value.replace("%", ""), 10);
  const width =
    Number.isFinite(numeric) && numeric > 0
      ? Math.max(0, Math.min(100, numeric))
      : 0;
  return (
    <div>
      <div className="mb-0.5 flex justify-between text-[10px] text-text-faint">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
        <div
          className="h-full rounded-full bg-accent transition-all duration-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Expandable Institutional Platform Health dashboard (Bloomberg / Datadog style).
 * Presentation-only — reuses existing Sprint 9F engine metrics from the snapshot.
 */
export function InstitutionalPlatformHealthPanel({
  snapshot,
}: {
  snapshot: InstitutionalPlatformSnapshot | null;
}) {
  const [expanded, setExpanded] = useState(true);
  const view = useMemo(
    () => buildInstitutionalPlatformHealthDashboard(snapshot),
    [snapshot]
  );

  if (!snapshot) {
    return (
      <InstitutionalPanelSkeleton
        title="Loading institutional platform health…"
        cells={6}
      />
    );
  }

  return (
    <div
      className="mb-4 rounded-lg border border-surface-border-subtle/80 bg-surface-hover/20 px-4 py-3"
      data-testid="institutional-platform-health-panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Server className="h-3.5 w-3.5 text-accent" />
          <p className="text-xs font-semibold text-text-primary">
            Institutional Platform Health
          </p>
          <span className="rounded border border-accent/20 bg-accent/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-accent">
            {view.header.overallStatus}
          </span>
          <InstitutionalTrustBadges badges={view.badges} compact />
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-surface-border-subtle px-2 py-1 text-[10px] font-medium text-text-secondary hover:bg-surface-hover"
        >
          {expanded ? (
            <>
              Collapse <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Expand <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <HealthMetric metric={view.header.platformHealthScore} />
        <HealthMetric metric={view.header.productionReadiness} />
        <div className="rounded-md border border-surface-border-subtle/70 bg-surface-hover/30 px-2.5 py-2">
          <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
            Platform Grade
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">
            {view.header.platformGrade}
          </p>
        </div>
        <div className="rounded-md border border-surface-border-subtle/70 bg-surface-hover/30 px-2.5 py-2">
          <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
            Last Validation
          </p>
          <p className="mt-0.5 text-[11px] text-text-secondary">
            {view.header.lastValidation}
          </p>
          <p className="mt-1 text-[9px] text-text-faint">
            Cert {view.header.lastCertification}
          </p>
        </div>
        <div className="rounded-md border border-surface-border-subtle/70 bg-surface-hover/30 px-2.5 py-2">
          <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
            Versions
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-text-secondary">
            Platform {view.header.platformVersion}
          </p>
          <p className="font-mono text-[10px] text-text-faint">
            Env {view.header.environment} · Build {view.header.buildVersion}
          </p>
          <p className="font-mono text-[10px] text-text-faint">
            Release {view.header.releaseVersion}
          </p>
        </div>
      </div>

      {view.empty ? (
        <p className="text-[11px] text-text-muted">{view.emptyMessage}</p>
      ) : null}

      {expanded ? (
        <div className="space-y-4 border-t border-surface-border-subtle/60 pt-3">
          <Section title="Engine Health">
            <EngineTable rows={view.engines} />
          </Section>

          <Section title="Pipeline Monitor">
            <MetricGrid
              items={[
                { label: "Pipeline Health", value: view.pipeline.pipelineHealth },
                {
                  label: "Execution Pipeline",
                  value: view.pipeline.executionPipeline,
                },
                { label: "Queue Health", value: view.pipeline.queueHealth },
                { label: "Snapshot Health", value: view.pipeline.snapshotHealth },
                {
                  label: "Dependency Health",
                  value: view.pipeline.dependencyHealth,
                },
                { label: "Failure Rate", value: view.pipeline.failureRate },
                { label: "Success Rate", value: view.pipeline.successRate },
                { label: "Retry Rate", value: view.pipeline.retryRate },
                {
                  label: "Average Runtime",
                  value: view.pipeline.averageRuntime,
                },
              ]}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <GaugeBar label="Success Rate" value={view.pipeline.successRate} />
              <GaugeBar
                label="Pipeline Health"
                value={view.pipeline.pipelineHealth}
              />
            </div>
          </Section>

          <Section title="Observability">
            <div className="mb-2 flex items-center gap-1 text-[10px] text-text-faint">
              <Activity className="h-3 w-3" /> Telemetry from Observability Engine
            </div>
            <MetricGrid
              items={[
                { label: "Requests", value: view.observability.requests },
                { label: "Events", value: view.observability.events },
                { label: "Warnings", value: view.observability.warnings },
                { label: "Errors", value: view.observability.errors },
                { label: "Exceptions", value: view.observability.exceptions },
                {
                  label: "Recovery Events",
                  value: view.observability.recoveryEvents,
                },
                {
                  label: "Avg Processing Time",
                  value: view.observability.averageProcessingTime,
                },
                { label: "P50", value: view.observability.p50 },
                { label: "P95", value: view.observability.p95 },
                { label: "P99", value: view.observability.p99 },
              ]}
            />
          </Section>

          <Section title="Diagnostics Panel">
            <MetricGrid
              items={[
                {
                  label: "Critical Issues",
                  value: view.diagnostics.criticalIssues,
                },
                { label: "Major Issues", value: view.diagnostics.majorIssues },
                { label: "Minor Issues", value: view.diagnostics.minorIssues },
                { label: "Warnings", value: view.diagnostics.warnings },
                {
                  label: "Resolved Issues",
                  value: view.diagnostics.resolvedIssues,
                },
                {
                  label: "Regression Detection",
                  value: view.diagnostics.regressionDetection,
                },
                {
                  label: "Dependency Drift",
                  value: view.diagnostics.dependencyDrift,
                },
                {
                  label: "Configuration Drift",
                  value: view.diagnostics.configurationDrift,
                },
              ]}
            />
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-[11px] text-text-muted">
              {view.diagnostics.issueLines.map((line) => (
                <li key={line}>› {line}</li>
              ))}
            </ul>
          </Section>

          <Section title="Performance Panel">
            <div className="mb-2 flex items-center gap-1 text-[10px] text-text-faint">
              <Gauge className="h-3 w-3" /> Performance Engine metrics
            </div>
            <MetricGrid
              items={[
                { label: "CPU Trend", value: view.performance.cpuTrend },
                { label: "Memory Trend", value: view.performance.memoryTrend },
                {
                  label: "Execution Time",
                  value: view.performance.executionTime,
                },
                { label: "Throughput", value: view.performance.throughput },
                {
                  label: "Avg Validation Time",
                  value: view.performance.averageValidationTime,
                },
                {
                  label: "Avg Recommendation Time",
                  value: view.performance.averageRecommendationTime,
                },
                {
                  label: "Avg Trust Calculation",
                  value: view.performance.averageTrustCalculation,
                },
              ]}
            />
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <GaugeBar label="CPU" value={view.performance.cpuTrend} />
              <GaugeBar label="Memory" value={view.performance.memoryTrend} />
            </div>
          </Section>

          <Section title="Certification Panel">
            <MetricGrid
              items={[
                {
                  label: "Production Ready",
                  value: view.certification.productionReady,
                },
                {
                  label: "Certification Grade",
                  value: view.certification.certificationGrade,
                },
                {
                  label: "Security Passed",
                  value: view.certification.securityPassed,
                },
                {
                  label: "Compliance Passed",
                  value: view.certification.compliancePassed,
                },
                {
                  label: "Validation Passed",
                  value: view.certification.validationPassed,
                },
                {
                  label: "Trust Passed",
                  value: view.certification.trustPassed,
                },
                {
                  label: "Performance Passed",
                  value: view.certification.performancePassed,
                },
                {
                  label: "Release Approved",
                  value: view.certification.releaseApproved,
                },
              ]}
            />
          </Section>

          <Section title="Audit Summary">
            <MetricGrid
              items={[
                { label: "Today's Audits", value: view.audit.todaysAudits },
                { label: "Successful", value: view.audit.successful },
                { label: "Failed", value: view.audit.failed },
                { label: "Warnings", value: view.audit.warnings },
                { label: "Export Activity", value: view.audit.exportActivity },
                { label: "Validation Runs", value: view.audit.validationRuns },
                {
                  label: "Trust Evaluations",
                  value: view.audit.trustEvaluations,
                },
              ]}
            />
          </Section>

          <Section title="Platform Timeline">
            <RecommendationTimeline
              events={view.timeline.map((e) => ({
                id: e.id,
                label: e.label,
                at: e.at,
                available: e.available,
              }))}
            />
          </Section>
        </div>
      ) : null}
    </div>
  );
}
