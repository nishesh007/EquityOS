/**
 * Market Alert Engine — Sprint 9C.R4.
 */

import { detectMarketSignals, MarketTrendEngine } from "./MarketTrendEngine";
import {
  SIGNAL_ALERT_EMPTY,
  type MarketAlertSnapshot,
} from "./AlertSignalModels";
import {
  emptySignalIntelBatch,
  emitSignalDecisionsAsBatch,
  type SignalIntelBatch,
} from "./emitSignalIntelBatch";

export interface MarketAlertInput {
  markets: MarketAlertSnapshot[];
  now?: Date;
}

export class MarketAlertEngine {
  private readonly trends = new MarketTrendEngine();

  generate(input: MarketAlertInput): SignalIntelBatch {
    const now = input.now ?? new Date();
    if (!input.markets.length) {
      return emptySignalIntelBatch(SIGNAL_ALERT_EMPTY.noMarket);
    }
    const decisions = this.trends.detectMarket(input.markets);
    return emitSignalDecisionsAsBatch(
      decisions,
      SIGNAL_ALERT_EMPTY.noMarket,
      now
    );
  }
}

let singleton: MarketAlertEngine | null = null;

export function getMarketAlertEngine(): MarketAlertEngine {
  if (!singleton) singleton = new MarketAlertEngine();
  return singleton;
}

export function resetMarketAlertEngine(): void {
  singleton = null;
}

/** Public API — generateMarketAlerts() */
export function generateMarketAlerts(input: MarketAlertInput): SignalIntelBatch {
  try {
    return getMarketAlertEngine().generate(input);
  } catch {
    return emptySignalIntelBatch(SIGNAL_ALERT_EMPTY.awaitingAnalysis);
  }
}

export { detectMarketSignals };
