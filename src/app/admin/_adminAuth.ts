import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function requireAdminSession() {
  const ok = await getAdminSession();
  if (!ok) redirect("/admin/login");
}
