import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";

interface CompanyBreadcrumbProps {
  symbol: string;
  name: string;
}

export function CompanyBreadcrumb({ symbol, name }: CompanyBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm">
      <Link
        href="/"
        className="flex items-center gap-1.5 text-text-muted transition-colors hover:text-text-secondary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dashboard
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
      <span className="text-text-muted">Research</span>
      <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
      <span className="font-medium text-text-primary">
        {symbol}
        <span className="ml-2 hidden font-normal text-text-muted sm:inline">
          {name}
        </span>
      </span>
    </nav>
  );
}
