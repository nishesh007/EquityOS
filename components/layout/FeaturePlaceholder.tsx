import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, type LucideIcon } from "lucide-react";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  features: string[];
}

export function FeaturePlaceholder({
  title,
  description,
  icon: Icon,
  features,
}: FeaturePlaceholderProps) {
  return (
    <Card padding="lg" className="relative mx-auto max-w-2xl overflow-hidden">
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-accent/5 blur-3xl" />
      <div className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gain/5 blur-2xl" />

      <div className="relative">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 ring-1 ring-accent/20">
            <Icon className="h-6 w-6 text-accent" />
          </div>
          <Badge variant="neutral">Coming Soon</Badge>
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-text-primary">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {description}
        </p>

        <ul className="mt-6 space-y-2.5">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm text-text-secondary"
            >
              <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-accent" />
              {feature}
            </li>
          ))}
        </ul>

        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-1.5 rounded-lg border border-surface-border px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Dashboard
        </Link>
      </div>
    </Card>
  );
}
