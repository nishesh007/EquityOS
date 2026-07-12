import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { StockLink } from "@/components/ui/StockLink";
import type { InstitutionalPeer } from "@/types";
import { Medal, Users } from "lucide-react";

interface InstitutionalPeerComparisonProps {
  peers: InstitutionalPeer[];
}

function NumberCell({ value, suffix = "" }: { value: number; suffix?: string }) {
  return <span className="font-mono text-xs tabular-nums">{value}{suffix}</span>;
}

export function InstitutionalPeerComparison({ peers }: InstitutionalPeerComparisonProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Institutional Peer Comparison"
        subtitle="Relative profitability, growth, leverage and valuation"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Users className="h-4 w-4 text-accent" />
          </div>
        }
      />
      <DataTable
        data={peers}
        keyExtractor={(row) => row.symbol}
        className="pb-1"
        columns={[
          {
            key: "company",
            header: "Company",
            className: "min-w-[170px]",
            render: (row) => (
              <div className="flex items-center gap-2">
                <StockLink symbol={row.symbol}>
                  <p className="text-xs font-semibold text-text-primary hover:text-accent">
                    {row.symbol}
                  </p>
                  <p className="max-w-[150px] truncate text-[10px] text-text-muted">{row.name}</p>
                </StockLink>
                {row.isCompany && <Badge variant="accent" size="sm">Current</Badge>}
              </div>
            ),
          },
          { key: "pe", header: "P/E", align: "right", render: (row) => <NumberCell value={row.pe} suffix="x" /> },
          { key: "pb", header: "P/B", align: "right", render: (row) => <NumberCell value={row.pb} suffix="x" /> },
          { key: "roe", header: "ROE", align: "right", render: (row) => <NumberCell value={row.roe} suffix="%" /> },
          { key: "roce", header: "ROCE", align: "right", render: (row) => <NumberCell value={row.roce} suffix="%" /> },
          { key: "sales-growth", header: "Sales Growth", align: "right", render: (row) => <NumberCell value={row.salesGrowth} suffix="%" /> },
          { key: "profit-growth", header: "Profit Growth", align: "right", render: (row) => <NumberCell value={row.profitGrowth} suffix="%" /> },
          { key: "debt", header: "Debt", align: "right", render: (row) => <NumberCell value={row.debt} suffix="x" /> },
          {
            key: "market-cap",
            header: "Market Cap",
            align: "right",
            render: (row) => <span className="whitespace-nowrap font-mono text-xs">{row.marketCap}</span>,
          },
          {
            key: "valuation",
            header: "Valuation",
            align: "center",
            render: (row) => (
              <Badge
                size="sm"
                variant={
                  row.valuation === "Attractive"
                    ? "gain"
                    : row.valuation === "Premium"
                      ? "loss"
                      : "accent"
                }
              >
                {row.valuation}
              </Badge>
            ),
          },
          {
            key: "rank",
            header: "Industry Rank",
            align: "right",
            render: (row) => (
              <span className="inline-flex items-center justify-end gap-1 font-mono text-xs font-semibold text-text-primary">
                {row.industryRank <= 3 && <Medal className="h-3 w-3 text-accent" />}
                #{row.industryRank}
              </span>
            ),
          },
        ]}
      />
    </Card>
  );
}
