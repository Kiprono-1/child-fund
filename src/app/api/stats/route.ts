import { createInquiry, getProgramStats, subscribeNewsletter } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getProgramStats();
    return Response.json({ ok: true, stats });
  } catch (err) {
    console.error("GET /api/stats failed:", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (body?.kind === "newsletter") {
      const result = await subscribeNewsletter(String(body.email ?? ""), body.state);
      if (!result.ok) return Response.json(result, { status: 422 });
      return Response.json(result);
    }
    const result = await createInquiry({
      topic: String(body?.topic ?? "general"),
      fullName: String(body?.fullName ?? ""),
      email: String(body?.email ?? ""),
      phone: body?.phone ? String(body.phone) : undefined,
      state: body?.state ? String(body.state) : undefined,
      referenceNumber: body?.referenceNumber ? String(body.referenceNumber) : undefined,
      message: String(body?.message ?? ""),
    });
    if (!result.ok) return Response.json(result, { status: 422 });
    return Response.json(result);
  } catch (err) {
    console.error("POST /api/stats failed:", err);
    return Response.json({ ok: false, error: "Request failed." }, { status: 500 });
  }
}
