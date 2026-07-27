import { redirect } from "next/navigation";

/**
 * Market Internals was merged into the institutional Markets page.
 * Preserve deep links with a permanent redirect.
 */
export default function MarketInternalsRedirectPage() {
  redirect("/markets#breadth-analytics");
}
