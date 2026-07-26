import { PageContainer } from "@/src/design";
import type { ReactNode } from "react";
import { ProtectedRoute } from "@/components/saas";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <PageContainer>
      <ProtectedRoute>{children}</ProtectedRoute>
    </PageContainer>
  );
}
