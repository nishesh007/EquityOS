import { Card, CardHeader } from "@/components/ui/Card";
import type { CompanyNews } from "@/types";
import { Newspaper } from "lucide-react";

interface CompanyNewsPanelProps {
  news: CompanyNews[];
}

export function CompanyNewsPanel({ news }: CompanyNewsPanelProps) {
  return (
    <Card padding="lg" className="animate-fade-in-up h-full">
      <CardHeader
        title="Latest Company News"
        subtitle="Mock market headlines"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Newspaper className="h-4 w-4 text-accent" />
          </div>
        }
      />

      <div className="space-y-3">
        {news.map((item, index) => (
          <article
            key={item.id}
            className="group rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/25 hover:bg-surface-overlay/50"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-surface-raised font-mono text-[10px] font-semibold text-accent ring-1 ring-surface-border-subtle">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
                    {item.source}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-text-faint" />
                  <span className="text-[10px] text-text-muted">
                    {item.timestamp}
                  </span>
                </div>
                <h3 className="mt-1 text-sm font-semibold leading-snug text-text-primary transition-colors group-hover:text-accent">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                  {item.summary}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}
