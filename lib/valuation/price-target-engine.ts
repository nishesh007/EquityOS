/**
 * Price Target Engine — institutional target ladder and entry zones.
 */

import { clamp, round } from "@/lib/engine/utils";
import { isValidMarketPrice } from "@/lib/utils";
import type { PriceTargetInput, PriceTargetResult } from "@/lib/valuation/types";

export function computePriceTargets(input: PriceTargetInput): PriceTargetResult {
  const {
    price,
    intrinsicValue,
    fairValue,
    technicalScore,
    support,
    resistance,
    marginOfSafety,
    upsidePercent,
  } = input;

  if (!isValidMarketPrice(price)) {
    return emptyTargets();
  }

  const safeSupport = isValidMarketPrice(support) ? support : round(price * 0.94);
  const safeResistance = isValidMarketPrice(resistance) ? resistance : round(price * 1.06);
  const fair = isValidMarketPrice(fairValue) ? fairValue : (isValidMarketPrice(intrinsicValue) ? intrinsicValue : 0);

  const idealLow = isValidMarketPrice(input.swingEntryLow) ? input.swingEntryLow! : round(safeSupport * 1.01);
  const idealHigh = isValidMarketPrice(input.swingEntryHigh) ? input.swingEntryHigh! : round(price * 0.995);
  const stopLoss = isValidMarketPrice(input.swingStopLoss) ? input.swingStopLoss! : round(safeSupport * 0.97);

  const upside = Number.isFinite(upsidePercent) ? upsidePercent : 0;
  const target1 = isValidMarketPrice(input.swingTarget1)
    ? input.swingTarget1!
    : round(price * (1 + Math.max(0.06, upside * 0.25 / 100)));
  const target2 = fair > 0 ? round(fair) : round(price * 1.1);
  const target3 = isValidMarketPrice(input.swingTarget3)
    ? input.swingTarget3!
    : round(target2 * (1 + Math.max(0.08, upside * 0.15 / 100)));

  const riskToStop = Math.max(price - stopLoss, price * 0.04);
  const rewardToTarget = Math.max(target2 - price, 0);
  const riskReward = riskToStop > 0 ? round(rewardToTarget / riskToStop, 1) : 0;

  const capitalAllocation = clamp(
    input.swingCapitalAllocation ??
      (marginOfSafety > 15 ? 8 : marginOfSafety > 5 ? 6 : technicalScore >= 60 ? 5 : 3)
  );

  const positionSize = input.swingPositionSize && input.swingPositionSize > 0
    ? input.swingPositionSize
    : Math.max(1, Math.floor((capitalAllocation / 100) * 1_000_000 / price));

  const longTermBuy = fair > 0
    ? round(fair * (marginOfSafety > 10 ? 0.92 : 0.95))
    : round(price * 0.92);

  return {
    target1,
    target2,
    target3,
    stopLoss,
    trailingStop: round(target1 * 0.96),
    invalidationLevel: round(stopLoss * 0.98),
    idealBuyZone: `₹${idealLow.toLocaleString("en-IN")} – ₹${idealHigh.toLocaleString("en-IN")}`,
    breakoutBuy: safeResistance,
    swingBuy: `₹${idealLow.toLocaleString("en-IN")} – ₹${idealHigh.toLocaleString("en-IN")}`,
    longTermBuy: `Below ₹${longTermBuy.toLocaleString("en-IN")}`,
    positionSize,
    capitalAllocationPercent: capitalAllocation,
    riskReward: Number.isFinite(riskReward) ? clamp(riskReward, 0.5, 8) : 0,
  };
}

function emptyTargets(): PriceTargetResult {
  return {
    target1: 0,
    target2: 0,
    target3: 0,
    stopLoss: 0,
    trailingStop: 0,
    invalidationLevel: 0,
    idealBuyZone: "N/A",
    breakoutBuy: 0,
    swingBuy: "N/A",
    longTermBuy: "N/A",
    positionSize: 0,
    capitalAllocationPercent: 0,
    riskReward: 0,
  };
}
