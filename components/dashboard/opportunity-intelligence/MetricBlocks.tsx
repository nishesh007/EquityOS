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
