/**
 * Corporate Actions models (Sprint 10D.2).
 * Discriminated detail payloads for dividend, bonus, split, buyback, rights, etc.
 */

import type { EventIntelligenceEvent, EventType } from "@/types/event";

export type CorporateActionKind =
  | "dividend"
  | "bonus"
  | "stock_split"
  | "rights_issue"
  | "buyback"
  | "agm"
  | "egm"
  | "delisting"
  | "listing"
  | "merger"
  | "demerger"
  | "open_offer";

export type DividendFrequency =
  | "interim"
  | "final"
  | "special"
  | "annual"
  | "quarterly";

export interface DividendDetails {
  kind: "dividend";
  amountPerShare: number;
  yieldPct: number | null;
  exDate: string;
  recordDate: string;
  paymentDate: string | null;
  frequency: DividendFrequency;
}

export interface BonusDetails {
  kind: "bonus";
  ratio: string;
  effectiveDate: string;
}

export interface SplitDetails {
  kind: "stock_split";
  ratio: string;
  faceValueBefore: number;
  faceValueAfter: number;
  effectiveDate: string;
}

export interface BuybackDetails {
  kind: "buyback";
  pricePerShare: number;
  offerSizeCr: number;
  recordDate: string | null;
  openDate: string;
  closeDate: string;
}

export interface RightsIssueDetails {
  kind: "rights_issue";
  ratio: string;
  issuePrice: number;
  closingDate: string;
}

export interface MeetingDetails {
  kind: "agm" | "egm";
  venue: string | null;
  agenda: string[];
}

export interface ListingDetails {
  kind: "listing" | "delisting";
  exchangeNote: string | null;
  effectiveDate: string;
}

export interface MergerDetails {
  kind: "merger" | "demerger";
  counterparty: string | null;
  swapRatio: string | null;
  effectiveDate: string | null;
}

export interface OpenOfferDetails {
  kind: "open_offer";
  offerPrice: number;
  offerSizePct: number | null;
  openDate: string;
  closeDate: string;
}

export type CorporateActionDetails =
  | DividendDetails
  | BonusDetails
  | SplitDetails
  | BuybackDetails
  | RightsIssueDetails
  | MeetingDetails
  | ListingDetails
  | MergerDetails
  | OpenOfferDetails;

export type CorporateActionEventType = Extract<
  EventType,
  CorporateActionKind | "ipo"
>;

export interface CorporateActionEvent extends EventIntelligenceEvent {
  eventType: CorporateActionEventType;
  corporateActionDetail: CorporateActionDetails;
}

export function isCorporateActionType(type: EventType): type is CorporateActionEventType {
  return (
    type === "dividend" ||
    type === "bonus" ||
    type === "stock_split" ||
    type === "rights_issue" ||
    type === "buyback" ||
    type === "agm" ||
    type === "egm" ||
    type === "delisting" ||
    type === "listing" ||
    type === "ipo" ||
    type === "merger" ||
    type === "demerger" ||
    type === "open_offer"
  );
}
