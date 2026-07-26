import { PageContainer } from "@/src/design";
import type { ReactNode } from "react";

export default function OptimizationLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <PageContainer>{children}</PageContainer>;
}
