import { getAdminSession } from "@/lib/auth";
import { adminGetAllApplications } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const page = Number(url.searchParams.get("page") ?? "1") || 1;
    const status = url.searchParams.get("status") ?? undefined;
    const search = url.searchParams.get("search") ?? undefined;

    const result = await adminGetAllApplications({ page, status, search });
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("Admin applications list error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
