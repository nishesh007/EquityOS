/**
 * Sprint 10C — display-only NSE session state for chrome badges.
 * Pure local clock — no market-data API.
 */

export interface MarketSession {
  open: boolean;
  label: string;
}

/** NSE cash display window: Mon–Fri, 09:00–15:30 IST. */
export function getMarketSession(date: Date): MarketSession {
  const ist = new Date(
    date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  );
  const day = ist.getDay();
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  const weekday = day >= 1 && day <= 5;
  const open = weekday && minutes >= 9 * 60 && minutes <= 15 * 60 + 30;
  if (open) return { open: true, label: "Markets Open" };
  return { open: false, label: "Markets Closed" };
}
