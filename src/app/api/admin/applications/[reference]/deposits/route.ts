import { getAdminSession } from "@/lib/auth";
import { adminGetApplicationDetail, adminAddDeposit } from "@/lib/service";
import type { AdminDepositInput } from "@/lib/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reference: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const { reference } = await ctx.params;
  try {
    const body = (await req.json()) as AdminDepositInput;

    if (!body.depositType || !body.amountCents || !body.description || !body.status) {
      return Response.json({ ok: false, error: "Missing required fields." }, { status: 422 });
    }
    if (!Number.isFinite(body.amountCents) || body.amountCents <= 0) {
      return Response.json(
        { ok: false, error: "Amount must be a positive number." },
        { status: 422 },
      );
    }

    const detail = await adminGetApplicationDetail(reference);
    if (!detail) {
      return Response.json({ ok: false, error: "Application not found." }, { status: 404 });
    }

    const deposit = await adminAddDeposit(detail.application.id, body);
    return Response.json({ ok: true, deposit }, { status: 201 });
  } catch (err) {
    console.error("Admin add deposit error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
