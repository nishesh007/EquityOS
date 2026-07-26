/**
 * Dataset provider registry — architecture only.
 * No live historical providers in Sprint 11B.1.
 */

import type {
  HistoricalDatasetProvider,
  HistoricalDatasetRegistry,
} from "@/lib/backtesting/dataset/types";

export class InMemoryDatasetRegistry implements HistoricalDatasetRegistry {
  private readonly providers = new Map<string, HistoricalDatasetProvider>();

  register(provider: HistoricalDatasetProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): HistoricalDatasetProvider | null {
    return this.providers.get(id) ?? null;
  }

  list(): readonly HistoricalDatasetProvider[] {
    return [...this.providers.values()];
  }
}

/** Process-local default registry for future wiring. */
export const historicalDatasetRegistry = new InMemoryDatasetRegistry();
