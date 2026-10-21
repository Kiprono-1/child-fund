import { getSessionGuardian } from "@/lib/auth";
import { getGuardianAccountById } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const guardian = await getSessionGuardian();
    if (!guardian) {
      return Response.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }
    const account = await getGuardianAccountById(guardian.guardianId);
    return Response.json({
      ok: true,
      guardian: { id: guardian.guardianId, email: guardian.email, fullName: account?.fullName ?? "" },
    });
  } catch (err) {
    console.error("GET /api/auth/me failed:", err);
    return Response.json({ ok: false, error: "Failed to read session." }, { status: 500 });
  }
}
