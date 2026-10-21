import { requireAdminSession } from "@/app/admin/_adminAuth";
import { getProgramStats, getRecentApplications, adminGetAllApplications } from "@/lib/service";
import { StatTile, StatusBadge } from "@/components/ui";
import { formatUSD } from "@/lib/program";
import Link from "next/link";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard" };

export default async function AdminDashboardPage() {
  await requireAdminSession();

  const [stats, recent] = await Promise.all([
    getProgramStats(),
    getRecentApplications(10),
  ]);

  const [pendingRow] = await db
    .select({
      pendingReview: sql<number>`sum(case when ${applications.status} in ('submitted','under_review','verification_required') then 1 else 0 end)::int`,
    })
    .from(applications);

  const pendingReview = Number(pendingRow?.pendingReview ?? 0);

  return (
    <div className="p-6">
      <h1 className="font-serif text-2xl font-bold text-gov-navy">Dashboard</h1>
      <p className="mt-1 text-sm text-gov-base">Live program overview</p>

      {/* Stat tiles */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          value={stats.totalApplications.toLocaleString()}
          label="Total Applications"
          tone="navy"
        />
        <StatTile
          value={pendingReview.toLocaleString()}
          label="Pending Review"
          tone="gold"
        />
        <StatTile
          value={stats.fundedAccounts.toLocaleString()}
          label="Funded Accounts"
          tone="white"
        />
        <StatTile
          value={formatUSD(stats.totalPostedCents)}
          label="Total Posted Deposits"
          tone="white"
        />
      </div>

      {/* Recent applications */}
      <div className="usa-card mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-gov-navy">
            Recent Applications
          </h2>
          <Link href="/admin/applications" className="text-sm text-gov-primary hover:underline">
            View all →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="usa-table w-full">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Child Name</th>
                <th>Guardian</th>
                <th>State</th>
                <th>Status</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.referenceNumber}>
                  <td>
                    <Link
                      href={`/admin/applications/${row.referenceNumber}`}
                      className="font-mono text-sm text-gov-primary hover:underline"
                    >
                      {row.referenceNumber}
                    </Link>
                  </td>
                  <td>
                    {row.childFirstName} {row.childLastName}
                  </td>
                  <td>{row.parentState}</td>
                  <td>{row.parentState}</td>
                  <td>
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="whitespace-nowrap text-sm text-gov-base">
                    {new Date(row.submittedAt).toLocaleDateString("en-US")}
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gov-base">
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
