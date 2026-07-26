import { describe, expect, it } from "vitest";
import {
  assembleInstitutionalReport,
  exportInstitutionalReport,
  REPORT_TEMPLATES,
  fingerprintReplayBundle,
  listDemoReplayBundles,
  buildReplayBundle,
  buildStrategyValidationReport,
} from "@/lib/backtesting";

describe("institutional reports (11B.4)", () => {
  it("assembles a deterministic executive report", () => {
    const a = assembleInstitutionalReport({
      templateId: "executive",
      now: new Date("2026-02-16T10:00:00.000Z"),
    });
    const b = assembleInstitutionalReport({
      templateId: "executive",
      now: new Date("2026-02-16T10:00:00.000Z"),
    });
    expect(a.version.reportId).toBe(b.version.reportId);
    expect(a.executiveSummary).toEqual(b.executiveSummary);
    expect(a.visuals.equityCurve).toEqual(b.visuals.equityCurve);
    expect(a.version.applicationVersion).toBe("0.1.0");
    expect(a.version.dataVersion).toBeTruthy();
    expect(a.version.backtestSessionIds.length).toBeGreaterThan(0);
  });

  it("exposes all reusable templates", () => {
    expect(REPORT_TEMPLATES.map((t) => t.id)).toEqual([
      "executive",
      "strategy",
      "recommendation_validation",
      "benchmark",
      "risk",
      "backtest_session",
    ]);
  });

  it("materializes exports via shared export contracts", async () => {
    const report = assembleInstitutionalReport({
      templateId: "backtest_session",
      now: new Date("2026-02-16T10:00:00.000Z"),
    });
    const json = await exportInstitutionalReport({
      report,
      format: "json",
    });
    expect(json.status).toBe("ready");
    expect(typeof json.body).toBe("string");
    expect(String(json.body)).toContain(report.version.reportId);

    const csv = await exportInstitutionalReport({ report, format: "csv" });
    expect(csv.status).toBe("ready");
    expect(String(csv.body).split("\n")[0]).toContain("tradeId");

    const pdf = await exportInstitutionalReport({ report, format: "pdf" });
    expect(pdf.status).toBe("ready");
    expect(String(pdf.body)).toContain("Executive Summary");
  });

  it("does not mutate validation or replay outputs", () => {
    const validation = buildStrategyValidationReport({
      now: new Date("2026-02-16T08:00:00.000Z"),
    });
    const report = assembleInstitutionalReport({
      templateId: "strategy",
      now: new Date("2026-02-16T10:00:00.000Z"),
    });
    expect(report.validation.strategyComparison).toEqual(
      validation.strategyComparison
    );

    const [first] = listDemoReplayBundles();
    const rebuilt = buildReplayBundle({
      session: first.session,
      dataset: first.dataset,
    });
    expect(fingerprintReplayBundle(rebuilt)).toBe(
      fingerprintReplayBundle(first)
    );
  });
});
