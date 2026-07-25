/**
 * Preparation Checklist Engine (Sprint 10D.4).
 */

import { getEventCategory } from "@/constants/eventTypes";
import type { EventIntelligenceEvent } from "@/types/event";
import type {
  PreparationChecklist,
  PreparationChecklistItem,
} from "@/types/eventIntelligence";

function item(
  id: string,
  label: string,
  category: string,
  priority: PreparationChecklistItem["priority"]
): PreparationChecklistItem {
  return { id, label, category, priority };
}

export function computePreparationChecklist(
  event: EventIntelligenceEvent
): PreparationChecklist {
  const category = getEventCategory(event.eventType);
  let title = "Event Preparation Checklist";
  let items: PreparationChecklistItem[] = [];

  if (
    category === "central_bank" ||
    event.eventType === "repo_rate" ||
    event.eventType === "crr"
  ) {
    title = "Before Policy Decision";
    items = [
      item("inflation", "Review latest CPI / core CPI trajectory", "Inflation", "critical"),
      item("liquidity", "Check banking system liquidity & SDF/corridor", "Liquidity", "high"),
      item("bond_yield", "Mark 10Y G-Sec and OIS curve levels", "Rates", "critical"),
      item("bank_commentary", "Read major bank NIC / management commentary", "Banks", "high"),
      item("currency", "Monitor USDINR spot and NDF", "Currency", "high"),
      item("oil", "Note Brent move vs prior MPC", "Commodities", "medium"),
      item("global_rates", "Fed funds futures / US 2Y context", "Global Rates", "high"),
    ];
  } else if (event.eventType === "cpi" || event.eventType === "core_cpi" || event.eventType === "wpi") {
    title = "Before Inflation Print";
    items = [
      item("food", "Food & vegetable price pulse", "Inflation", "critical"),
      item("fuel", "Fuel / LPG pass-through", "Inflation", "high"),
      item("core", "Core goods vs services split", "Inflation", "critical"),
      item("rbi_path", "Implied rate-cut odds vs print", "Policy", "high"),
      item("real_rates", "Real rate vs RBI target band", "Rates", "medium"),
    ];
  } else if (
    event.eventType === "gdp" ||
    event.eventType === "quarterly_gdp" ||
    event.eventType === "iip" ||
    event.eventType === "pmi" ||
    event.eventType === "pmi_services"
  ) {
    title = "Before Growth Release";
    items = [
      item("gfcf", "Capex / GFCF trend", "Growth", "high"),
      item("consumption", "Private consumption momentum", "Growth", "high"),
      item("exports", "Export / manufacturing orders", "Trade", "medium"),
      item("credit", "Bank credit growth", "Banks", "medium"),
      item("cyclicals", "Capital goods & infra earnings pulse", "Sectors", "high"),
    ];
  } else if (category === "results" || event.eventType === "conference_call") {
    title = "Before Earnings";
    items = [
      item("revenue", "Revenue vs consensus", "P&L", "critical"),
      item("eps", "EPS / PAT vs street", "P&L", "critical"),
      item("margins", "Gross / EBITDA margin bridge", "P&L", "high"),
      item("guidance", "Management guidance & outlook", "Guidance", "critical"),
      item("order_book", "Order book / deal wins / volume trends", "Operations", "high"),
      item("peers", "Peer prints already released", "Relative", "medium"),
    ];
  } else if (event.eventType === "dividend") {
    title = "Before Dividend";
    items = [
      item("yield", "Gross yield vs sector median", "Income", "critical"),
      item("payout", "Payout ratio sustainability", "Income", "high"),
      item("cash_flow", "FCF coverage of dividend", "Cash Flow", "critical"),
      item("history", "Dividend history & growth", "History", "medium"),
      item("ex_date", "Ex-date / record-date positioning", "Calendar", "high"),
    ];
  } else if (event.eventType === "bonus" || event.eventType === "stock_split") {
    title = "Before Bonus / Split";
    items = [
      item("ratio", "Confirm ratio & effective date", "Terms", "critical"),
      item("liquidity", "Expected float / liquidity change", "Market", "high"),
      item("optics", "Price optics vs fundamental change", "Valuation", "medium"),
    ];
  } else if (event.eventType === "buyback" || event.eventType === "open_offer") {
    title = "Before Buyback / Offer";
    items = [
      item("price", "Offer price vs VWAP / fair value", "Terms", "critical"),
      item("size", "Offer size & acceptance odds", "Terms", "high"),
      item("timeline", "Open / close window", "Calendar", "high"),
      item("balance_sheet", "Cash & leverage post-deal", "Balance Sheet", "medium"),
    ];
  } else if (event.eventType === "fiscal_budget") {
    title = "Before Union Budget";
    items = [
      item("deficit", "Fiscal deficit path", "Fiscal", "critical"),
      item("capex", "Capex allocation vs prior year", "Fiscal", "critical"),
      item("tax", "Direct / indirect tax changes", "Tax", "high"),
      item("sector_schemes", "Sector schemes (infra, defence, rural)", "Sectors", "high"),
      item("borrowing", "G-Sec supply implication", "Rates", "high"),
    ];
  } else if (event.eventType === "msci_review" || event.eventType === "ftse_review") {
    title = "Before Index Review";
    items = [
      item("inclusions", "Likely inclusions / exclusions", "Flows", "critical"),
      item("weights", "Weight change & ADV coverage", "Flows", "high"),
      item("effective", "Effective / implementation date", "Calendar", "critical"),
      item("passive", "Passive AUM estimate", "Flows", "medium"),
    ];
  } else {
    title = "Event Preparation Checklist";
    items = [
      item("context", "Confirm release time and authority", "Basics", "high"),
      item("consensus", "Mark consensus / street expectations", "Expectations", "high"),
      item("history", "Review last 3–5 historical reactions", "History", "medium"),
      item("portfolio", "Map portfolio / watchlist exposure", "Portfolio", "critical"),
      item("risk", "Define invalidation / risk levels", "Risk", "high"),
    ];
  }

  return { title, items };
}

export const preparationChecklistEngine = {
  compute: computePreparationChecklist,
};
