/**
 * Technical Alert Engine — Sprint 9C.R4.
 */

import { detectTechnicalSignals, TechnicalSignalEngine } from "./TechnicalSignalEngine";
import {
  SIGNAL_ALERT_EMPTY,
  type TechnicalAlertSnapshot,
} from "./AlertSignalModels";
import {
  emptySignalIntelBatch,
  emitSignalDecisionsAsBatch,
  type SignalIntelBatch,
} from "./emitSignalIntelBatch";

export interface TechnicalAlertInput {
  symbols: TechnicalAlertSnapshot[];
  now?: Date;
}

export class TechnicalAlertEngine {
  private readonly signals = new TechnicalSignalEngine();

  generate(input: TechnicalAlertInput): SignalIntelBatch {
    const now = input.now ?? new Date();
    if (!input.symbols.length) {
      return emptySignalIntelBatch(SIGNAL_ALERT_EMPTY.noTechnical);
    }
    const decisions = this.signals.detect(input.symbols);
    return emitSignalDecisionsAsBatch(
      decisions,
      SIGNAL_ALERT_EMPTY.noTechnical,
      now
    );
  }
}

let singleton: TechnicalAlertEngine | null = null;

export function getTechnicalAlertEngine(): TechnicalAlertEngine {
  if (!singleton) singleton = new TechnicalAlertEngine();
  return singleton;
}

export function resetTechnicalAlertEngine(): void {
  singleton = null;
}

/** Public API — generateTechnicalAlerts() */
export function generateTechnicalAlerts(
  input: TechnicalAlertInput
): SignalIntelBatch {
  try {
    return getTechnicalAlertEngine().generate(input);
  } catch {
    return emptySignalIntelBatch(SIGNAL_ALERT_EMPTY.awaitingAnalysis);
  }
}

export { detectTechnicalSignals };
