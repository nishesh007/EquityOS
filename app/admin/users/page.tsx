"use client";

import { AdminShell } from "@/components/admin";
import { UserTable } from "@/components/admin";

export default function AdminUsersPage() {
  return (
    <AdminShell
      title="Users"
      description="Plans, roles, licenses, devices, sessions, and account actions."
    >
      <UserTable />
    </AdminShell>
  );
}
