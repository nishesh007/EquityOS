"use client";

/**
 * Sprint 10C.R7 — professional breadcrumb bar.
 *
 * Clickable hierarchy from the pure breadcrumb model, plus a browser
 * history back button. Hidden on the dashboard root.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBreadcrumbs } from "./breadcrumbs";

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const crumbs = getBreadcrumbs(pathname ?? "/");

  if (crumbs.length <= 1) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 px-6 pt-3 text-xs text-text-muted",
        className
      )}
    >
      <button
        type="button"
        onClick={() => router.back()}
        aria-label="Go back"
        title="Back"
        className="mr-1 rounded-md p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
      </button>
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => (
          <li key={crumb.href} className="flex items-center gap-1">
            {index > 0 && (
              <ChevronRight className="h-3 w-3 text-text-faint" aria-hidden />
            )}
            {crumb.current ? (
              <span
                aria-current="page"
                className="font-medium text-text-primary"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className="rounded px-1 py-0.5 transition-colors hover:bg-surface-hover hover:text-text-primary"
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
