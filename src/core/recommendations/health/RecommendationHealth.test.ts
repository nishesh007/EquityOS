import { beforeEach, describe, expect, it } from "vitest";
import {
  createRecommendation,
  createRecommendationSnapshot,
  resetRecommendationRegistry,
  type CreateRecommendationSnapshotInput,
} from "../index";
import {
  RECOMMENDATION_HEALTH_EMPTY,
  calculateConvictionDrift,
  calculateHealth,
  calculateHealthForRecommendation,
  getHealthExplanation,
  getHealthFactors,
  getRecommendationHealth,
  presentRecommendationHealthCard,
  presentRecommendationHealthDetail,
  presentRecommendationHealthForSurface,
  resetRecommendationHealth,
  wireHealthCompany,
  wireHealthDashboard,
  wireHealthPortfolio,
  wireHealthRecommendationCenter,
  wireHealthReplay,
  wireHealthResearch,
  wireHealthWatchlists,
} from "./index";

function input(
  generatedAt = "2026-07-18T09:30:11.000Z",
  symbol = "TATAMOTORS",
  conviction = 93
): CreateRecommendationSnapshotInput {
  return {
    company: { symbol, name: "Tata Motors", exchange: "NSE" },
    strategy: "Swing",
    generatedAt,
    generatedByEngine: "Swing",
    aiVersion: "9F.1.R3",
    originalConviction: conviction,
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
    reasons: ["Trend above 50 EMA", "Sector Leadership"],
    riskFactors: ["Near Resistance"],
    convictionDrivers: ["Trend above 50 EMA", "Sector Leadership"],
    technicalSnapshot: { rsi: 61 },
    fundamentalSnapshot: { qualityScore: 82 },
    marketSnapshot: { regime: "RISK_ON" },
    sectorSnapshot: { sector: "Auto", strength: 76 },
  };
}

beforeEach(() => {
  resetRecommendationRegistry();
  resetRecommendationHealth();
});

describe("RecommendationHealthEngine", () => {
  it("keeps original conviction, trust, validation, entry, stop, targets and reasons frozen", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({
      snapshot,
      factors: {
        momentum: 70,
        sectorLeadership: 68,
        relativeStrength: 72,
        marketRegime: 65,
      },
    });

    expect(health.original.originalConviction).toBe(93);
    expect(health.original.originalTrust).toBe(91);
    expect(health.original.originalValidation).toBe(88);
    expect(health.original.originalEntryLow).toBe(920);
    expect(health.original.originalStop).toBe(875);
    expect(health.original.originalTargets).toEqual([1_000, 1_060]);
    expect(health.original.originalReasons).toEqual([
      "Trend above 50 EMA",
      "Sector Leadership",
    ]);
    expect(snapshot.originalConviction).toBe(93);
    expect(Object.isFrozen(snapshot)).toBe(true);
  });

  it("evolves current health without regenerating conviction", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({
      snapshot,
      factors: {
        momentum: 70,
        sectorLeadership: 65,
        relativeStrength: 68,
        marketRegime: 60,
        trend: 72,
      },
    });
    expect(health.current.currentHealth).toBeLessThan(93);
    expect(health.current.currentHealth).toBeGreaterThan(0);
    expect(health.snapshot.originalConviction).toBe(93);
    expect(health.drift.originalConviction).toBe(93);
  });

  it("exposes getRecommendationHealth after calculateHealthForRecommendation", () => {
    const snapshot = createRecommendation(input());
    calculateHealthForRecommendation(snapshot.recommendationId, {
      momentum: 80,
      trend: 82,
    });
    const stored = getRecommendationHealth(snapshot.recommendationId);
    expect(stored?.recommendationId).toBe(snapshot.recommendationId);
    expect(stored?.current.currentHealth).toBeGreaterThan(0);
  });

  it("supports all health states from Very Strong to Invalidated", () => {
    const strong = calculateHealth({
      snapshot: createRecommendationSnapshot(input("2026-07-18T09:30:11Z", "A", 95)),
      factors: {
        momentum: 96,
        trend: 95,
        relativeStrength: 94,
        sectorLeadership: 93,
        fundamentalStrength: 92,
        marketRegime: 91,
      },
    });
    expect(strong.state).toBe("Very Strong");

    const healthy = calculateHealth({
      snapshot: createRecommendationSnapshot(input("2026-07-18T09:30:12Z", "B", 78)),
      factors: { momentum: 76, trend: 74, relativeStrength: 75 },
    });
    expect(["Healthy", "Strong", "Neutral"]).toContain(healthy.state);

    const weak = calculateHealth({
      snapshot: createRecommendationSnapshot(input("2026-07-18T09:30:13Z", "C", 60)),
      factors: { momentum: 35, trend: 40, marketRegime: 38 },
    });
    expect(["Weak", "Critical", "Neutral"]).toContain(weak.state);

    const invalidated = calculateHealth({
      snapshot: createRecommendationSnapshot(input("2026-07-18T09:30:14Z", "D", 90)),
      invalidated: true,
    });
    expect(invalidated.state).toBe("Invalidated");
    expect(invalidated.current.currentHealth).toBe(0);
  });

  it("populates current trust, validation, risk, momentum and domain healths", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({
      snapshot,
      factors: {
        momentum: 77,
        trend: 80,
        volume: 70,
        relativeStrength: 74,
        fundamentalStrength: 81,
        valuation: 79,
        sectorLeadership: 73,
        marketRegime: 68,
        institutionalActivity: 71,
        volatility: 66,
        risk: 58,
        currentTrust: 85,
        currentValidation: 83,
      },
    });
    expect(health.current.currentTrust).toBe(85);
    expect(health.current.currentValidation).toBe(83);
    expect(health.current.currentRisk).toBe(58);
    expect(health.current.currentMomentum).toBe(77);
    expect(health.current.currentTechnicalHealth).not.toBeNull();
    expect(health.current.currentFundamentalHealth).not.toBeNull();
    expect(health.current.currentSectorHealth).toBe(73);
    expect(health.current.currentMarketHealth).not.toBeNull();
  });
});

describe("ConvictionDriftEngine", () => {
  it("calculates original conviction → current health drift with explanations", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({
      snapshot,
      factors: {
        momentum: 70,
        sectorLeadership: 64,
        relativeStrength: 66,
        marketRegime: 60,
        notes: {
          Momentum: "Momentum weakening",
          "Sector Leadership": "Sector cooled",
          "Relative Strength": "Relative strength declined",
          "Market Regime": "Broad market deteriorated",
        },
      },
    });
    expect(health.drift.originalConviction).toBe(93);
    expect(health.drift.currentHealth).toBe(health.current.currentHealth);
    expect(health.drift.drift).toBeLessThan(0);
    expect(health.drift.trend).toBe("Weakening");
    expect(health.drift.explanations.length).toBeGreaterThan(0);
    expect(health.drift.explanations.join(" ")).toMatch(
      /Momentum|Sector|Relative|market/i
    );
  });

  it("marks Improving when live factors lift health above original", () => {
    const snapshot = createRecommendationSnapshot(input("2026-07-18T09:30:11Z", "X", 70));
    const health = calculateHealth({
      snapshot,
      factors: {
        momentum: 92,
        trend: 90,
        relativeStrength: 91,
        sectorLeadership: 88,
        marketRegime: 87,
      },
    });
    expect(health.drift.trend).toBe("Improving");
    expect(health.drift.drift).toBeGreaterThan(0);
  });

  it("marks Stable when health stays near original conviction", () => {
    const snapshot = createRecommendationSnapshot(input("2026-07-18T09:30:11Z", "Y", 80));
    const health = calculateHealth({
      snapshot,
      factors: {
        momentum: 80,
        trend: 80,
        relativeStrength: 80,
        sectorLeadership: 80,
      },
    });
    expect(health.drift.trend).toBe("Stable");
  });

  it("calculateConvictionDrift compares frozen original to current health", () => {
    const drift = calculateConvictionDrift(93, 86, []);
    expect(drift).toMatchObject({
      originalConviction: 93,
      currentHealth: 86,
      drift: -7,
      trend: "Weakening",
    });
  });
});

describe("HealthFactorEngine", () => {
  it("builds all supported health factors", () => {
    const snapshot = createRecommendation(input());
    calculateHealthForRecommendation(snapshot.recommendationId, {
      trend: 80,
      momentum: 70,
      volume: 65,
      relativeStrength: 72,
      sectorLeadership: 68,
      fundamentalStrength: 77,
      valuation: 74,
      institutionalActivity: 71,
      marketRegime: 66,
      volatility: 60,
      risk: 55,
    });
    const factors = getHealthFactors(snapshot.recommendationId);
    expect(factors?.map((factor) => factor.key)).toEqual([
      "Trend",
      "Momentum",
      "Volume",
      "Relative Strength",
      "Sector Leadership",
      "Fundamental Strength",
      "Valuation",
      "Institutional Activity",
      "Market Regime",
      "Volatility",
      "Risk",
    ]);
  });

  it("returns no scored factors empty presentation when inputs are absent", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({ snapshot });
    const detail = presentRecommendationHealthDetail(health);
    expect(detail.empty).toBe(true);
    expect(detail.emptyMessage).toBe("No Health Factors");
  });
});

describe("Health explanations", () => {
  it("generates improved, declined, still valid, risks, drivers and killers", () => {
    const snapshot = createRecommendation(input());
    calculateHealthForRecommendation(snapshot.recommendationId, {
      momentum: 60,
      trend: 88,
      relativeStrength: 58,
      sectorLeadership: 55,
      marketRegime: 50,
      risk: 40,
      notes: {
        Trend: "Trend still intact",
        Momentum: "Momentum weakening",
      },
    });
    const explanation = getHealthExplanation(snapshot.recommendationId);
    expect(explanation?.healthImprovedBecause.length).toBeGreaterThan(0);
    expect(explanation?.healthDeclinedBecause.length).toBeGreaterThan(0);
    expect(explanation?.stillValidBecause.length).toBeGreaterThan(0);
    expect(explanation?.majorRisks.length).toBeGreaterThan(0);
    expect(explanation?.confidenceDrivers.length).toBeGreaterThan(0);
    expect(explanation?.confidenceKillers.length).toBeGreaterThan(0);
  });
});

describe("Health presentation and surface wiring", () => {
  it("provides required empty states", () => {
    expect(RECOMMENDATION_HEALTH_EMPTY).toEqual({
      healthPending: "Health Pending",
      awaitingUpdate: "Awaiting Update",
      noHealthFactors: "No Health Factors",
    });
    expect(presentRecommendationHealthCard(undefined).emptyMessage).toBe(
      "Health Pending"
    );
    expect(presentRecommendationHealthDetail(undefined).emptyMessage).toBe(
      "Awaiting Update"
    );
  });

  it("presents recommendation card with original conviction, current health, trend and badges", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({
      snapshot,
      factors: { momentum: 70, trend: 72, relativeStrength: 68, sectorLeadership: 65 },
    });
    const card = presentRecommendationHealthCard(health);
    expect(card.originalConviction).toBe(93);
    expect(card.currentHealth).toBe(health.current.currentHealth);
    expect(card.trend).toBe("Weakening");
    expect(card.statusBadge).toBe("Weakening");
    expect(card.healthBadge).toBe(health.state);
    expect(card.empty).toBe(false);
  });

  it("wires health into Dashboard, Company, Research, Center, Portfolio, Watchlists and Replay", () => {
    const snapshot = createRecommendation(input("2026-07-18T09:30:11Z", "INFY"));
    calculateHealthForRecommendation(snapshot.recommendationId, {
      momentum: 75,
      trend: 78,
    });

    expect(wireHealthDashboard().surface).toBe("dashboard");
    expect(wireHealthCompany("INFY").cards[0]?.symbol).toBe("INFY");
    expect(wireHealthResearch().empty).toBe(false);
    expect(wireHealthRecommendationCenter().cards).toHaveLength(1);
    expect(wireHealthPortfolio(["INFY"]).cards).toHaveLength(1);
    expect(wireHealthWatchlists(["INFY"]).cards).toHaveLength(1);

    const replay = wireHealthReplay(snapshot.recommendationId);
    expect(replay.surface).toBe("replay");
    expect(replay.card.originalConviction).toBe(93);
    expect(replay.detail.explanation).not.toBeNull();
  });

  it("presentRecommendationHealthForSurface returns Health Pending when empty", () => {
    expect(
      presentRecommendationHealthForSurface("dashboard", []).emptyMessage
    ).toBe("Health Pending");
  });
});

describe("Public API aliases", () => {
  it("exposes getRecommendationHealth, calculateHealth, calculateConvictionDrift, getHealthFactors, getHealthExplanation", () => {
    const snapshot = createRecommendation(input("2026-07-18T09:31:00Z", "RELIANCE"));
    const assessed = calculateHealth({
      snapshot,
      factors: { momentum: 70, trend: 71 },
    });
    calculateHealthForRecommendation(snapshot.recommendationId, {
      momentum: 70,
      trend: 71,
    });

    expect(getRecommendationHealth(snapshot.recommendationId)?.current.currentHealth).toBe(
      assessed.current.currentHealth
    );
    expect(calculateConvictionDrift(93, 86).drift).toBe(-7);
    expect(getHealthFactors(snapshot.recommendationId)?.length).toBe(11);
    expect(getHealthExplanation(snapshot.recommendationId)?.confidenceDrivers).toBeDefined();
  });

  it("does not mutate original snapshot fields after repeated health updates", () => {
    const snapshot = createRecommendation(input());
    const first = calculateHealthForRecommendation(snapshot.recommendationId, {
      momentum: 80,
    });
    const second = calculateHealthForRecommendation(snapshot.recommendationId, {
      momentum: 55,
      marketRegime: 50,
    });
    expect(first.snapshot).toBe(snapshot);
    expect(second.snapshot).toBe(snapshot);
    expect(snapshot.originalConviction).toBe(93);
    expect(second.original.originalConviction).toBe(93);
    expect(second.current.currentHealth).not.toBe(first.current.currentHealth);
  });

  it("defaults current trust and validation to immutable originals when overlays are omitted", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({ snapshot, factors: { momentum: 70 } });
    expect(health.current.currentTrust).toBe(91);
    expect(health.current.currentValidation).toBe(88);
  });

  it("treats missing live factors as health equal to original conviction", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({ snapshot });
    expect(health.current.currentHealth).toBe(93);
    expect(health.drift.drift).toBe(0);
    expect(health.drift.trend).toBe("Stable");
  });

  it("surfaces Critical health for severely deteriorated factors", () => {
    const snapshot = createRecommendationSnapshot(input("2026-07-18T09:30:11Z", "Z", 85));
    const health = calculateHealth({
      snapshot,
      factors: {
        momentum: 10,
        trend: 12,
        relativeStrength: 8,
        marketRegime: 15,
        risk: 5,
      },
    });
    expect(health.state).toBe("Critical");
  });

  it("keeps Original Conviction label distinct from Current Health on the card", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({
      snapshot,
      factors: { momentum: 60, trend: 62, sectorLeadership: 58 },
    });
    const card = presentRecommendationHealthCard(health);
    expect(card.originalConviction).not.toBe(card.currentHealth);
    expect(card.originalConviction).toBe(93);
  });

  it("explains what remained unchanged via stillValidBecause", () => {
    const snapshot = createRecommendationSnapshot(input());
    const health = calculateHealth({
      snapshot,
      factors: { trend: 90, momentum: 55 },
    });
    expect(health.explanation.stillValidBecause.join(" ")).toMatch(
      /Trend above 50 EMA|Trend remains supportive|Sector Leadership/
    );
  });

  it("records Neutral state for mid-range health", () => {
    const snapshot = createRecommendationSnapshot(input("2026-07-18T09:30:11Z", "N", 70));
    const health = calculateHealth({
      snapshot,
      factors: { momentum: 55, trend: 58, relativeStrength: 52, marketRegime: 54 },
    });
    expect(["Neutral", "Weak", "Healthy"]).toContain(health.state);
  });

  it("getRecommendationHealth returns undefined for unknown ids", () => {
    expect(getRecommendationHealth("REC-MISSING")).toBeUndefined();
    expect(getHealthFactors("REC-MISSING")).toBeUndefined();
    expect(getHealthExplanation("REC-MISSING")).toBeUndefined();
  });
});
