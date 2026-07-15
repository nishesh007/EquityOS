/**
 * Fundamental Alert Engine — Sprint 9C.R4.
 */

import {
  detectFundamentalSignals,
  FundamentalSignalEngine,
} from "./FundamentalSignalEngine";
import {
  SIGNAL_ALERT_EMPTY,
  type FundamentalAlertSnapshot,
} from "./AlertSignalModels";
import {
  emptySignalIntelBatch,
  emitSignalDecisionsAsBatch,
  type SignalIntelBatch,
} from "./emitSignalIntelBatch";

export interface FundamentalAlertInput {
  symbols: FundamentalAlertSnapshot[];
  now?: Date;
}

export class FundamentalAlertEngine {
  private readonly signals = new FundamentalSignalEngine();

  generate(input: FundamentalAlertInput): SignalIntelBatch {
    const now = input.now ?? new Date();
    if (!input.symbols.length) {
      return emptySignalIntelBatch(SIGNAL_ALERT_EMPTY.noFundamental);
    }
    const decisions = this.signals.detect(input.symbols);
    return emitSignalDecisionsAsBatch(
      decisions,
      SIGNAL_ALERT_EMPTY.noFundamental,
      now
    );
  }
}

let singleton: FundamentalAlertEngine | null = null;

export function getFundamentalAlertEngine(): FundamentalAlertEngine {
  if (!singleton) singleton = new FundamentalAlertEngine();
  return singleton;
}

export function resetFundamentalAlertEngine(): void {
  singleton = null;
}

/** Public API — generateFundamentalAlerts() */
export function generateFundamentalAlerts(
  input: FundamentalAlertInput
): SignalIntelBatch {
  try {
    return getFundamentalAlertEngine().generate(input);
  } catch {
    return emptySignalIntelBatch(SIGNAL_ALERT_EMPTY.awaitingAnalysis);
  }
}

export { detectFundamentalSignals };
