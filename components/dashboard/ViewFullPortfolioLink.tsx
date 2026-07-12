"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export function ViewFullPortfolioLink() {
  return (
    <Link
      href="/portfolio#holdings"
      className="relative z-10 mt-4 flex w-full items-center justify-center gap-1 rounded-lg border border-surface-border py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
    >
      View Full Portfolio
      <ArrowUpRight className="h-3 w-3" />
    </Link>
  );
}
