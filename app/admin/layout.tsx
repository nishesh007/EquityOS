import { PageContainer } from "@/src/design";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/saas";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer>
      <ProtectedRoute>{children}</ProtectedRoute>
    </PageContainer>
  );
}
