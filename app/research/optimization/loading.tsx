export default function Loading() {
  return (
    <div
      className="animate-pulse space-y-4"
      aria-busy="true"
      aria-label="Loading strategy optimization workspace"
    >
      <div className="h-16 rounded-xl bg-surface-overlay/60" />
      <div className="h-40 rounded-xl bg-surface-overlay/60" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="h-96 rounded-xl bg-surface-overlay/60 xl:col-span-2" />
        <div className="space-y-4">
          <div className="h-48 rounded-xl bg-surface-overlay/60" />
          <div className="h-40 rounded-xl bg-surface-overlay/60" />
          <div className="h-56 rounded-xl bg-surface-overlay/60" />
        </div>
      </div>
    </div>
  );
}
