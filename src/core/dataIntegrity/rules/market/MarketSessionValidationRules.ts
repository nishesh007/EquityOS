/**
 * Institutional market session validation (NSE/BSE + session phases).
 */

import type { CreateRuleInput } from "../RuleTypes";
import {
  asRows,
  configFromContext,
  isPlainObject,
  marketFail,
  marketPass,
  readString,
  readTimestamp,
  type MarketValidationConfig,
} from "./MarketDataRuleRegistry";

type SessionPhase =
  | "PRE_OPEN"
  | "REGULAR"
  | "CLOSING"
  | "AUCTION"
  | "UNKNOWN";

function minutesOfDayIST(ms: number): number {
  // Asia/Kolkata is UTC+5:30 without DST
  const ist = new Date(ms + (5 * 60 + 30) * 60_000);
  return ist.getUTCHours() * 60 + ist.getUTCMinutes();
}

function resolvePhase(
  minutes: number,
  open: number,
  close: number
): SessionPhase {
  if (minutes >= open - 15 && minutes < open) return "PRE_OPEN";
  if (minutes >= open && minutes <= close) return "REGULAR";
  if (minutes > close && minutes <= close + 15) return "CLOSING";
  if (minutes >= open - 30 && minutes < open - 15) return "AUCTION";
  return "UNKNOWN";
}

export function createMarketSessionValidationRules(
  _config: MarketValidationConfig
): CreateRuleInput[] {
  return [
    {
      id: "session.exchange_supported",
      name: "Session Exchange Supported",
      description: "Validate NSE/BSE and known exchange session context.",
      category: "CUSTOM",
      priority: "MEDIUM",
      ruleLevel: "ERROR",
      tags: ["market", "session"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "OHLC_CANDLE", "INTRADAY_CANDLE"],
      validate: (ctx) => {
        if (!isPlainObject(ctx.data) && !Array.isArray(ctx.data)) {
          return marketPass();
        }
        const exchange =
          (isPlainObject(ctx.data)
            ? readString(ctx.data, ["exchange", "venue"])
            : undefined) ??
          (typeof ctx.metadata?.exchange === "string"
            ? ctx.metadata.exchange
            : undefined);
        if (!exchange) return marketPass();
        const config = configFromContext(ctx);
        if (
          !config.knownExchanges
            .map((e) => e.toUpperCase())
            .includes(exchange.toUpperCase())
        ) {
          return marketFail({
            message: "Session exchange is not supported.",
            recommendation: "Map feed exchange code to NSE/BSE/US venues.",
            field: "exchange",
            expected: config.knownExchanges,
            actual: exchange,
          });
        }
        return marketPass();
      },
    },
    {
      id: "session.phase_valid",
      name: "Market Session Phase Valid",
      description:
        "Reject invalid session timestamps outside pre-open/regular/closing/auction.",
      category: "CUSTOM",
      priority: "HIGH",
      ruleLevel: "ERROR",
      tags: ["market", "session", "nse", "bse"],
      author: "equityos-market",
      datasetTypes: ["STOCK_QUOTE", "INTRADAY_CANDLE"],
      validate: (ctx) => {
        const config = configFromContext(ctx);
        const exchange = (
          (isPlainObject(ctx.data)
            ? readString(ctx.data, ["exchange", "venue"])
            : undefined) ??
          (typeof ctx.metadata?.exchange === "string"
            ? ctx.metadata.exchange
            : "NSE")
        ).toUpperCase();

        if (exchange !== "NSE" && exchange !== "BSE") return marketPass();

        const open =
          exchange === "BSE"
            ? config.bseRegularOpenMinutes
            : config.nseRegularOpenMinutes;
        const close =
          exchange === "BSE"
            ? config.bseRegularCloseMinutes
            : config.nseRegularCloseMinutes;

        const declaredPhase =
          (isPlainObject(ctx.data)
            ? readString(ctx.data, ["session", "sessionPhase", "phase"])
            : undefined) ??
          (typeof ctx.metadata?.session === "string"
            ? ctx.metadata.session
            : undefined);

        const rows = asRows(ctx.data);
        for (let i = 0; i < rows.length; i++) {
          const ts = readTimestamp(rows[i]);
          if (ts === null) continue;
          const mins = minutesOfDayIST(ts);
          const phase = resolvePhase(mins, open, close);
          if (phase === "UNKNOWN") {
            return marketFail({
              message: `Timestamp outside ${exchange} tradeable sessions at index ${i}.`,
              recommendation:
                "Restrict intraday quotes to pre-open, regular, closing, or auction windows.",
              path: `[${i}].timestamp`,
              expected: {
                preOpen: open - 15,
                regular: [open, close],
                closing: close + 15,
              },
              actual: { minutesOfDayIST: mins, phase },
            });
          }
          if (
            declaredPhase &&
            declaredPhase.toUpperCase().replace("-", "_") !== phase &&
            declaredPhase.toUpperCase() !== phase
          ) {
            // Soft mismatch — still pass phase clock check; flag inconsistency
            return marketFail({
              message: `Declared session phase does not match timestamp phase at index ${i}.`,
              recommendation: "Align session labels with exchange clock.",
              field: "session",
              expected: phase,
              actual: declaredPhase,
            });
          }
        }
        return marketPass();
      },
    },
  ];
}
