import { getAdminSession } from "@/lib/auth";
import { getProgramStats } from "@/lib/service";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  try {
    const stats = await getProgramStats();

    const [pendingRow] = await db
      .select({
        pendingReview: sql<number>`sum(case when ${applications.status} in ('submitted','under_review','verification_required') then 1 else 0 end)::int`,
      })
      .from(applications);

    return Response.json({
      ok: true,
      stats: {
        totalApplications: stats.totalApplications,
        pendingReview: Number(pendingRow?.pendingReview ?? 0),
        fundedAccounts: stats.fundedAccounts,
        totalPostedCents: stats.totalPostedCents,
      },
    });
  } catch (err) {
    console.error("Admin stats error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
