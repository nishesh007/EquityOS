"use client";

export function MetricGrid({
  items,
}: {
  items: Array<{ label: string; value: string | null | undefined; tone?: string }>;
}) {
  const visible = items.filter((item) => item.value != null && item.value !== "");
  if (visible.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {visible.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-surface-border-subtle/70 bg-surface-hover/30 px-2.5 py-2"
        >
          <p className="text-[9px] font-medium uppercase tracking-wider text-text-faint">
            {item.label}
          </p>
          <p
            className={`mt-0.5 font-mono text-xs font-medium tabular-nums ${
              item.tone ?? "text-text-primary"
            }`}
          >
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function ContributionList({
  title,
  rows,
  positive = true,
}: {
  title: string;
  rows: Array<{ label: string; contribution: number }>;
  positive?: boolean;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
        {rows.map((row) => (
          <div
            key={`${title}-${row.label}`}
            className="flex items-center justify-between gap-2 text-[11px]"
          >
            <span className="text-text-muted">{row.label}</span>
            <span
              className={`font-mono tabular-nums ${
                positive || row.contribution >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {row.contribution > 0 ? "+" : ""}
              {row.contribution}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TraceList({ title, lines }: { title: string; lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-text-faint">
        {title}
      </p>
      <ul className="max-h-36 space-y-1 overflow-y-auto text-[11px] text-text-muted">
        {lines.map((line) => (
          <li key={line} className="flex gap-1.5">
            <span className="text-accent">›</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
