/**
 * Alert Evidence Engine — evidence panel buckets (Sprint 9C.R6).
 */

import type { InstitutionalAlert } from "../AlertModels";
import { safeAlertText } from "../AlertModels";
import {
  DECISION_SUPPORT_EMPTY,
  emptyEvidenceResult,
  type AlertEvidenceItem,
  type AlertEvidenceResult,
} from "./AlertDecisionModels";

function item(source: string, label: string, detail: string): AlertEvidenceItem {
  return {
    source: safeAlertText(source, "Signal"),
    label: safeAlertText(label, "Evidence"),
    detail: safeAlertText(detail, "—"),
  };
}

export function collectAlertEvidence(
  alert: InstitutionalAlert
): AlertEvidenceResult {
  const result = emptyEvidenceResult();
  result.empty = false;
  result.emptyMessage = DECISION_SUPPORT_EMPTY.noEvidence;

  const extras = alert.metadata.extras;
  const event = alert.metadata.eventType.toLowerCase();
  const pushEvidence = (bucket: AlertEvidenceItem[], src: string, label: string, detail: string) => {
    if (safeAlertText(detail, "")) bucket.push(item(src, label, detail));
  };

  for (const e of alert.evidence) {
    const detail = safeAlertText(e, "");
    if (!detail) continue;
    if (detail.startsWith("rsi:") || detail.startsWith("macd") || detail.startsWith("ema") || detail.startsWith("atr")) {
      pushEvidence(result.technicalSignals, "Technical", detail.split(":")[0] ?? "Indicator", detail);
      pushEvidence(result.indicators, "Indicator", detail.split(":")[0] ?? "Metric", detail);
    } else if (detail.startsWith("pe:") || detail.startsWith("roe") || detail.startsWith("revenue") || detail.startsWith("eps")) {
      pushEvidence(result.fundamentals, "Fundamental", detail.split(":")[0] ?? "Metric", detail);
    } else if (event.includes("earnings") || detail.includes("resultDate") || detail.includes("guidance")) {
      pushEvidence(result.earnings, "Earnings", "Earnings signal", detail);
    } else if (alert.category === "News" || event.includes("news")) {
      pushEvidence(result.news, "News", "News evidence", detail);
    } else if (alert.category === "Corporate Action") {
      pushEvidence(result.corporateActions, "Corporate Action", "Action detail", detail);
    } else if (event.startsWith("sector_") || extras.sector) {
      pushEvidence(result.sectorSignals, "Sector", "Sector signal", detail);
    } else if (alert.category === "Validation" || alert.sourceEngine === "Validation") {
      pushEvidence(result.validationEvidence, "Validation", "Validation", detail);
    } else if (alert.category === "Trust" || alert.sourceEngine === "Trust") {
      pushEvidence(result.trustEvidence, "Trust", "Trust", detail);
    } else {
      pushEvidence(result.indicators, alert.sourceEngine, alert.category, detail);
    }
  }

  // Always surface core context as fallback evidence
  if (
    result.indicators.length === 0 &&
    result.technicalSignals.length === 0 &&
    result.fundamentals.length === 0 &&
    result.earnings.length === 0 &&
    result.news.length === 0 &&
    result.corporateActions.length === 0
  ) {
    pushEvidence(
      result.indicators,
      alert.sourceEngine,
      alert.category,
      alert.reason
    );
  }

  if (extras.sector) {
    pushEvidence(result.sectorSignals, "Sector", "Sector", String(extras.sector));
  }
  if (extras.validationScore) {
    pushEvidence(result.validationEvidence, "Validation", "Score", String(extras.validationScore));
  }
  if (extras.trustScore) {
    pushEvidence(result.trustEvidence, "Trust", "Score", String(extras.trustScore));
  }

  const total =
    result.indicators.length +
    result.fundamentals.length +
    result.earnings.length +
    result.news.length +
    result.corporateActions.length +
    result.technicalSignals.length +
    result.sectorSignals.length +
    result.validationEvidence.length +
    result.trustEvidence.length;

  if (total === 0) {
    return emptyEvidenceResult();
  }
  return result;
}

export class AlertEvidenceEngine {
  collect(alert: InstitutionalAlert): AlertEvidenceResult {
    return collectAlertEvidence(alert);
  }
}
