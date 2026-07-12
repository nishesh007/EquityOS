import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

export function CompanyPageSkeleton() {
  return (
    <div className="p-6">
      <Skeleton className="mb-6 h-4 w-48" />

      <div className="space-y-6">
        <SkeletonCard className="h-32" />
        <Skeleton className="h-10 w-64" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-20" />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1.55fr)_minmax(420px,0.85fr)]">
          <SkeletonCard className="h-96" />
          <SkeletonCard className="h-96" />
        </div>

        <SkeletonCard className="h-72" />
        <SkeletonCard className="h-64" />
        <SkeletonCard className="h-48" />
        <SkeletonCard className="h-96" />
      </div>
    </div>
  );
}
