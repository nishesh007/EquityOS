interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6 animate-fade-in-up">
      <h1 className="text-xl font-semibold tracking-tight text-text-primary">
        {title}
      </h1>
      {subtitle && (
        <p className="mt-0.5 text-sm text-text-muted">{subtitle}</p>
      )}
    </div>
  );
}
