import { advanceApplication, getApplicationDetail } from "@/lib/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reference: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { reference } = await ctx.params;
  const url = new URL(req.url);
  const lastName = url.searchParams.get("lastName") ?? undefined;

  try {
    const detail = await getApplicationDetail(reference, lastName);
    if (detail === null) {
      return Response.json(
        { ok: false, error: `No Trump Account application found for ${reference.toUpperCase()}.` },
        { status: 404 },
      );
    }
    if ("error" in detail) {
      return Response.json({ ok: false, error: detail.error }, { status: 403 });
    }
    return Response.json({ ok: true, ...detail });
  } catch (err) {
    console.error("GET /api/applications/[reference] failed:", err);
    return Response.json({ ok: false, error: "Lookup failed." }, { status: 500 });
  }
}

export async function POST(req: Request, ctx: Ctx) {
  const { reference } = await ctx.params;
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action === "advance") {
      const result = await advanceApplication(reference);
      if (!result.ok) return Response.json(result, { status: 409 });
      const detail = await getApplicationDetail(reference);
      return Response.json({ ok: true, ...detail });
    }
    return Response.json({ ok: false, error: "Unknown action." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/applications/[reference] failed:", err);
    return Response.json({ ok: false, error: "Request failed." }, { status: 500 });
  }
}
