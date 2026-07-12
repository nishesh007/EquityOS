import Link from "next/link";
import { getCompanyRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface StockLinkProps {
  symbol: string;
  children: React.ReactNode;
  className?: string;
}

export function StockLink({ symbol, children, className }: StockLinkProps) {
  return (
    <Link
      href={getCompanyRoute(symbol)}
      className={cn(
        "transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50",
        className
      )}
    >
      {children}
    </Link>
  );
}
