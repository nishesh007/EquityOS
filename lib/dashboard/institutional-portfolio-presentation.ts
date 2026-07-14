/**
 * Institutional Portfolio Dashboard — presentation only.
 * Maps PortfolioSummary + PortfolioDoctorAnalysis + optional institutional snapshot.
 * No portfolio / validation / trust / AI recalculation.
 */

import type {
  PortfolioDoctorAnalysis,
  PortfolioHolding,
  PortfolioSummary,
  PositionWeightStatus,
  ScoreTone,
} from "@/types";
import type {
  InstitutionalCandidateView,
  InstitutionalPlatformSnapshot,
} from "@/lib/opportunity-engine/institutional-presentation";
import {
  formatOptionalTimestamp,
  hasValidationActivity,
} from "@/lib/dashboard/display-value";
import {
  buildPlatformInstitutionalBadges,
  type PlatformInstitutionalBadge,
} from "@/lib/dashboard/institutional-exposure";

const NA = "N/A";
const AWAITING = "Awaiting Validation";
const INSUFFICIENT = "Insufficient Data";
const NO_PORTFOLIO = "No Portfolio";
const LOADING = "Portfolio Loading";

export type PortfolioTone =
  | "excellent"
  | "healthy"
  | "caution"
  | "critical"
  | "neutral";

export interface PortfolioMetricCell {
  id: string;
  label: string;
  value: string;
  tone: PortfolioTone;
  toneClass: string;
  detail?: string;
}

export interface PortfolioHealthView {
  overallGrade: string;
  institutionalScore: string;
  validationScore: string;
  trustScore: string;
  diversificationScore: string;
  riskScore: string;
  aiConfidence: string;
  productionStatus: string;
  verdict: string;
  headline: string;
  metrics: PortfolioMetricCell[];
  empty: boolean;
  emptyMessage: string;
}

export interface PortfolioValidationView {
  portfolioValidation: string;
  holdingValidation: string;
  dataQuality: string;
  executionQuality: string;
  historicalValidation: string;
  validationStatus: string;
  timeline: Array<{ id: string; label: string; at: string }>;
  empty: boolean;
  emptyMessage: string;
}

export interface PortfolioTrustView {
  portfolioTrust: string;
  holdingTrust: string;
  historicalTrust: string;
  trustDrivers: string[];
  trustTrend: string;
  institutionalGrade: string;
  empty: boolean;
  emptyMessage: string;
}

export interface PortfolioRiskView {
  sectorConcentration: string;
  marketCapDistribution: string;
  positionSizeRisk: string;
  singleStockRisk: string;
  liquidityRisk: string;
  volatilityRisk: string;
  riskSummary: string;
  metrics: PortfolioMetricCell[];
  empty: boolean;
  emptyMessage: string;
}

export interface PortfolioDiversificationView {
  sectorAllocation: Array<{ label: string; percent: string; tone: PortfolioTone }>;
  industryAllocation: Array<{ label: string; percent: string; tone: PortfolioTone }>;
  largeCap: string;
  midCap: string;
  smallCap: string;
  numberOfHoldings: string;
  topConcentration: string;
  diversificationRating: string;
  empty: boolean;
  emptyMessage: string;
}

export interface PortfolioQualityRow {
  symbol: string;
  name: string;
  institutionalGrade: string;
  validation: string;
  trust: string;
  aiConfidence: string;
  risk: string;
  status: string;
  tone: PortfolioTone;
}

export interface PortfolioHeatCell {
  id: string;
  label: string;
  value: string;
  intensity: number;
  tone: PortfolioTone;
}

export interface PortfolioRecommendationItem {
  id: string;
  category:
    | "Reduce Exposure"
    | "Increase Exposure"
    | "Review Position"
    | "Watch Closely"
    | "High Conviction"
    | "Low Trust"
    | "Validation Pending";
  title: string;
  detail: string;
  priority: "high" | "medium" | "low";
  tone: PortfolioTone;
}

export interface PortfolioDashboardView {
  health: PortfolioHealthView;
  validation: PortfolioValidationView;
  trust: PortfolioTrustView;
  risk: PortfolioRiskView;
  diversification: PortfolioDiversificationView;
  qualityMatrix: PortfolioQualityRow[];
  heatmap: PortfolioHeatCell[];
  recommendations: PortfolioRecommendationItem[];
  badges: PlatformInstitutionalBadge[];
  empty: boolean;
  emptyMessage: string;
  generatedAt: string;
  holdingCount: number;
}

const TONE_CLASS: Record<PortfolioTone, string> = {
  excellent: "text-gain",
  healthy: "text-accent",
  caution: "text-amber-600",
  critical: "text-loss",
  neutral: "text-text-muted",
};

function toneFromScore(score: number | null | undefined, invert = false): PortfolioTone {
  if (score == null || !Number.isFinite(score)) return "neutral";
  const s = invert ? 100 - score : score;
  if (s >= 85) return "excellent";
  if (s >= 70) return "healthy";
  if (s >= 50) return "caution";
  return "critical";
}

function toneFromScoreTone(t: ScoreTone | undefined): PortfolioTone {
  if (t === "gain") return "excellent";
  if (t === "loss") return "critical";
  if (t === "accent") return "healthy";
  return "neutral";
}

function disp(
  value: number | null | undefined,
  fallback = NA,
  opts?: { suffix?: string; activity?: boolean }
): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  if (value === 0 && opts?.activity === false) return fallback;
  return `${Math.round(value)}${opts?.suffix ?? ""}`;
}

function pct(value: number | null | undefined, fallback = NA): string {
  if (value == null || !Number.isFinite(value)) return fallback;
  return `${Math.round(value * 10) / 10}%`;
}

function gradeFromScore(score: number | null | undefined, fallback = AWAITING): string {
  if (score == null || !Number.isFinite(score)) return fallback;
  if (score >= 85) return "A — Institutional";
  if (score >= 75) return "B — Strong";
  if (score >= 65) return "C — Watch";
  if (score >= 50) return "D — Caution";
  return "F — Critical";
}

function statusLabel(status: PositionWeightStatus | string | undefined): string {
  if (!status) return NA;
  if (status === "overweight") return "Overweight";
  if (status === "underweight") return "Underweight";
  if (status === "neutral") return "Neutral";
  return String(status);
}

function emptyHealth(message: string): PortfolioHealthView {
  return {
    overallGrade: message,
    institutionalScore: message,
    validationScore: message,
    trustScore: message,
    diversificationScore: message,
    riskScore: message,
    aiConfidence: message,
    productionStatus: message,
    verdict: message,
    headline: message,
    metrics: [],
    empty: true,
    emptyMessage: message,
  };
}

export function buildPortfolioHealth(input: {
  portfolio?: PortfolioSummary | null;
  doctor?: PortfolioDoctorAnalysis | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
}): PortfolioHealthView {
  const portfolio = input.portfolio ?? null;
  const doctor = input.doctor ?? null;
  const snapshot = input.snapshot ?? null;

  if (!portfolio && !doctor) {
    return emptyHealth(NO_PORTFOLIO);
  }
  if (portfolio && portfolio.holdings.length === 0 && !doctor) {
    return emptyHealth(NO_PORTFOLIO);
  }
  if (!doctor) {
    return emptyHealth(AWAITING);
  }

  const health = doctor.healthScore.overall;
  const validation =
    snapshot?.dashboard?.health.overallHealthScore ??
    snapshot?.platform?.overallHealthScore ??
    null;
  const trust =
    snapshot?.trust?.averageTrustScore ??
    snapshot?.platform?.overallTrustScore ??
    null;
  const diversification = doctor.diversification.score;
  const risk = doctor.riskEngine.overallRisk;
  const ai =
    snapshot?.explainability?.confidenceCoverage ??
    snapshot?.platform?.overallExplainability ??
    null;
  const readiness = snapshot?.platform?.overallReadiness ?? null;
  const hasVal = hasValidationActivity({
    totalValidations: snapshot?.dashboard?.summary.totalValidations,
    totalCalculations: snapshot?.trust?.totalCalculations,
    decisionTraces: snapshot?.explainability?.decisionTraces,
  });

  const metrics: PortfolioMetricCell[] = [
    {
      id: "grade",
      label: "Overall Portfolio Grade",
      value: doctor.diversification.grade
        ? `${doctor.diversification.grade} — ${doctor.diversification.gradeExplanation || doctor.healthScore.verdict}`
        : gradeFromScore(health),
      tone: toneFromScore(health),
      toneClass: TONE_CLASS[toneFromScore(health)],
    },
    {
      id: "institutional",
      label: "Institutional Score",
      value: disp(health, AWAITING),
      tone: toneFromScore(health),
      toneClass: TONE_CLASS[toneFromScore(health)],
    },
    {
      id: "validation",
      label: "Validation Score",
      value: disp(validation, hasVal ? NA : AWAITING, { activity: hasVal }),
      tone: toneFromScore(validation),
      toneClass: TONE_CLASS[toneFromScore(validation)],
    },
    {
      id: "trust",
      label: "Trust Score",
      value: disp(trust, hasVal ? NA : AWAITING, { activity: hasVal }),
      tone: toneFromScore(trust),
      toneClass: TONE_CLASS[toneFromScore(trust)],
    },
    {
      id: "diversification",
      label: "Diversification Score",
      value: disp(diversification, INSUFFICIENT),
      tone: toneFromScore(diversification),
      toneClass: TONE_CLASS[toneFromScore(diversification)],
    },
    {
      id: "risk",
      label: "Risk Score",
      value: disp(risk, INSUFFICIENT),
      tone: toneFromScore(risk, true),
      toneClass: TONE_CLASS[toneFromScore(risk, true)],
      detail: doctor.riskEngine.overallRiskLabel,
    },
    {
      id: "ai",
      label: "AI Confidence",
      value: disp(ai, AWAITING, { activity: hasVal }),
      tone: toneFromScore(ai),
      toneClass: TONE_CLASS[toneFromScore(ai)],
    },
    {
      id: "production",
      label: "Production Status",
      value:
        readiness != null && readiness >= 75
          ? "Production Ready"
          : readiness != null
            ? "Monitored"
            : AWAITING,
      tone: toneFromScore(readiness),
      toneClass: TONE_CLASS[toneFromScore(readiness)],
    },
  ];

  return {
    overallGrade: metrics[0]?.value ?? gradeFromScore(health),
    institutionalScore: disp(health, AWAITING),
    validationScore: disp(validation, hasVal ? NA : AWAITING, { activity: hasVal }),
    trustScore: disp(trust, hasVal ? NA : AWAITING, { activity: hasVal }),
    diversificationScore: disp(diversification, INSUFFICIENT),
    riskScore: disp(risk, INSUFFICIENT),
    aiConfidence: disp(ai, AWAITING, { activity: hasVal }),
    productionStatus: metrics.find((m) => m.id === "production")?.value ?? AWAITING,
    verdict: doctor.healthScore.verdict || AWAITING,
    headline: doctor.summary.headline || doctor.healthScore.summary || AWAITING,
    metrics,
    empty: false,
    emptyMessage: "",
  };
}

export function buildPortfolioValidation(input: {
  doctor?: PortfolioDoctorAnalysis | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  portfolio?: PortfolioSummary | null;
}): PortfolioValidationView {
  const doctor = input.doctor ?? null;
  const snapshot = input.snapshot ?? null;
  const holdings = input.portfolio?.holdings.length ?? 0;

  if (!doctor && !snapshot) {
    return {
      portfolioValidation: AWAITING,
      holdingValidation: AWAITING,
      dataQuality: AWAITING,
      executionQuality: AWAITING,
      historicalValidation: AWAITING,
      validationStatus: AWAITING,
      timeline: [],
      empty: true,
      emptyMessage: AWAITING,
    };
  }

  const hasVal = hasValidationActivity({
    totalValidations: snapshot?.dashboard?.summary.totalValidations,
    totalCalculations: snapshot?.trust?.totalCalculations,
  });
  const portfolioVal =
    snapshot?.dashboard?.health.overallHealthScore ??
    snapshot?.platform?.overallHealthScore ??
    doctor?.healthScore.overall ??
    null;
  const dataQuality = doctor?.quality.qualityScore ?? null;
  const execution =
    snapshot?.dashboard?.summary.tradeSetupQuality ??
    snapshot?.platform?.overallPerformance ??
    null;
  const historical =
    snapshot?.dashboard?.summary.historicalPerformanceScore ??
    snapshot?.dashboard?.health.historicalEngineHealth ??
    null;
  const status =
    snapshot?.platform?.overallValidationStatus ??
    (portfolioVal != null && portfolioVal >= 70 ? "healthy" : AWAITING);

  const timeline: PortfolioValidationView["timeline"] = [];
  if (doctor?.generatedAt) {
    timeline.push({
      id: "doctor",
      label: "Portfolio Doctor Analysis",
      at: formatOptionalTimestamp(doctor.generatedAt, AWAITING),
    });
  }
  if (snapshot?.dashboard?.summary.generatedAt) {
    timeline.push({
      id: "dashboard",
      label: "Validation Dashboard",
      at: formatOptionalTimestamp(snapshot.dashboard.summary.generatedAt, AWAITING),
    });
  }
  if (snapshot?.explainability?.lastRunAt) {
    timeline.push({
      id: "explain",
      label: "Explainability Run",
      at: formatOptionalTimestamp(snapshot.explainability.lastRunAt, AWAITING),
    });
  }
  if (snapshot?.operations?.metrics?.lastRunAt) {
    timeline.push({
      id: "ops",
      label: "Platform Operations",
      at: formatOptionalTimestamp(snapshot.operations.metrics.lastRunAt, AWAITING),
    });
  }

  return {
    portfolioValidation: disp(portfolioVal, hasVal ? NA : AWAITING, { activity: hasVal }),
    holdingValidation:
      holdings > 0
        ? `${holdings} holdings · ${disp(portfolioVal, AWAITING)}`
        : AWAITING,
    dataQuality: disp(dataQuality, doctor ? INSUFFICIENT : AWAITING),
    executionQuality: disp(execution, hasVal ? NA : AWAITING, { activity: hasVal }),
    historicalValidation: disp(historical, hasVal ? NA : AWAITING, { activity: hasVal }),
    validationStatus: String(status),
    timeline,
    empty: false,
    emptyMessage: "",
  };
}

export function buildPortfolioRisk(input: {
  doctor?: PortfolioDoctorAnalysis | null;
}): PortfolioRiskView {
  const doctor = input.doctor ?? null;
  if (!doctor) {
    return {
      sectorConcentration: AWAITING,
      marketCapDistribution: AWAITING,
      positionSizeRisk: AWAITING,
      singleStockRisk: AWAITING,
      liquidityRisk: AWAITING,
      volatilityRisk: AWAITING,
      riskSummary: AWAITING,
      metrics: [],
      empty: true,
      emptyMessage: AWAITING,
    };
  }

  const re = doctor.riskEngine;
  const d = doctor.diversification;
  const metrics: PortfolioMetricCell[] = [
    re.sectorRisk,
    re.concentrationRisk,
    re.liquidityRisk,
    re.volatilityRisk,
    re.correlationRisk,
    re.drawdownRisk,
  ].map((m) => ({
    id: m.key,
    label: m.label,
    value: `${disp(m.score)} · ${m.level}`,
    tone: toneFromScoreTone(m.tone),
    toneClass: TONE_CLASS[toneFromScoreTone(m.tone)],
    detail: m.explanation,
  }));

  return {
    sectorConcentration: `${disp(re.sectorRisk.score)} · ${re.sectorRisk.level}`,
    marketCapDistribution: `L ${pct(d.largeCapPercent)} · M ${pct(d.midCapPercent)} · S ${pct(d.smallCapPercent)}`,
    positionSizeRisk: `${disp(re.concentrationRisk.score)} · ${re.concentrationRisk.level}`,
    singleStockRisk: `${d.maxSingleStockSymbol || NA} · ${pct(d.maxSingleStockPercent)}`,
    liquidityRisk: `${disp(re.liquidityRisk.score)} · ${re.liquidityRisk.level}`,
    volatilityRisk: `${disp(re.volatilityRisk.score)} · ${re.volatilityRisk.level}`,
    riskSummary: re.summary || doctor.summary.worstRisk || INSUFFICIENT,
    metrics,
    empty: false,
    emptyMessage: "",
  };
}

function buildTrust(input: {
  doctor?: PortfolioDoctorAnalysis | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
}): PortfolioTrustView {
  const doctor = input.doctor ?? null;
  const snapshot = input.snapshot ?? null;
  const hasTrust = (snapshot?.trust?.totalCalculations ?? 0) > 0;
  const trust =
    snapshot?.trust?.averageTrustScore ??
    snapshot?.platform?.overallTrustScore ??
    null;
  const historical =
    snapshot?.trust?.highestTrustScore != null &&
    snapshot?.trust?.lowestTrustScore != null
      ? `High ${disp(snapshot.trust.highestTrustScore)} · Low ${disp(snapshot.trust.lowestTrustScore)}`
      : AWAITING;
  const trend =
    snapshot?.trust?.averageTrend != null
      ? snapshot.trust.averageTrend > 0
        ? `Up · ${disp(snapshot.trust.averageTrend)}`
        : snapshot.trust.averageTrend < 0
          ? `Down · ${disp(Math.abs(snapshot.trust.averageTrend))}`
          : "Flat"
      : AWAITING;

  const drivers: string[] = [];
  if (doctor?.quality.summary) drivers.push(doctor.quality.summary);
  if (doctor?.summary.bestOpportunity) {
    drivers.push(`Opportunity: ${doctor.summary.bestOpportunity}`);
  }
  if (doctor?.diagnostics.length) {
    const green = doctor.diagnostics.filter((d) => d.severity === "green").length;
    const red = doctor.diagnostics.filter((d) => d.severity === "red").length;
    drivers.push(`Diagnostics · ${green} healthy · ${red} attention`);
  }
  if (drivers.length === 0) drivers.push(hasTrust ? NA : AWAITING);

  return {
    portfolioTrust: disp(trust, hasTrust ? NA : AWAITING, { activity: hasTrust }),
    holdingTrust: disp(trust, hasTrust ? NA : AWAITING, { activity: hasTrust }),
    historicalTrust: historical,
    trustDrivers: drivers,
    trustTrend: trend,
    institutionalGrade: gradeFromScore(
      trust ?? doctor?.healthScore.overall ?? null,
      AWAITING
    ),
    empty: !doctor && !snapshot,
    emptyMessage: !doctor && !snapshot ? AWAITING : "",
  };
}

function buildDiversification(input: {
  doctor?: PortfolioDoctorAnalysis | null;
  portfolio?: PortfolioSummary | null;
}): PortfolioDiversificationView {
  const doctor = input.doctor ?? null;
  const holdings = input.portfolio?.holdings.length ?? 0;
  if (!doctor) {
    return {
      sectorAllocation: [],
      industryAllocation: [],
      largeCap: AWAITING,
      midCap: AWAITING,
      smallCap: AWAITING,
      numberOfHoldings: holdings > 0 ? String(holdings) : NO_PORTFOLIO,
      topConcentration: AWAITING,
      diversificationRating: AWAITING,
      empty: true,
      emptyMessage: AWAITING,
    };
  }

  const d = doctor.diversification;
  const sectorAllocation = d.sectorAllocation.map((s) => ({
    label: s.sector || NA,
    percent: pct(s.currentPercent),
    tone: toneFromScoreTone(s.tone),
  }));
  // Industry breakdown is not separately modeled — reuse sector allocation read-only.
  const industryAllocation =
    sectorAllocation.length > 0
      ? sectorAllocation.map((s) => ({ ...s }))
      : [{ label: INSUFFICIENT, percent: NA, tone: "neutral" as PortfolioTone }];

  return {
    sectorAllocation:
      sectorAllocation.length > 0
        ? sectorAllocation
        : [{ label: INSUFFICIENT, percent: NA, tone: "neutral" }],
    industryAllocation,
    largeCap: pct(d.largeCapPercent),
    midCap: pct(d.midCapPercent),
    smallCap: pct(d.smallCapPercent),
    numberOfHoldings: String(
      holdings > 0 ? holdings : doctor.positionSizing.length || 0
    ),
    topConcentration: `${d.maxSingleStockSymbol || NA} · ${pct(d.maxSingleStockPercent)} · Top5 ${pct(d.top5HoldingsPercent)}`,
    diversificationRating: `${d.grade} — ${d.gradeExplanation || doctor.summary.diversificationGrade}`,
    empty: false,
    emptyMessage: "",
  };
}

function buildQualityMatrix(input: {
  portfolio?: PortfolioSummary | null;
  doctor?: PortfolioDoctorAnalysis | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  candidate?: InstitutionalCandidateView | null;
}): PortfolioQualityRow[] {
  const doctor = input.doctor ?? null;
  const snapshot = input.snapshot ?? null;
  const portfolio = input.portfolio ?? null;
  const candidate = input.candidate ?? null;

  const hasVal = hasValidationActivity({
    totalValidations: snapshot?.dashboard?.summary.totalValidations,
    totalCalculations: snapshot?.trust?.totalCalculations,
    decisionTraces: snapshot?.explainability?.decisionTraces,
  });
  const portfolioVal =
    snapshot?.dashboard?.health.overallHealthScore ??
    doctor?.healthScore.overall ??
    null;
  const portfolioTrust =
    snapshot?.trust?.averageTrustScore ??
    snapshot?.platform?.overallTrustScore ??
    null;
  const ai =
    snapshot?.explainability?.confidenceCoverage ??
    candidate?.confidence ??
    null;

  const holdings: PortfolioHolding[] =
    portfolio?.holdings ??
    doctor?.positionSizing.map((p) => ({
      id: p.symbol,
      symbol: p.symbol,
      name: p.name,
      quantity: 0,
      avgPrice: 0,
      currentPrice: 0,
      changePercent: 0,
    })) ??
    [];

  if (holdings.length === 0 && candidate) {
    return [
      {
        symbol: "FOCUS",
        name: "Focused Position",
        institutionalGrade: gradeFromScore(candidate.overallScore, AWAITING),
        validation: disp(candidate.validationScore, AWAITING),
        trust: disp(candidate.trustScore, AWAITING),
        aiConfidence: disp(candidate.confidence, AWAITING),
        risk: candidate.riskRating ?? AWAITING,
        status: "Watch",
        tone: toneFromScore(candidate.overallScore),
      },
    ];
  }

  const sizingBySymbol = new Map(
    (doctor?.positionSizing ?? []).map((p) => [p.symbol.toUpperCase(), p])
  );

  return holdings.map((h) => {
    const sizing = sizingBySymbol.get(h.symbol.toUpperCase());
    const riskTone =
      sizing?.status === "overweight"
        ? "caution"
        : sizing?.status === "underweight"
          ? "healthy"
          : toneFromScore(portfolioVal);
    return {
      symbol: h.symbol,
      name: h.name || h.symbol,
      institutionalGrade: gradeFromScore(
        doctor?.healthScore.overall ?? portfolioVal,
        AWAITING
      ),
      validation: disp(portfolioVal, hasVal ? NA : AWAITING, { activity: hasVal }),
      trust: disp(portfolioTrust, hasVal ? NA : AWAITING, { activity: hasVal }),
      aiConfidence: disp(ai, AWAITING, { activity: hasVal }),
      risk:
        sizing != null
          ? `${statusLabel(sizing.status)} · ${pct(sizing.currentWeight)}`
          : AWAITING,
      status: statusLabel(sizing?.status) || "Monitored",
      tone: riskTone as PortfolioTone,
    };
  });
}

function buildHeatmap(input: {
  doctor?: PortfolioDoctorAnalysis | null;
}): PortfolioHeatCell[] {
  const doctor = input.doctor ?? null;
  if (!doctor) return [];

  const cells: PortfolioHeatCell[] = doctor.sectorAllocation.map((s) => ({
    id: `sector-${s.sector}`,
    label: s.sector || NA,
    value: pct(s.currentPercent),
    intensity: Math.min(100, Math.max(0, s.currentPercent)),
    tone: toneFromScoreTone(s.tone),
  }));

  for (const p of doctor.positionSizing.slice(0, 12)) {
    cells.push({
      id: `pos-${p.symbol}`,
      label: p.symbol,
      value: pct(p.currentWeight),
      intensity: Math.min(100, Math.max(0, p.currentWeight)),
      tone:
        p.status === "overweight"
          ? "caution"
          : p.status === "underweight"
            ? "healthy"
            : "neutral",
    });
  }

  return cells;
}

function buildRecommendations(input: {
  doctor?: PortfolioDoctorAnalysis | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
}): PortfolioRecommendationItem[] {
  const doctor = input.doctor ?? null;
  const snapshot = input.snapshot ?? null;
  const items: PortfolioRecommendationItem[] = [];

  const hasVal = hasValidationActivity({
    totalValidations: snapshot?.dashboard?.summary.totalValidations,
    totalCalculations: snapshot?.trust?.totalCalculations,
  });

  if (!hasVal) {
    items.push({
      id: "validation-pending",
      category: "Validation Pending",
      title: "Validation Pending",
      detail: "Institutional validation activity has not been recorded for this portfolio session.",
      priority: "medium",
      tone: "caution",
    });
  }

  const trust = snapshot?.trust?.averageTrustScore ?? null;
  if (hasVal && trust != null && trust < 65) {
    items.push({
      id: "low-trust",
      category: "Low Trust",
      title: "Low Trust",
      detail: `Portfolio trust ${disp(trust)} is below institutional threshold.`,
      priority: "high",
      tone: "critical",
    });
  }

  for (const p of doctor?.positionSizing ?? []) {
    if (p.status === "overweight") {
      items.push({
        id: `reduce-${p.symbol}`,
        category: "Reduce Exposure",
        title: `Reduce ${p.symbol}`,
        detail: `${p.name} is overweight at ${pct(p.currentWeight)} (ideal ${pct(p.idealWeight)}).`,
        priority: "high",
        tone: "caution",
      });
    }
    if (p.status === "underweight") {
      items.push({
        id: `increase-${p.symbol}`,
        category: "Increase Exposure",
        title: `Increase ${p.symbol}`,
        detail: `${p.name} is underweight at ${pct(p.currentWeight)} (ideal ${pct(p.idealWeight)}).`,
        priority: "medium",
        tone: "healthy",
      });
    }
  }

  for (const d of doctor?.diagnostics ?? []) {
    if (d.severity === "red" || d.severity === "yellow") {
      items.push({
        id: `diag-${d.key}`,
        category: d.severity === "red" ? "Review Position" : "Watch Closely",
        title: d.label,
        detail: d.description,
        priority: d.severity === "red" ? "high" : "medium",
        tone: d.severity === "red" ? "critical" : "caution",
      });
    }
  }

  for (const r of doctor?.recommendations ?? []) {
    const category: PortfolioRecommendationItem["category"] =
      r.priority === "high" ? "Watch Closely" : "High Conviction";
    items.push({
      id: r.id,
      category:
        /reduce|trim|cut/i.test(r.action)
          ? "Reduce Exposure"
          : /increase|add|build/i.test(r.action)
            ? "Increase Exposure"
            : /review/i.test(r.action)
              ? "Review Position"
              : category,
      title: r.action,
      detail: r.reasoning,
      priority: r.priority,
      tone: toneFromScoreTone(r.tone),
    });
  }

  if (doctor && doctor.healthScore.overall >= 80) {
    items.push({
      id: "high-conviction-book",
      category: "High Conviction",
      title: "High Conviction Book",
      detail: doctor.summary.bestOpportunity || doctor.summary.headline,
      priority: "low",
      tone: "excellent",
    });
  }

  if (items.length === 0) {
    items.push({
      id: "awaiting",
      category: "Validation Pending",
      title: AWAITING,
      detail: "Recommendations appear when portfolio analysis and validation are available.",
      priority: "low",
      tone: "neutral",
    });
  }

  return items.slice(0, 24);
}

function buildBadges(input: {
  doctor?: PortfolioDoctorAnalysis | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
}): PlatformInstitutionalBadge[] {
  const badges = buildPlatformInstitutionalBadges(input.snapshot ?? null);
  const doctor = input.doctor ?? null;
  const seen = new Set(badges.map((b) => b.id));

  const push = (id: string, label: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    badges.push({ id, label });
  };

  if (doctor && doctor.healthScore.overall >= 80) {
    push("INSTITUTIONAL_GRADE", "Institutional Grade");
  }
  if (doctor && doctor.diversification.score >= 70) {
    push("DIVERSIFIED", "Diversified");
  }
  if (
    doctor &&
    doctor.riskEngine.overallRisk <= 40 &&
    doctor.riskEngine.overallTone !== "loss"
  ) {
    push("RISK_CONTROLLED", "Risk Controlled");
  }

  return badges;
}

export function buildPortfolioDashboard(input: {
  portfolio?: PortfolioSummary | null;
  doctor?: PortfolioDoctorAnalysis | null;
  snapshot?: InstitutionalPlatformSnapshot | null;
  candidate?: InstitutionalCandidateView | null;
}): PortfolioDashboardView {
  const portfolio = input.portfolio ?? null;
  const doctor = input.doctor ?? null;
  const snapshot = input.snapshot ?? null;
  const candidate = input.candidate ?? null;

  if (!portfolio && !doctor && !candidate) {
    return {
      health: emptyHealth(NO_PORTFOLIO),
      validation: {
        portfolioValidation: NO_PORTFOLIO,
        holdingValidation: NO_PORTFOLIO,
        dataQuality: NO_PORTFOLIO,
        executionQuality: NO_PORTFOLIO,
        historicalValidation: NO_PORTFOLIO,
        validationStatus: NO_PORTFOLIO,
        timeline: [],
        empty: true,
        emptyMessage: NO_PORTFOLIO,
      },
      trust: {
        portfolioTrust: NO_PORTFOLIO,
        holdingTrust: NO_PORTFOLIO,
        historicalTrust: NO_PORTFOLIO,
        trustDrivers: [NO_PORTFOLIO],
        trustTrend: NO_PORTFOLIO,
        institutionalGrade: NO_PORTFOLIO,
        empty: true,
        emptyMessage: NO_PORTFOLIO,
      },
      risk: {
        sectorConcentration: NO_PORTFOLIO,
        marketCapDistribution: NO_PORTFOLIO,
        positionSizeRisk: NO_PORTFOLIO,
        singleStockRisk: NO_PORTFOLIO,
        liquidityRisk: NO_PORTFOLIO,
        volatilityRisk: NO_PORTFOLIO,
        riskSummary: NO_PORTFOLIO,
        metrics: [],
        empty: true,
        emptyMessage: NO_PORTFOLIO,
      },
      diversification: {
        sectorAllocation: [],
        industryAllocation: [],
        largeCap: NO_PORTFOLIO,
        midCap: NO_PORTFOLIO,
        smallCap: NO_PORTFOLIO,
        numberOfHoldings: "0",
        topConcentration: NO_PORTFOLIO,
        diversificationRating: NO_PORTFOLIO,
        empty: true,
        emptyMessage: NO_PORTFOLIO,
      },
      qualityMatrix: [],
      heatmap: [],
      recommendations: [
        {
          id: "empty",
          category: "Validation Pending",
          title: NO_PORTFOLIO,
          detail: "Add holdings to unlock institutional portfolio intelligence.",
          priority: "low",
          tone: "neutral",
        },
      ],
      badges: [],
      empty: true,
      emptyMessage: NO_PORTFOLIO,
      generatedAt: LOADING,
      holdingCount: 0,
    };
  }

  const health = buildPortfolioHealth({ portfolio, doctor, snapshot });
  const validation = buildPortfolioValidation({ portfolio, doctor, snapshot });
  const trust = buildTrust({ doctor, snapshot });
  const risk = buildPortfolioRisk({ doctor });
  const diversification = buildDiversification({ doctor, portfolio });

  return {
    health,
    validation,
    trust,
    risk,
    diversification,
    qualityMatrix: buildQualityMatrix({ portfolio, doctor, snapshot, candidate }),
    heatmap: buildHeatmap({ doctor }),
    recommendations: buildRecommendations({ doctor, snapshot }),
    badges: buildBadges({ doctor, snapshot }),
    empty: false,
    emptyMessage: "",
    generatedAt: formatOptionalTimestamp(
      doctor?.generatedAt ?? snapshot?.dashboard?.summary.generatedAt,
      AWAITING
    ),
    holdingCount: portfolio?.holdings.length ?? doctor?.positionSizing.length ?? 0,
  };
}

export { TONE_CLASS as PORTFOLIO_TONE_CLASS };
