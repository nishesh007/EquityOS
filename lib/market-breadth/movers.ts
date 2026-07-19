import type { MarketMover } from "@/types";

export function selectDirectionalMovers(
  movers: MarketMover[],
  direction: "gainers" | "losers",
  limit = 5
): MarketMover[] {
  return movers
    .filter((mover) =>
      direction === "gainers"
        ? mover.changePercent > 0
        : mover.changePercent < 0
    )
    .sort((a, b) =>
      direction === "gainers"
        ? b.changePercent - a.changePercent
        : a.changePercent - b.changePercent
    )
    .slice(0, limit);
}
