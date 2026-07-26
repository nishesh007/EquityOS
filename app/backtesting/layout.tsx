import { BacktestingModuleNav } from "@/components/backtesting/hardening";
import { PageContainer } from "@/src/design";
import type { ReactNode } from "react";

/**
 * Shared shell for Historical Backtesting — consistent module navigation.
 */
export default function BacktestingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <PageContainer>
      <div className="mb-4">
        <BacktestingModuleNav />
      </div>
      {children}
    </PageContainer>
  );
}
