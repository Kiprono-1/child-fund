import { getAdminSession } from "@/lib/auth";
import { adminMarkInquiryHandled } from "@/lib/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return Response.json({ ok: false, error: "Invalid inquiry ID." }, { status: 400 });
  }

  try {
    const result = await adminMarkInquiryHandled(numId);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 404 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Admin mark inquiry error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
