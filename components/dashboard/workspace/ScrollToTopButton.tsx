"use client";

import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";

/** Floating scroll-to-top control for long dashboard pages. */
export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Scroll to top"
      onClick={() =>
        window.scrollTo({ top: 0, behavior: "smooth" })
      }
      className="fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface-raised text-text-secondary shadow-floating transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ArrowUp className="h-4 w-4" />
    </button>
  );
}
