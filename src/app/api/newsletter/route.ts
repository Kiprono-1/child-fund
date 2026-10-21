import { subscribeNewsletter } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await subscribeNewsletter(String(body?.email ?? ""), body?.state);
    if (!result.ok) return Response.json(result, { status: 422 });
    return Response.json(result);
  } catch (err) {
    console.error("POST /api/newsletter failed:", err);
    return Response.json({ ok: false, error: "Request failed." }, { status: 500 });
  }
}
