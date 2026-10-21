import { addDocuments, addGuardianDeposit } from "@/lib/service";
import { DOCUMENT_TYPES } from "@/lib/program";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reference: string }> };

/** POST { kind: "documents" | "deposit", ... } */
export async function POST(req: Request, ctx: Ctx) {
  const { reference } = await ctx.params;
  try {
    const body = await req.json();
    const kind = String(body?.kind ?? "");

    if (kind === "documents") {
      const items = Array.isArray(body.documents) ? body.documents : [];
      const cleaned = items
        .filter((i: { docType?: string; fileName?: string }) => i?.docType && i?.fileName)
        .map((i: { docType: string; fileName: string; fileSize?: number; mimeType?: string }) => ({
          docType: DOCUMENT_TYPES.includes(i.docType as (typeof DOCUMENT_TYPES)[number])
            ? i.docType
            : String(i.docType).slice(0, 120),
          fileName: String(i.fileName).slice(0, 200),
          fileSize: Math.max(0, Math.round(Number(i.fileSize ?? 0))),
          mimeType: i.mimeType ? String(i.mimeType).slice(0, 120) : undefined,
        }));
      const result = await addDocuments(reference, cleaned);
      if (!result.ok) return Response.json(result, { status: 422 });
      return Response.json(result);
    }

    if (kind === "deposit") {
      const dollars = Number(body.amountDollars ?? 0);
      const amountCents = Math.round(dollars * 100);
      const result = await addGuardianDeposit(reference, amountCents, Boolean(body.recurring));
      if (!result.ok) return Response.json(result, { status: 422 });
      return Response.json(result);
    }

    return Response.json({ ok: false, error: "Unknown request kind." }, { status: 400 });
  } catch (err) {
    console.error("POST /api/applications/[reference]/actions failed:", err);
    return Response.json({ ok: false, error: "Request failed." }, { status: 500 });
  }
}
