import Link from "next/link";
import { SearchX, ArrowLeft } from "lucide-react";

export default function CompanyNotFound() {
  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center p-6">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-overlay ring-1 ring-surface-border">
        <SearchX className="h-8 w-8 text-text-muted" />
      </div>
      <h1 className="mt-6 text-xl font-semibold text-text-primary">
        Company Not Found
      </h1>
      <p className="mt-2 max-w-md text-center text-sm text-text-muted">
        We couldn&apos;t find research data for this symbol. It may not be
        covered yet or the symbol may be incorrect.
      </p>
      <Link
        href="/"
        className="mt-6 flex items-center gap-2 rounded-lg border border-surface-border-subtle bg-surface-overlay/50 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>
    </div>
  );
}
