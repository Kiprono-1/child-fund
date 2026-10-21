import { getAdminSession } from "@/lib/auth";
import { adminSetApplicationStatus } from "@/lib/service";
import type { ApplicationStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reference: string }> };

const VALID_STATUSES: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "verification_required",
  "approved",
  "funded",
  "rejected",
];

export async function POST(req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { reference } = await ctx.params;
  try {
    const body = (await req.json()) as { status?: string; notes?: string };
    const status = body.status as ApplicationStatus;
    const notes = body.notes ?? "";

    if (!VALID_STATUSES.includes(status)) {
      return Response.json({ ok: false, error: "Invalid status value." }, { status: 422 });
    }

    const result = await adminSetApplicationStatus(reference, status, notes, "admin");
    if (!result.ok) {
      return Response.json({ ok: false, error: result.error }, { status: 400 });
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Admin set status error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
