"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/saas";

export function ProtectedRoute({
  children,
  fallbackHref = "/login",
}: {
  children: ReactNode;
  fallbackHref?: string;
}) {
  const { hydrated, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname || "/settings");
      router.replace(`${fallbackHref}?next=${next}`);
    }
  }, [hydrated, isAuthenticated, loading, router, fallbackHref, pathname]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-secondary" aria-busy="true">
        Loading session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-text-secondary">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
