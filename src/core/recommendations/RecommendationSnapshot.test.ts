import { beforeEach, describe, expect, it } from "vitest";
import {
  RECOMMENDATION_EMPTY,
  RECOMMENDATION_METRIC_LABELS,
  RECOMMENDATION_SECTION_LABELS,
  RecommendationRegistry,
  RecommendationStorage,
  assertNoPerformanceInRecommendation,
  archiveRecommendation,
  createRecommendation,
  createRecommendationSnapshot,
  emptyRecommendationPresentation,
  findCompanyRecommendations,
  findRecommendation,
  formatInstitutionalConviction,
  generateRecommendationId,
  getLatestRecommendation,
  isRecommendationId,
  listRecommendations,
  normalizeRecommendationIdentityPart,
  presentRecommendations,
  recommendationExists,
  resetRecommendationRegistry,
  stripPerformanceFields,
  toRecommendationPresentationCard,
  type CreateRecommendationSnapshotInput,
} from "./index";

function input(
  generatedAt = "2026-07-18T09:30:11.000Z",
  symbol = "TATAMOTORS",
  strategy = "Swing"
): CreateRecommendationSnapshotInput {
  return {
    company: { symbol, name: "Tata Motors", exchange: "NSE" },
    strategy,
    generatedAt,
    generatedByEngine: "Swing",
    aiVersion: "9F.1",
    originalConviction: 84,
    originalTrust: 91,
    originalValidation: {
      validationStatus: "APPROVED",
      overallValidationScore: 88,
    },
    entryRange: { low: 920, high: 940 },
    stopLoss: 875,
    targets: [
      { price: 1_000, label: "T1" },
      { price: 1_060, label: "T2" },
    ],
    riskReward: 2.4,
    reasons: ["Momentum aligned", "Validation approved"],
    technicalSnapshot: { rsi: 61, trend: { direction: "UP" } },
    fundamentalSnapshot: { qualityScore: 82 },
    marketSnapshot: { regime: "RISK_ON" },
    sectorSnapshot: { sector: "Auto", strength: 76 },
    portfolioStatus: "NOT_IN_PORTFOLIO",
    watchlistStatus: "IN_WATCHLIST",
  };
}

describe("Recommendation identity", () => {
  it("generates the institutional ID format", () => {
    expect(
      generateRecommendationId({
        symbol: "TATAMOTORS",
        engine: "SWING",
        generatedAt: "2026-07-18T09:30:11.000Z",
      })
    ).toBe("REC-20260718-093011-TATAMOTORS-SWING");
  });

  it("uses UTC when a Date is supplied", () => {
    const id = generateRecommendationId({
      symbol: "INFY",
      engine: "POSITIONAL",
      generatedAt: new Date("2026-01-02T23:04:05+05:30"),
    });
    expect(id).toBe("REC-20260102-173405-INFY-POSITIONAL");
  });

  it("normalizes symbol and engine identity parts", () => {
    expect(normalizeRecommendationIdentityPart(" tata-motors ")).toBe(
      "TATAMOTORS"
    );
    expect(
      isRecommendationId("REC-20260718-093011-TATAMOTORS-SWING")
    ).toBe(true);
  });

  it("rejects invalid timestamps and empty identity parts", () => {
    expect(() =>
      generateRecommendationId({
        symbol: "",
        engine: "SWING",
        generatedAt: "2026-07-18T09:30:11Z",
      })
    ).toThrow(/cannot be empty/);
    expect(() =>
      generateRecommendationId({
        symbol: "INFY",
        engine: "SWING",
        generatedAt: "invalid",
      })
    ).toThrow(/timestamp is invalid/);
  });
});

describe("Recommendation snapshot creation and integrity", () => {
  it("stores every original recommendation field", () => {
    const snapshot = createRecommendationSnapshot(input());
    expect(snapshot.recommendationId).toBe(
      "REC-20260718-093011-TATAMOTORS-SWING"
    );
    expect(snapshot.strategy).toBe("Swing");
    expect(snapshot.expectedHoldingPeriod).toBe("5–15 Trading Days");
    expect(snapshot.recommendationStatus).toBe("ENTRY_PENDING");
    expect(snapshot.originalConviction).toBe(84);
    expect(snapshot.originalTrust).toBe(91);
    expect(snapshot.entryRange).toEqual({ low: 920, high: 940 });
    expect(snapshot.targets).toHaveLength(2);
    expect(snapshot.convictionDrivers).toEqual([
      "Momentum aligned",
      "Validation approved",
    ]);
    expect(snapshot.technicalSnapshot).toMatchObject({ rsi: 61 });
    expect(snapshot.portfolioStatus).toBe("NOT_IN_PORTFOLIO");
  });

  it("deep-freezes protected snapshot values", () => {
    const snapshot = createRecommendationSnapshot(input());
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entryRange)).toBe(true);
    expect(Object.isFrozen(snapshot.targets)).toBe(true);
    expect(Object.isFrozen(snapshot.technicalSnapshot.trend)).toBe(true);
    expect(() => {
      (snapshot.entryRange as { low: number }).low = 1;
    }).toThrow();
  });

  it("detaches the snapshot from mutable engine inputs", () => {
    const source = input();
    const snapshot = createRecommendationSnapshot(source);
    source.reasons?.push("Late mutation");
    source.entryRange.low = 1;
    (source.technicalSnapshot.trend as { direction: string }).direction =
      "DOWN";
    expect(snapshot.reasons).toEqual([
      "Momentum aligned",
      "Validation approved",
    ]);
    expect(snapshot.entryRange.low).toBe(920);
    expect(snapshot.technicalSnapshot.trend).toEqual({ direction: "UP" });
  });

  it("rejects circular engine snapshots", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(() =>
      createRecommendationSnapshot({
        ...input(),
        technicalSnapshot: circular,
      })
    ).toThrow(/circular/);
  });

  it("defaults portfolio and watchlist status to unknown", () => {
    const source = input();
    delete source.portfolioStatus;
    delete source.watchlistStatus;
    const snapshot = createRecommendationSnapshot(source);
    expect(snapshot.portfolioStatus).toBe("UNKNOWN");
    expect(snapshot.watchlistStatus).toBe("UNKNOWN");
  });

  it("validates required metadata", () => {
    expect(() =>
      createRecommendationSnapshot({ ...input(), strategy: " " })
    ).toThrow(/strategy is required/);
    expect(() =>
      createRecommendationSnapshot({ ...input(), generatedAt: "bad-date" })
    ).toThrow(/timestamp is invalid/);
  });
});

describe("Recommendation storage", () => {
  it("stores and loads the same immutable snapshot", () => {
    const storage = new RecommendationStorage();
    const snapshot = createRecommendationSnapshot(input());
    storage.store(snapshot);
    expect(storage.load(snapshot.recommendationId)).toBe(snapshot);
  });

  it("never overwrites an existing recommendation", () => {
    const storage = new RecommendationStorage();
    const snapshot = createRecommendationSnapshot(input());
    storage.store(snapshot);
    expect(() => storage.store(snapshot)).toThrow(/already exists/);
  });

  it("reports existence and size", () => {
    const storage = new RecommendationStorage();
    const snapshot = createRecommendationSnapshot(input());
    expect(storage.exists(snapshot.recommendationId)).toBe(false);
    storage.store(snapshot);
    expect(storage.exists(snapshot.recommendationId)).toBe(true);
    expect(storage.size).toBe(1);
  });

  it("supports active, historical, expired and invalidated buckets", () => {
    const storage = new RecommendationStorage();
    const snapshots = [
      createRecommendationSnapshot(input("2026-07-18T09:30:11Z", "A")),
      createRecommendationSnapshot(input("2026-07-18T09:30:12Z", "B")),
      createRecommendationSnapshot(input("2026-07-18T09:30:13Z", "C")),
      createRecommendationSnapshot(input("2026-07-18T09:30:14Z", "D")),
    ];
    storage.store(snapshots[0], "ACTIVE");
    storage.store(snapshots[1], "HISTORICAL");
    storage.store(snapshots[2], "EXPIRED");
    storage.store(snapshots[3], "INVALIDATED");
    expect(storage.active()).toEqual([snapshots[0]]);
    expect(storage.historical()).toEqual([snapshots[1]]);
    expect(storage.expired()).toEqual([snapshots[2]]);
    expect(storage.invalidated()).toEqual([snapshots[3]]);
  });

  it("archives by moving the reference without changing it", () => {
    const storage = new RecommendationStorage();
    const snapshot = createRecommendationSnapshot(input());
    storage.store(snapshot);
    expect(storage.archive(snapshot.recommendationId)).toBe(snapshot);
    expect(storage.active()).toEqual([]);
    expect(storage.archived()).toEqual([snapshot]);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("returns defensive list containers", () => {
    const storage = new RecommendationStorage();
    const snapshot = createRecommendationSnapshot(input());
    storage.store(snapshot);
    const listed = storage.list();
    listed.length = 0;
    expect(storage.list()).toEqual([snapshot]);
  });
});

describe("Recommendation registry and public API", () => {
  beforeEach(() => resetRecommendationRegistry());

  it("creates, loads and finds recommendations", () => {
    const registry = new RecommendationRegistry();
    const snapshot = registry.create(input());
    expect(registry.load(snapshot.recommendationId)).toBe(snapshot);
    expect(registry.find(snapshot.recommendationId)).toBe(snapshot);
  });

  it("finds recommendation history by company symbol or name", () => {
    const registry = new RecommendationRegistry();
    registry.create(input("2026-07-18T09:30:11Z"));
    registry.create(input("2026-07-19T09:30:11Z"));
    expect(registry.findByCompany("tatamotors")).toHaveLength(2);
    expect(registry.findByCompany("Tata Motors")).toHaveLength(2);
  });

  it("finds recommendations by strategy", () => {
    const registry = new RecommendationRegistry();
    registry.create(input("2026-07-18T09:30:11Z", "AAA", "Swing"));
    registry.create(input("2026-07-18T09:30:12Z", "BBB", "Long Term"));
    expect(registry.findByStrategy("swing").map((item) => item.company.symbol)).toEqual([
      "AAA",
    ]);
  });

  it("finds active, historical, expired and invalidated records", () => {
    const registry = new RecommendationRegistry();
    registry.create(input("2026-07-18T09:30:11Z", "A"), "ACTIVE");
    registry.create(input("2026-07-18T09:30:12Z", "B"), "HISTORICAL");
    registry.create(input("2026-07-18T09:30:13Z", "C"), "EXPIRED");
    registry.create(input("2026-07-18T09:30:14Z", "D"), "INVALIDATED");
    expect(registry.findActive()).toHaveLength(1);
    expect(registry.findHistorical()).toHaveLength(1);
    expect(registry.findExpired()).toHaveLength(1);
    expect(registry.findInvalidated()).toHaveLength(1);
  });

  it("returns latest recommendation and ordered history", () => {
    const registry = new RecommendationRegistry();
    const older = registry.create(input("2026-07-18T09:30:11Z"));
    const newer = registry.create(input("2026-07-19T09:30:11Z"));
    expect(registry.latest({ company: "TATAMOTORS" })).toBe(newer);
    expect(registry.history("TATAMOTORS")).toEqual([newer, older]);
  });

  it("exposes the required process-level public API", () => {
    const older = createRecommendation(input("2026-07-18T09:30:11Z"));
    const newer = createRecommendation(input("2026-07-19T09:30:11Z"));
    expect(recommendationExists(older.recommendationId)).toBe(true);
    expect(findRecommendation(older.recommendationId)).toBe(older);
    expect(findCompanyRecommendations("TATAMOTORS")).toHaveLength(2);
    expect(listRecommendations()).toEqual([newer, older]);
    expect(getLatestRecommendation()).toBe(newer);
    expect(archiveRecommendation(older.recommendationId)).toBe(older);
    expect(listRecommendations({ status: "ARCHIVED" })).toEqual([older]);
  });
});

describe("Recommendation presentation", () => {
  it("maps immutable values without recalculation", () => {
    const snapshot = createRecommendationSnapshot({
      ...input(),
      convictionDrivers: [
        "Trend above 50 EMA",
        "Strong Relative Strength",
        "Earnings Revision Positive",
      ],
      riskFactors: ["Near Resistance", "Weak Market Breadth"],
    });
    const card = toRecommendationPresentationCard(snapshot);
    expect(card).toMatchObject({
      recommendationId: snapshot.recommendationId,
      symbol: "TATAMOTORS",
      strategy: "Swing",
      expectedHoldingPeriod: "5–15 Trading Days",
      statusLabel: "Entry Pending",
      institutionalConvictionDisplay: "84 / 100",
      conviction: 84,
      trust: 91,
      validation: 88,
      entryLow: 920,
      stopLoss: 875,
      riskReward: 2.4,
      empty: false,
    });
    expect(card.targets).toEqual([1_000, 1_060]);
    expect(card.convictionDrivers[0]).toBe("Trend above 50 EMA");
    expect(card.riskFactors).toEqual([
      "Near Resistance",
      "Weak Market Breadth",
    ]);
  });

  it("provides every required empty state", () => {
    expect(Object.values(RECOMMENDATION_EMPTY)).toEqual([
      "No Recommendations",
      "No History",
      "No Active Recommendation",
      "Awaiting Recommendation",
    ]);
    expect(emptyRecommendationPresentation()).toMatchObject({
      total: 0,
      empty: true,
      emptyMessage: "Awaiting Recommendation",
    });
  });

  it("presents populated and empty recommendation lists", () => {
    const snapshot = createRecommendationSnapshot(input());
    expect(presentRecommendations([snapshot])).toMatchObject({
      title: "Highest Conviction Recommendations",
      total: 1,
      empty: false,
    });
    expect(
      presentRecommendations([], {
        emptyMessage: RECOMMENDATION_EMPTY.noHistory,
      })
    ).toMatchObject({ total: 0, empty: true, emptyMessage: "No History" });
  });

  it("enforces presentation standards and performance isolation", () => {
    expect(RECOMMENDATION_SECTION_LABELS.highestConviction).toBe(
      "Highest Conviction Recommendations"
    );
    expect(RECOMMENDATION_METRIC_LABELS.institutionalConviction).toBe(
      "Institutional Conviction"
    );
    expect(formatInstitutionalConviction(93, "percent")).toBe("93%");
    expect(() =>
      assertNoPerformanceInRecommendation({
        conviction: 90,
        return: 12,
      })
    ).toThrow(/return/);
    expect(
      stripPerformanceFields({
        conviction: 90,
        return: 12,
        drawdown: -4,
        strategy: "Swing",
      })
    ).toEqual({ conviction: 90, strategy: "Swing" });
  });
});
