/**
 * Sprint 10C.R7 — display-only NSE/BSE session state for the status bar.
 * Not market data logic — purely a clock label.
 */

export interface MarketSession {
  open: boolean;
  label: string;
}

/** Indian market hours: Mon–Fri, 09:15–15:30 IST. */
export function getMarketSession(date: Date): MarketSession {
  const ist = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const day = ist.getDay();
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  const weekday = day >= 1 && day <= 5;
  const open = weekday && minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;
  if (open) return { open: true, label: "Markets Open · NSE · BSE" };
  if (weekday && minutes < 9 * 60 + 15) {
    return { open: false, label: "Pre-market · Opens 09:15 IST" };
  }
  return { open: false, label: "Markets Closed · NSE · BSE" };
}
