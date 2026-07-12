import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import type { AnnualFinancial } from "@/types";

interface FinancialsTabProps {
  annualFinancials: AnnualFinancial[];
}

export function FinancialsTab({ annualFinancials }: FinancialsTabProps) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Annual Financials"
        subtitle="Year-over-year performance"
      />
      <DataTable
        data={annualFinancials}
        keyExtractor={(row) => row.year}
        columns={[
          {
            key: "year",
            header: "Year",
            render: (row) => (
              <span className="font-medium text-text-primary">{row.year}</span>
            ),
          },
          {
            key: "revenue",
            header: "Revenue",
            align: "right",
            render: (row) => (
              <span className="font-mono tabular-nums">{row.revenue}</span>
            ),
          },
          {
            key: "netProfit",
            header: "Net Profit",
            align: "right",
            render: (row) => (
              <span className="font-mono tabular-nums">{row.netProfit}</span>
            ),
          },
          {
            key: "eps",
            header: "EPS",
            align: "right",
            render: (row) => (
              <span className="font-mono tabular-nums">₹{row.eps}</span>
            ),
          },
          {
            key: "roe",
            header: "ROE",
            align: "right",
            render: (row) => (
              <span className="font-mono tabular-nums">{row.roe}%</span>
            ),
          },
        ]}
      />
    </Card>
  );
}
