import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export function PortfolioSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SkeletonCard className="h-80" />
        <SkeletonCard className="h-80" />
      </div>
    </div>
  );
}
