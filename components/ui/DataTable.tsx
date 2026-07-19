import { cn } from "@/lib/utils";
import { EmptyStatePanel } from "@/components/ui/EmptyStatePanel";
import { TABLE_CLASSES } from "@/src/design/layout/tableStyles";
import { Inbox } from "lucide-react";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  className?: string;
  /** When true, applies tabular numeric styling. */
  numeric?: boolean;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  className?: string;
  emptyMessage?: string;
  emptyTitle?: string;
  caption?: string;
  /** Sticky header inside scroll container (default true). */
  stickyHeader?: boolean;
}

const alignStyles = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

/**
 * Shared data table — sticky header, hover rows, numeric alignment,
 * accessible empty state. Presentation only.
 */
export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  className,
  emptyMessage = "No data available",
  emptyTitle = "Nothing to show",
  caption,
  stickyHeader = true,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <EmptyStatePanel
        title={emptyTitle}
        message={emptyMessage}
        icon={Inbox}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        stickyHeader ? TABLE_CLASSES.container : "overflow-x-auto rounded-lg",
        className
      )}
    >
      <table className={TABLE_CLASSES.table}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  alignStyles[col.align ?? (col.numeric ? "right" : "left")],
                  col.numeric && TABLE_CLASSES.numericCell,
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
            <tr key={keyExtractor(row)}>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-3 text-sm",
                    alignStyles[col.align ?? (col.numeric ? "right" : "left")],
                    col.numeric && TABLE_CLASSES.numericCell,
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
