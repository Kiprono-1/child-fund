import { getAdminSession } from "@/lib/auth";
import { adminGetAllInquiries } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const handledParam = url.searchParams.get("handled");
    const handled =
      handledParam === "true" ? true : handledParam === "false" ? false : undefined;

    const rows = await adminGetAllInquiries({ handled });
    return Response.json({ ok: true, rows });
  } catch (err) {
    console.error("Admin inquiries list error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
