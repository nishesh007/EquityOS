import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { MarketNews } from "@/types";
import { ExternalLink, Newspaper, ShieldCheck } from "lucide-react";

interface LatestMarketNewsProps {
  news: MarketNews[];
}

export function LatestMarketNews({ news }: LatestMarketNewsProps) {
  return (
    <Card padding="lg" className="h-full">
      <CardHeader
        title="Verified Market News"
        subtitle="Current coverage from approved institutional sources"
        action={
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-overlay">
            <Newspaper className="h-4 w-4 text-text-muted" />
          </div>
        }
      />

      <div className="space-y-3">
        {news.length === 0 ? (
          <div className="rounded-lg border border-surface-border-subtle px-4 py-8 text-center">
            <p className="text-sm font-medium text-text-secondary">
              Verified headlines are temporarily unavailable
            </p>
            <p className="mt-1 text-xs text-text-muted">
              The live source feed will retry on the next refresh.
            </p>
          </div>
        ) : null}
        {news.map((item, index) => (
          <article
            key={item.id}
            className="group rounded-lg border border-transparent transition-all hover:border-surface-border-subtle hover:bg-surface-hover/30"
          >
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-3 p-3"
            >
              <div className="flex-1 min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="default" size="sm">
                    {item.category}
                  </Badge>
                  <Badge
                    variant={
                      item.sentiment === "Positive"
                        ? "gain"
                        : item.sentiment === "Negative"
                          ? "loss"
                          : "neutral"
                    }
                    size="sm"
                  >
                    {item.sentiment}
                  </Badge>
                  <span className="text-[10px] text-text-faint">
                    {item.timestamp}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-text-primary leading-snug group-hover:text-accent transition-colors">
                  {item.title}
                </h3>
                <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-text-muted">
                  <ShieldCheck className="h-3 w-3 text-gain" />
                  {item.source}
                </p>
                <span className="mt-2 block text-[10px] font-semibold uppercase tracking-wider text-accent">
                  Open Article
                </span>
              </div>
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-text-faint opacity-0 transition-opacity group-hover:opacity-100" />
            </a>
            {index < news.length - 1 && (
              <div className="mt-3 h-px bg-surface-border-subtle" />
            )}
          </article>
        ))}
      </div>
    </Card>
  );
}
