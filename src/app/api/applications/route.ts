import { createApplication, getProgramStats, type NewApplicationInput } from "@/lib/service";
import { getSessionGuardian } from "@/lib/auth";
import { MINIMUM_INITIAL_DEPOSIT_CENTS } from "@/lib/program";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Partial<NewApplicationInput>;
    const guardian = await getSessionGuardian();

    const payload: NewApplicationInput = {
      parentFullName: String(body.parentFullName ?? ""),
      parentEmail: String(body.parentEmail ?? ""),
      parentPhone: String(body.parentPhone ?? ""),
      parentDob: String(body.parentDob ?? ""),
      parentSsnLast4: String(body.parentSsnLast4 ?? ""),
      parentRelationship: String(body.parentRelationship ?? ""),
      parentAddressLine1: String(body.parentAddressLine1 ?? ""),
      parentAddressLine2: body.parentAddressLine2 ? String(body.parentAddressLine2) : undefined,
      parentCity: String(body.parentCity ?? ""),
      parentState: String(body.parentState ?? ""),
      parentZip: String(body.parentZip ?? ""),
      childFirstName: String(body.childFirstName ?? ""),
      childMiddleName: body.childMiddleName ? String(body.childMiddleName) : undefined,
      childLastName: String(body.childLastName ?? ""),
      childDob: String(body.childDob ?? ""),
      childGender: body.childGender ? String(body.childGender) : undefined,
      childSsnLast4: String(body.childSsnLast4 ?? ""),
      childBirthCity: body.childBirthCity ? String(body.childBirthCity) : undefined,
      childBirthState: body.childBirthState ? String(body.childBirthState) : undefined,
      accountType: String(body.accountType ?? ""),
      custodianBank: String(body.custodianBank ?? ""),
      routingNumber: String(body.routingNumber ?? ""),
      accountLast4: String(body.accountLast4 ?? ""),
      monthlyContribution: Math.max(0, Math.round(Number(body.monthlyContribution ?? 0))),
      verificationMethod: String(body.verificationMethod ?? ""),
      identityConsent: Boolean(body.identityConsent),
      penaltyOfPerjury: Boolean(body.penaltyOfPerjury),
      electronicSignature: String(body.electronicSignature ?? ""),
      guardianAccountId: guardian?.guardianId,
    };

    // Server-side guard: initial deposit must meet the minimum when provided.
    if (payload.monthlyContribution > 0 && payload.monthlyContribution < MINIMUM_INITIAL_DEPOSIT_CENTS) {
      return Response.json(
        {
          ok: false,
          errors: { monthlyContribution: "Initial deposit must be at least $1,500.00 per child." },
        },
        { status: 422 },
      );
    }

    const result = await createApplication(payload);
    if (!result.ok) {
      return Response.json({ ok: false, errors: result.errors }, { status: 422 });
    }
    return Response.json(result, { status: 201 });
  } catch (err) {
    console.error("POST /api/applications failed:", err);
    return Response.json(
      { ok: false, errors: { form: "The application could not be submitted. Please try again." } },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const stats = await getProgramStats();
    return Response.json({ ok: true, stats });
  } catch (err) {
    console.error("GET /api/applications failed:", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
