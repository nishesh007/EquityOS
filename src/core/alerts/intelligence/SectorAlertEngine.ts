/**
 * Sector Alert Engine — Sprint 9C.R4.
 */

import { detectSectorSignals, MarketTrendEngine } from "./MarketTrendEngine";
import {
  SIGNAL_ALERT_EMPTY,
  type SectorAlertSnapshot,
} from "./AlertSignalModels";
import {
  emptySignalIntelBatch,
  emitSignalDecisionsAsBatch,
  type SignalIntelBatch,
} from "./emitSignalIntelBatch";

export interface SectorAlertInput {
  sectors: SectorAlertSnapshot[];
  now?: Date;
}

export class SectorAlertEngine {
  private readonly trends = new MarketTrendEngine();

  generate(input: SectorAlertInput): SignalIntelBatch {
    const now = input.now ?? new Date();
    if (!input.sectors.length) {
      return emptySignalIntelBatch(SIGNAL_ALERT_EMPTY.noSector);
    }
    const decisions = this.trends.detectSectors(input.sectors);
    return emitSignalDecisionsAsBatch(
      decisions,
      SIGNAL_ALERT_EMPTY.noSector,
      now
    );
  }
}

let singleton: SectorAlertEngine | null = null;

export function getSectorAlertEngine(): SectorAlertEngine {
  if (!singleton) singleton = new SectorAlertEngine();
  return singleton;
}

export function resetSectorAlertEngine(): void {
  singleton = null;
}

/** Public API — generateSectorAlerts() */
export function generateSectorAlerts(input: SectorAlertInput): SignalIntelBatch {
  try {
    return getSectorAlertEngine().generate(input);
  } catch {
    return emptySignalIntelBatch(SIGNAL_ALERT_EMPTY.awaitingAnalysis);
  }
}

export { detectSectorSignals };
