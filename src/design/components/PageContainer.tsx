import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  /** Constrain width on ultra-wide monitors. Defaults to true. */
  constrained?: boolean;
  className?: string;
}

/**
 * Standard page wrapper: responsive spacing from the global scale and an
 * ultra-wide max width so terminal layouts stay readable on large monitors.
 */
export function PageContainer({
  children,
  constrained = true,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full p-4 md:p-6 xl:p-8 animate-fade-in-up",
        constrained && "mx-auto max-w-[1920px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
