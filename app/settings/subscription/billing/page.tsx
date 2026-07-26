"use client";

import { Suspense } from "react";
import BillingDashboardInner from "./BillingDashboardInner";

export default function BillingDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-sm text-text-secondary" role="status">
          Loading billing…
        </div>
      }
    >
      <BillingDashboardInner />
    </Suspense>
  );
}
