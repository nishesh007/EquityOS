"use client";

import { AdminShell, LicenseTable } from "@/components/admin";

export default function AdminLicensesPage() {
  return (
    <AdminShell
      title="Licenses"
      description="License pool, assignment, expiry, revocation, and offline grace."
    >
      <LicenseTable />
    </AdminShell>
  );
}
