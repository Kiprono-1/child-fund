import { getAdminSession } from "@/lib/auth";
import { adminUpdateSiteSettings, getSiteContactInfo } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const ok = await getAdminSession();
  if (!ok) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const settings = await getSiteContactInfo();
  return Response.json({ ok: true, settings });
}

export async function PUT(req: Request) {
  const ok = await getAdminSession();
  if (!ok) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const body = (await req.json()) as {
      contactPhone?: string;
      contactEmail?: string;
      helplineHours?: string;
    };
    const result = await adminUpdateSiteSettings(body);
    if (!result.ok) return Response.json(result, { status: 500 });
    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
}
