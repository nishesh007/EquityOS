import { Card, CardHeader } from "@/components/ui/Card";
import type { CompanyNews } from "@/types";
import { Newspaper } from "lucide-react";

interface NewsTabProps {
  news: CompanyNews[];
}

export function NewsTab({ news }: NewsTabProps) {
  return (
    <Card padding="lg">
      <CardHeader
        title="Company News"
        subtitle="Latest headlines"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
            <Newspaper className="h-4 w-4 text-accent" />
          </div>
        }
      />
      {news.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-muted">
          No news available for this company.
        </p>
      ) : (
        <div className="space-y-3">
          {news.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-surface-border-subtle bg-surface-overlay/30 p-4 transition-colors hover:bg-surface-overlay/50"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-medium text-text-primary">
                  {item.title}
                </h3>
                <span className="flex-shrink-0 text-[10px] text-text-faint">
                  {item.timestamp}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">
                {item.summary}
              </p>
              <p className="mt-2 text-[10px] text-text-muted">{item.source}</p>
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
