import { DataTransparencyBar } from "@/components/ui/DataTransparency";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import type { DataTransparency, RedFlag } from "@/types";
import { ShieldAlert } from "lucide-react";

interface RedFlagPanelProps {
  flags: RedFlag[];
  dataTransparency: DataTransparency;
}

const severityStyles = {
  High: "border-loss/30 bg-loss-bg text-loss",
  Medium: "border-accent/30 bg-accent/10 text-accent",
  Low: "border-surface-border-subtle bg-surface-overlay/30 text-text-muted",
};

export function RedFlagPanel({ flags, dataTransparency }: RedFlagPanelProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up">
      <CardHeader
        title="Red Flag Engine"
        subtitle={flags.length > 0 ? `${flags.length} risk signal(s) detected` : "No significant red flags"}
        action={<ShieldAlert className="h-4 w-4 text-loss" />}
      />
      {flags.length === 0 ? (
        <p className="text-xs text-text-muted">No material red flags detected in current financial data.</p>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div
              key={flag.key}
              className={cn("rounded-lg border p-4", severityStyles[flag.severity])}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold">{flag.label}</p>
                <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider">
                  {flag.severity}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed opacity-90">{flag.description}</p>
              <p className="mt-1 font-mono text-[10px] tabular-nums opacity-75">{flag.metric}</p>
            </div>
          ))}
        </div>
      )}
      <DataTransparencyBar transparency={dataTransparency} className="mt-4" compact />
    </Card>
  );
}
