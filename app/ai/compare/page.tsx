import { CompanyCompareLoader } from "@/components/ai/CompanyCompareLoader";
import Link from "next/link";

const quickLinks = [
  { href: "/ai/research", label: "AI Research" },
  { href: "/markets", label: "Markets" },
  { href: "/screener", label: "Screener" },
  { href: "/watchlist", label: "Watchlist" },
] as const;

export default function AIComparePage() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col">
      <div className="flex-shrink-0 border-b border-surface-border-subtle px-4 py-4 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">
              AI Compare
            </h1>
            <p className="mt-1 text-sm text-text-muted md:mt-2">
              Institutional head-to-head comparison across business, financials, valuation, risk,
              and moat dimensions.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg border border-surface-border-subtle px-3 py-1.5 text-xs font-medium text-text-muted transition hover:bg-surface-hover hover:text-text-secondary"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6">
        <CompanyCompareLoader />
      </div>
    </div>
  );
}
