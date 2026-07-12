import { cn } from "@/lib/utils";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  className?: string;
  emptyMessage?: string;
}

const alignStyles = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  emptyMessage = "No data available",
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">{emptyMessage}</p>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-border-subtle text-left">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "pb-2.5 text-[10px] font-medium uppercase tracking-wider text-text-faint",
                  alignStyles[col.align ?? "left"],
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              className="border-b border-surface-border-subtle/50 transition-colors hover:bg-surface-hover/30"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-3 text-sm text-text-secondary",
                    alignStyles[col.align ?? "left"],
                    col.className
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
