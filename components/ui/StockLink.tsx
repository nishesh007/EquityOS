import Link from "next/link";
import { getCompanyRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

interface StockLinkProps {
  symbol: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  style?: React.CSSProperties;
}

export function StockLink({
  symbol,
  children,
  className,
  title,
  style,
}: StockLinkProps) {
  return (
    <Link
      href={getCompanyRoute(symbol)}
      title={title}
      style={style}
      className={cn(
        "transition-colors hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50",
        className
      )}
    >
      {children}
    </Link>
  );
}
