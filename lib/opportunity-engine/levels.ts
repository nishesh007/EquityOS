import type { OpportunityCategory } from "@/lib/opportunity-engine/types";

export interface TradeLevels {
  entryZone: { low: number; high: number };
  stopLoss: number;
  target1: number;
  target2: number;
  riskReward: number;
  timeHorizon?: string;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function buildTradeLevels(
  price: number,
  side: "Long" | "Short",
  category: OpportunityCategory,
  atrValue: number | null = null
): TradeLevels {
  if (price <= 0) {
    return {
      entryZone: { low: 0, high: 0 },
      stopLoss: 0,
      target1: 0,
      target2: 0,
      riskReward: 0,
    };
  }

  const atrStop = atrValue !== null && atrValue > 0 ? atrValue : null;

  switch (category) {
    case "intraday": {
      const stopDistance = atrStop ?? price * 0.01;
      const stopLoss =
        side === "Long" ? round2(price - stopDistance) : round2(price + stopDistance);
      const target1 =
        side === "Long" ? round2(price + stopDistance * 1.5) : round2(price - stopDistance * 1.5);
      const target2 =
        side === "Long" ? round2(price + stopDistance * 2) : round2(price - stopDistance * 2);
      const risk = Math.abs(price - stopLoss);
      const reward = Math.abs(target2 - price);
      return {
        entryZone: { low: round2(price * 0.998), high: round2(price * 1.002) },
        stopLoss,
        target1,
        target2,
        riskReward: risk > 0 ? round2(reward / risk) : 0,
        timeHorizon: "1–4 hours",
      };
    }
    case "swing": {
      const stopLoss =
        side === "Long" ? round2(price * 0.96) : round2(price * 1.04);
      const target1 =
        side === "Long" ? round2(price * 1.05) : round2(price * 0.95);
      const target2 =
        side === "Long" ? round2(price * 1.1) : round2(price * 0.9);
      const risk = Math.abs(price - stopLoss);
      const reward = Math.abs(target2 - price);
      return {
        entryZone: { low: round2(price * 0.985), high: round2(price * 1.015) },
        stopLoss,
        target1,
        target2,
        riskReward: risk > 0 ? round2(reward / risk) : 0,
        timeHorizon: "2–8 weeks",
      };
    }
    case "breakout": {
      const stopLoss =
        side === "Long" ? round2(price * 0.97) : round2(price * 1.03);
      const target1 =
        side === "Long" ? round2(price * 1.06) : round2(price * 0.94);
      const target2 =
        side === "Long" ? round2(price * 1.12) : round2(price * 0.88);
      const risk = Math.abs(price - stopLoss);
      const reward = Math.abs(target2 - price);
      return {
        entryZone: { low: round2(price * 0.995), high: round2(price * 1.01) },
        stopLoss,
        target1,
        target2,
        riskReward: risk > 0 ? round2(reward / risk) : 0,
        timeHorizon: "3–10 days",
      };
    }
    case "momentum": {
      const stopLoss =
        side === "Long" ? round2(price * 0.965) : round2(price * 1.035);
      const target1 =
        side === "Long" ? round2(price * 1.04) : round2(price * 0.96);
      const target2 =
        side === "Long" ? round2(price * 1.08) : round2(price * 0.92);
      const risk = Math.abs(price - stopLoss);
      const reward = Math.abs(target2 - price);
      return {
        entryZone: { low: round2(price * 0.99), high: round2(price * 1.01) },
        stopLoss,
        target1,
        target2,
        riskReward: risk > 0 ? round2(reward / risk) : 0,
        timeHorizon: "1–3 weeks",
      };
    }
    case "relative_volume": {
      const stopLoss =
        side === "Long" ? round2(price * 0.985) : round2(price * 1.015);
      const target1 =
        side === "Long" ? round2(price * 1.025) : round2(price * 0.975);
      const target2 =
        side === "Long" ? round2(price * 1.04) : round2(price * 0.96);
      const risk = Math.abs(price - stopLoss);
      const reward = Math.abs(target2 - price);
      return {
        entryZone: { low: round2(price * 0.997), high: round2(price * 1.003) },
        stopLoss,
        target1,
        target2,
        riskReward: risk > 0 ? round2(reward / risk) : 0,
        timeHorizon: "Intraday–2 days",
      };
    }
    case "mean_reversion": {
      const stopLoss =
        side === "Long" ? round2(price * 0.975) : round2(price * 1.025);
      const target1 =
        side === "Long" ? round2(price * 1.02) : round2(price * 0.98);
      const target2 =
        side === "Long" ? round2(price * 1.035) : round2(price * 0.965);
      const risk = Math.abs(price - stopLoss);
      const reward = Math.abs(target2 - price);
      return {
        entryZone: { low: round2(price * 0.992), high: round2(price * 1.008) },
        stopLoss,
        target1,
        target2,
        riskReward: risk > 0 ? round2(reward / risk) : 0,
        timeHorizon: "2–5 days",
      };
    }
    case "ai_high_conviction": {
      const stopLoss =
        side === "Long" ? round2(price * 0.95) : round2(price * 1.05);
      const target1 =
        side === "Long" ? round2(price * 1.08) : round2(price * 0.92);
      const target2 =
        side === "Long" ? round2(price * 1.15) : round2(price * 0.85);
      const risk = Math.abs(price - stopLoss);
      const reward = Math.abs(target2 - price);
      return {
        entryZone: { low: round2(price * 0.98), high: round2(price * 1.02) },
        stopLoss,
        target1,
        target2,
        riskReward: risk > 0 ? round2(reward / risk) : 0,
        timeHorizon: "2–12 weeks",
      };
    }
  }
}
