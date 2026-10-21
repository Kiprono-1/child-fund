import { createInquiry } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
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
    console.error("POST /api/inquiries failed:", err);
    return Response.json({ ok: false, error: "Request failed." }, { status: 500 });
  }
}
