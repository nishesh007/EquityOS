import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { StockLink } from "@/components/ui/StockLink";
import {
  ResearchCardSection,
  ResearchMetricCard,
} from "@/components/company/research-cards";
import {
  formatPercentValue,
  formatRatioValue,
} from "@/lib/format/research-numbers";
import type { InstitutionalPeer } from "@/types";
import { Medal, Users } from "lucide-react";

interface InstitutionalPeerComparisonProps {
  peers: InstitutionalPeer[];
}

function NumberCell({
  value,
  kind,
}: {
  value: number;
  kind: "ratio" | "percent";
}) {
  return (
    <span className="font-mono text-xs tabular-nums">
      {kind === "ratio" ? formatRatioValue(value) : formatPercentValue(value)}
    </span>
  );
}

export function InstitutionalPeerComparison({
  peers,
}: InstitutionalPeerComparisonProps) {
  const current = peers.find((p) => p.isCompany) ?? peers[0];

  if (!current) {
    return (
      <p className="text-xs text-text-muted">No peer comparison available.</p>
    );
  }

  return (
    <div className="space-y-4">
      <ResearchCardSection
        title="Peer Comparison"
        subtitle="Compact snapshot vs peer universe"
      >
        <ResearchMetricCard
          title="P/E vs Peers"
          value={formatRatioValue(current.pe)}
          verdict={current.valuation}
          tone={
            current.valuation === "Attractive"
              ? "positive"
              : current.valuation === "Premium"
                ? "negative"
                : "neutral"
          }
          icon={Users}
        />
        <ResearchMetricCard
          title="ROE"
          value={formatPercentValue(current.roe)}
          verdict={`Rank #${current.industryRank}`}
          tone="neutral"
          icon={Medal}
        />
        <ResearchMetricCard
          title="Sales Growth"
          value={formatPercentValue(current.salesGrowth)}
          verdict={current.salesGrowth >= 0 ? "Growing" : "Soft"}
          tone={current.salesGrowth >= 0 ? "positive" : "negative"}
          icon={Users}
        />
        <ResearchMetricCard
          title="Universe"
          value={`${peers.length} names`}
          verdict="Peers"
          tone="technical"
          icon={Users}
        />
      </ResearchCardSection>

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
                  <p className="max-w-[150px] truncate text-[10px] text-text-muted">
                    {row.name}
                  </p>
                </StockLink>
                {row.isCompany ? (
                  <Badge variant="accent" size="sm">
                    Current
                  </Badge>
                ) : null}
              </div>
            ),
          },
          {
            key: "pe",
            header: "P/E",
            align: "right",
            render: (row) => <NumberCell value={row.pe} kind="ratio" />,
          },
          {
            key: "pb",
            header: "P/B",
            align: "right",
            render: (row) => <NumberCell value={row.pb} kind="ratio" />,
          },
          {
            key: "roe",
            header: "ROE",
            align: "right",
            render: (row) => <NumberCell value={row.roe} kind="percent" />,
          },
          {
            key: "roce",
            header: "ROCE",
            align: "right",
            render: (row) => <NumberCell value={row.roce} kind="percent" />,
          },
          {
            key: "sales-growth",
            header: "Sales Growth",
            align: "right",
            render: (row) => (
              <NumberCell value={row.salesGrowth} kind="percent" />
            ),
          },
          {
            key: "profit-growth",
            header: "Profit Growth",
            align: "right",
            render: (row) => (
              <NumberCell value={row.profitGrowth} kind="percent" />
            ),
          },
          {
            key: "debt",
            header: "Debt",
            align: "right",
            render: (row) => <NumberCell value={row.debt} kind="ratio" />,
          },
          {
            key: "market-cap",
            header: "Market Cap",
            align: "right",
            render: (row) => (
              <span className="whitespace-nowrap font-mono text-xs">
                {row.marketCap}
              </span>
            ),
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
                {row.industryRank <= 3 ? (
                  <Medal className="h-3 w-3 text-accent" />
                ) : null}
                #{row.industryRank}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
