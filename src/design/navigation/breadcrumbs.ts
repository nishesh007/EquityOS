/**
 * Sprint 10C.R7 — breadcrumb model (canonical module).
 *
 * Pure pathname → breadcrumb-trail mapping shared by every page.
 * The rendering component lives in BreadcrumbTrail.tsx.
 */

export interface Breadcrumb {
  label: string;
  href: string;
  /** True for the current (last, non-clickable) crumb. */
  current: boolean;
}

/** Route segment labels — mirrors the sidebar navigation. */
const SEGMENT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  research: "Research",
  markets: "Markets",
  portfolio: "Portfolio",
  watchlist: "Watchlist",
  news: "News",
  results: "Results Calendar",
  opportunities: "AI Insights",
  screener: "Screener",
  validation: "Validation Center",
  settings: "Settings",
  company: "Companies",
  alerts: "Alerts",
  reports: "Reports",
});

function labelFor(segment: string): string {
  const known = SEGMENT_LABELS[segment.toLowerCase()];
  if (known) return known;
  // Dynamic segments (e.g. company symbols) display uppercased.
  if (/^[a-z0-9&.-]+$/i.test(segment) && segment.length <= 12) {
    return decodeURIComponent(segment).toUpperCase();
  }
  return decodeURIComponent(segment);
}

/** Public API — breadcrumb trail for a pathname (root = Dashboard). */
export function getBreadcrumbs(pathname: string): Breadcrumb[] {
  const clean = pathname.split(/[?#]/)[0];
  const segments = clean.split("/").filter(Boolean);
  const crumbs: Breadcrumb[] = [
    { label: "Dashboard", href: "/", current: segments.length === 0 },
  ];
  let href = "";
  segments.forEach((segment, index) => {
    href += `/${segment}`;
    crumbs.push({
      label: labelFor(segment),
      href,
      current: index === segments.length - 1,
    });
  });
  return crumbs;
}
