import { getAdminSession } from "@/lib/auth";
import { adminGetNewsletterSignups } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const rows = await adminGetNewsletterSignups();
    return Response.json({ ok: true, rows, total: rows.length });
  } catch (err) {
    console.error("Admin newsletter error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
