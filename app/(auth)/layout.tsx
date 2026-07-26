import { Suspense, type ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <Suspense fallback={<div className="text-sm text-text-secondary">Loading…</div>}>
        {children}
      </Suspense>
    </div>
  );
}
