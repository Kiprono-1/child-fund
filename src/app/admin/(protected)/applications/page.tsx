import { requireAdminSession } from "@/app/admin/_adminAuth";
import { adminGetAllApplications, adminGetApplicationBalances } from "@/lib/service";
import { StatusBadge } from "@/components/ui";
import { formatUSD } from "@/lib/program";
import ApplicationsFilter from "@/components/admin/ApplicationsFilter";
import Link from "next/link";
import { Suspense } from "react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Applications — Admin" };

function TierBadge({ tier }: { tier: string }) {
  const styles =
    tier === "automatic"
      ? "bg-gov-primary-lighter text-gov-primary-darker"
      : tier === "standard"
        ? "bg-[#ddf9c7] text-gov-green-dark"
        : "bg-gov-base-light text-gov-navy";
  return <span className={`usa-tag ${styles}`}>{tier}</span>;
}

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; search?: string }>;
}) {
  await requireAdminSession();

  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const status = sp.status ?? undefined;
  const search = sp.search ?? undefined;

  const { rows, total, pages } = await adminGetAllApplications({ page, status, search });

  const balanceMap = await adminGetApplicationBalances(rows.map((r) => r.id));

  return (
    <div className="p-6">
      <h1 className="font-serif text-2xl font-bold text-gov-navy">Applications</h1>
      <p className="mt-1 text-sm text-gov-base">
        {total.toLocaleString()} total · page {page} of {Math.max(1, pages)}
      </p>

      <div className="mt-4">
        <Suspense>
          <ApplicationsFilter />
        </Suspense>
      </div>

      <div className="usa-card mt-6 overflow-x-auto">
        <table className="usa-table w-full">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Child Name</th>
              <th>Guardian</th>
              <th>State</th>
              <th>Tier</th>
              <th>Status</th>
              <th>Balance</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.referenceNumber}>
                <td className="font-mono text-sm">{row.referenceNumber}</td>
                <td>
                  {row.childFirstName} {row.childLastName}
                </td>
                <td>{row.parentFullName}</td>
                <td>{row.parentState}</td>
                <td>
                  <TierBadge tier={row.participationTier} />
                </td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td className="font-semibold tabular-nums text-sm">
                  {formatUSD(balanceMap.get(row.id) ?? 0)}
                </td>
                <td className="whitespace-nowrap text-sm text-gov-base">
                  {new Date(row.submittedAt).toLocaleDateString("en-US")}
                </td>
                <td>
                  <Link
                    href={`/admin/applications/${row.referenceNumber}`}
                    className="text-sm text-gov-primary hover:underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="py-8 text-center text-gov-base">
                  No applications match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="mt-4 flex items-center gap-3">
          {page > 1 && (
            <Link
              href={`/admin/applications?page=${page - 1}${status ? `&status=${status}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className="usa-button usa-button--outline text-sm"
            >
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gov-base">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link
              href={`/admin/applications?page=${page + 1}${status ? `&status=${status}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className="usa-button usa-button--outline text-sm"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
