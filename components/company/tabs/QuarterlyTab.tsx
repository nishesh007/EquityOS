import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import type { QuarterlyResult } from "@/types";

interface QuarterlyTabProps {
  quarterlyResults: QuarterlyResult[];
}

export function QuarterlyTab({ quarterlyResults }: QuarterlyTabProps) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Quarterly Results"
        subtitle="Recent quarter performance"
      />
      <DataTable
        data={quarterlyResults}
        keyExtractor={(row) => row.quarter}
        columns={[
          {
            key: "quarter",
            header: "Quarter",
            render: (row) => (
              <span className="font-medium text-text-primary">
                {row.quarter}
              </span>
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
            key: "margin",
            header: "Margin",
            align: "right",
            render: (row) => (
              <span className="font-mono tabular-nums">{row.margin}%</span>
            ),
          },
        ]}
      />
    </Card>
  );
}
