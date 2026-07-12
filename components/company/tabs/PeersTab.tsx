import { Card, CardHeader } from "@/components/ui/Card";
import { ChangeIndicator } from "@/components/ui/ChangeIndicator";
import { DataTable } from "@/components/ui/DataTable";
import { StockLink } from "@/components/ui/StockLink";
import type { PeerCompany } from "@/types";
import { Users } from "lucide-react";

interface PeersTabProps {
  peers: PeerCompany[];
}

export function PeersTab({ peers }: PeersTabProps) {
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
            render: (row) => (
              <span className="font-mono text-text-primary tabular-nums">
                ₹{row.price.toLocaleString("en-IN")}
              </span>
            ),
          },
          {
            key: "change",
            header: "Change",
            align: "right",
            render: (row) => (
              <ChangeIndicator value={row.changePercent} size="sm" />
            ),
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
