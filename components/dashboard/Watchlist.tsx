"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { useWatchlist } from "@/hooks/useWatchlist";
import { getCompanyRoute } from "@/lib/routes";
import type { WatchlistItem } from "@/types";
import { useRouter } from "next/navigation";
import { Star, X } from "lucide-react";

interface WatchlistProps {
  initialItems: WatchlistItem[];
}

export function Watchlist({ initialItems }: WatchlistProps) {
  const { items, removeItem } = useWatchlist({ initialItems });
  const router = useRouter();

  return (
    <Card padding="lg" className="h-full">
      <CardHeader
        title="Watchlist"
        subtitle={`${items.length} stocks tracked`}
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gain/10">
            <Star className="h-4 w-4 text-gain" />
          </div>
        }
      />

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-border-subtle text-left">
              <th className="pb-2 text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Symbol
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                LTP
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Change
              </th>
              <th className="pb-2 text-right text-[10px] font-medium uppercase tracking-wider text-text-faint">
                Vol
              </th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={() => router.push(getCompanyRoute(item.symbol))}
                className="group cursor-pointer border-b border-surface-border-subtle/50 transition-colors hover:bg-surface-hover/30"
              >
                <td className="py-2.5">
                  <div>
                    <p className="text-sm font-medium text-text-primary group-hover:text-accent">
                      {item.symbol}
                    </p>
                    <p className="text-[10px] text-text-muted">{item.sector}</p>
                  </div>
                </td>
                <td className="py-2.5 text-right">
                  <p className="text-sm font-mono text-text-primary tabular-nums">
                    ₹{item.price.toLocaleString("en-IN")}
                  </p>
                </td>
                <td className="py-2.5 text-right">
                  <ChangeIndicator
                    value={item.changePercent}
                    size="sm"
                    showIcon={false}
                  />
                </td>
                <td className="py-2.5 text-right">
                  <p className="text-xs font-mono text-text-muted tabular-nums">
                    {item.volume}
                  </p>
                </td>
                <td className="py-2.5">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removeItem(item.id);
                    }}
                    className="rounded p-1 text-text-faint opacity-0 transition-all hover:bg-surface-overlay hover:text-text-muted group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
