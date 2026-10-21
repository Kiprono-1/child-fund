import { getAdminSession } from "@/lib/auth";
import { adminGetDashboardStats } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const stats = await adminGetDashboardStats();
    return Response.json({ ok: true, stats });
  } catch (err) {
    console.error("Admin stats error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
