"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { QuoteDisplayCompact } from "@/components/market/QuoteDisplay";
import { DataTable } from "@/components/ui/DataTable";
import { StockLink } from "@/components/ui/StockLink";
import { useMarketQuotes } from "@/hooks/useMarketQuotes";
import {
  createUnavailableQuote,
  type EnrichedQuote,
} from "@/lib/market-data/enriched-quote";
import type { PeerCompany } from "@/types";
import { Users } from "lucide-react";
import { useCallback, useMemo } from "react";

interface PeersTabProps {
  peers: PeerCompany[];
}

function buildInitialQuotes(peers: PeerCompany[]): Record<string, EnrichedQuote> {
  const map: Record<string, EnrichedQuote> = {};
  for (const peer of peers) {
    if (peer.quote) {
      map[peer.symbol.toUpperCase()] = peer.quote;
    }
  }
  return map;
}

export function PeersTab({ peers }: PeersTabProps) {
  const symbols = useMemo(() => peers.map((peer) => peer.symbol), [peers]);
  const initialQuotes = useMemo(() => buildInitialQuotes(peers), [peers]);

  const { quotes, loading } = useMarketQuotes(symbols, { initialQuotes });

  const resolveQuote = useCallback(
    (symbol: string, peerQuote?: EnrichedQuote) => {
      const polled = quotes.get(symbol) ?? quotes.get(symbol.toUpperCase());
      return (
        polled ??
        (loading ? peerQuote : undefined) ??
        createUnavailableQuote(symbol)
      );
    },
    [quotes, loading]
  );

  return (
    <Card padding="lg">
      <CardHeader
        title="Peer Comparison"
        subtitle="Industry peers"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Users className="h-4 w-4 text-accent" />
          </div>
        }
      />
      <DataTable
        data={peers}
        keyExtractor={(row) => row.symbol}
        emptyMessage="No peer data available"
        columns={[
          {
            key: "symbol",
            header: "Company",
            render: (row) => (
              <div>
                <StockLink
                  symbol={row.symbol}
                  className="text-sm font-medium text-text-primary"
                >
                  {row.symbol}
                </StockLink>
                <p className="text-[10px] text-text-muted">{row.name}</p>
              </div>
            ),
          },
          {
            key: "price",
            header: "Price",
            align: "right",
            render: (row) => {
              const quote = resolveQuote(row.symbol, row.quote);
              return (
                <QuoteDisplayCompact quote={quote} className="text-right" />
              );
            },
          },
          {
            key: "pe",
            header: "P/E",
            align: "right",
            render: (row) => (
              <span className="font-mono tabular-nums">{row.pe}x</span>
            ),
          },
          {
            key: "marketCap",
            header: "Mkt Cap",
            align: "right",
            render: (row) => (
              <span className="font-mono tabular-nums">{row.marketCap}</span>
            ),
          },
        ]}
      />
    </Card>
  );
}
