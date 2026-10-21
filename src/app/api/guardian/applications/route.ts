import { getSessionGuardian } from "@/lib/auth";
import { getApplicationsByGuardianId } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const guardian = await getSessionGuardian();
    if (!guardian) {
      return Response.json({ ok: false, error: "Not authenticated." }, { status: 401 });
    }
    const rows = await getApplicationsByGuardianId(guardian.guardianId);
    // Serialize Date objects → ISO strings so the JSON response is stable
    const applications = rows.map((r) => ({
      referenceNumber: r.referenceNumber,
      status: r.status,
      childFirstName: r.childFirstName,
      childLastName: r.childLastName,
      childDob: r.childDob,
      parentState: r.parentState,
      submittedAt: r.submittedAt instanceof Date ? r.submittedAt.toISOString() : r.submittedAt,
    }));
    return Response.json({ ok: true, applications });
  } catch (err) {
    console.error("GET /api/guardian/applications failed:", err);
    return Response.json({ ok: false, error: "Failed to load applications." }, { status: 500 });
  }
}
