"use client";

/**
 * Sprint 10C.R7 — page transition wrapper.
 *
 * Crossfades content when the route changes using the existing motion
 * presets. Reduced motion is honored globally via the data-motion CSS
 * from R5 (animations are disabled at the stylesheet level).
 */

import { usePathname } from "next/navigation";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  );
}
