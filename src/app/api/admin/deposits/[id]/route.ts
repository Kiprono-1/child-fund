import { getAdminSession } from "@/lib/auth";
import { adminUpdateDeposit, adminDeleteDeposit } from "@/lib/service";
import type { AdminDepositInput } from "@/lib/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return Response.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }

  try {
    const fields = (await req.json()) as Partial<AdminDepositInput>;
    const result = await adminUpdateDeposit(numId, fields);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Admin update deposit error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) {
    return Response.json({ ok: false, error: "Invalid id." }, { status: 400 });
  }

  try {
    const result = await adminDeleteDeposit(numId);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Admin delete deposit error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
