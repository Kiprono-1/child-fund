import { getAdminSession } from "@/lib/auth";
import { adminGetApplicationDetail, adminUpdateApplication } from "@/lib/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reference: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { reference } = await ctx.params;
  try {
    const detail = await adminGetApplicationDetail(reference);
    if (!detail) {
      return Response.json({ ok: false, error: "Application not found." }, { status: 404 });
    }
    return Response.json({ ok: true, detail });
  } catch (err) {
    console.error("Admin get application error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { reference } = await ctx.params;
  try {
    const fields = (await req.json()) as Parameters<typeof adminUpdateApplication>[1];
    const result = await adminUpdateApplication(reference, fields);
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Admin update application error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
