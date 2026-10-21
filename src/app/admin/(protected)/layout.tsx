import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const ok = await getAdminSession();
  if (!ok) redirect("/admin/login");

  return <AdminShell>{children}</AdminShell>;
}
