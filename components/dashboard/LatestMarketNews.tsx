import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { MarketNews } from "@/types";
import { ExternalLink, Newspaper } from "lucide-react";

interface LatestMarketNewsProps {
  news: MarketNews[];
}

export function LatestMarketNews({ news }: LatestMarketNewsProps) {
  return (
    <Card padding="lg" className="h-full">
      <CardHeader
        title="Latest Market News"
        subtitle="Real-time market updates"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-overlay">
            <Newspaper className="h-4 w-4 text-text-muted" />
          </div>
        }
      />

      <div className="space-y-3">
        {news.map((item, index) => (
          <article
            key={item.id}
            className="group cursor-pointer rounded-lg border border-transparent p-3 transition-all hover:border-surface-border-subtle hover:bg-surface-hover/30"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="mb-1.5 flex items-center gap-2">
                  <Badge variant="default" size="sm">
                    {item.category}
                  </Badge>
                  <span className="text-[10px] text-text-faint">
                    {item.timestamp}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-text-primary leading-snug group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs text-text-muted line-clamp-2">
                  {item.summary}
                </p>
                <p className="mt-1.5 text-[10px] font-medium text-text-faint">
                  {item.source}
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            {index < news.length - 1 && (
              <div className="mt-3 h-px bg-surface-border-subtle" />
            )}
          </article>
        ))}
      </div>
    </Card>
  );
}
