import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export function DashboardSkeleton() {
  return (
    <div className="p-6">
      <div className="mb-6 space-y-2">
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <SkeletonCard key={index} className="h-28" />
        ))}
      </div>

      <div className="mb-6">
        <SkeletonCard className="h-36" />
      </div>

      <div className="mb-6">
        <SkeletonCard className="h-56" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-64" />
      </div>

      <div className="mb-6">
        <SkeletonCard className="h-48" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-72" />
      </div>
    </div>
  );
}
