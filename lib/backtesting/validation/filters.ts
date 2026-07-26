import type {
  MarketCapBucket,
  ValidationFilterState,
  ValidationTradeRecord,
} from "@/lib/backtesting/validation/types";

export function createEmptyValidationFilters(
  partial?: Partial<ValidationFilterState>
): ValidationFilterState {
  return {
    strategies: [],
    sectors: [],
    symbols: [],
    marketRegimes: [],
    universes: [],
    marketCaps: [],
    ...partial,
  };
}

export function filterValidationTrades(
  trades: readonly ValidationTradeRecord[],
  filters: ValidationFilterState
): ValidationTradeRecord[] {
  return trades.filter((trade) => {
    if (
      filters.strategies.length &&
      !filters.strategies.includes(trade.strategyId)
    ) {
      return false;
    }
    if (filters.sectors.length && !filters.sectors.includes(trade.sector)) {
      return false;
    }
    if (filters.symbols.length && !filters.symbols.includes(trade.symbol)) {
      return false;
    }
    if (
      filters.marketRegimes.length &&
      !filters.marketRegimes.includes(trade.marketRegime)
    ) {
      return false;
    }
    if (
      filters.universes.length &&
      !filters.universes.includes(trade.universeLabel)
    ) {
      return false;
    }
    if (
      filters.marketCaps.length &&
      !filters.marketCaps.includes(trade.marketCap)
    ) {
      return false;
    }
    if (filters.dateStart) {
      const start = new Date(filters.dateStart).getTime();
      if (new Date(trade.entryAt).getTime() < start) return false;
    }
    if (filters.dateEnd) {
      const end = new Date(filters.dateEnd).getTime();
      const exit = trade.exitAt ?? trade.entryAt;
      if (new Date(exit).getTime() > end) return false;
    }
    return true;
  });
}

export function uniqueOptions(
  trades: readonly ValidationTradeRecord[]
): {
  strategies: { id: string; label: string }[];
  sectors: { id: string; label: string }[];
  symbols: { id: string; label: string }[];
  marketRegimes: { id: string; label: string }[];
  universes: { id: string; label: string }[];
  marketCaps: { id: MarketCapBucket; label: string }[];
} {
  const strategyMap = new Map<string, string>();
  const sectors = new Set<string>();
  const symbols = new Set<string>();
  const regimes = new Set<string>();
  const universes = new Set<string>();
  const caps = new Set<MarketCapBucket>();

  for (const trade of trades) {
    strategyMap.set(trade.strategyId, trade.strategyLabel);
    sectors.add(trade.sector);
    symbols.add(trade.symbol);
    regimes.add(trade.marketRegime);
    universes.add(trade.universeLabel);
    caps.add(trade.marketCap);
  }

  return {
    strategies: [...strategyMap.entries()].map(([id, label]) => ({ id, label })),
    sectors: [...sectors].sort().map((id) => ({ id, label: id })),
    symbols: [...symbols].sort().map((id) => ({ id, label: id })),
    marketRegimes: [...regimes].sort().map((id) => ({ id, label: id })),
    universes: [...universes].sort().map((id) => ({ id, label: id })),
    marketCaps: [...caps].map((id) => ({
      id,
      label: id === "unknown" ? "Unknown" : id[0].toUpperCase() + id.slice(1),
    })),
  };
}
