import { requireAdminSession } from "@/app/admin/_adminAuth";
import { adminGetDashboardStats, adminGetAllApplications } from "@/lib/service";
import { StatusBadge } from "@/components/ui";
import { formatUSD } from "@/lib/program";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin Dashboard" };

const TYPE_LABELS: Record<string, string> = {
  federal_seed: "Federal Seed",
  state_match: "State Match",
  federal_supplement: "Federal Supplement",
  parent_contribution: "Guardian Contribution",
  earnings: "Earnings",
};

function TierBadge({ tier }: { tier: string }) {
  const styles =
    tier === "automatic"
      ? "bg-gov-primary-lighter text-gov-primary-darker"
      : tier === "standard"
        ? "bg-[#ddf9c7] text-gov-green-dark"
        : "bg-gov-base-light text-gov-navy";
  return <span className={`usa-tag ${styles}`}>{tier}</span>;
}

function tierLabel(tier: string) {
  if (tier === "automatic") return "Automatic Enrollment";
  if (tier === "standard") return "Guardian-Funded";
  return "Legacy";
}

function tierBarColor(tier: string) {
  if (tier === "automatic") return "bg-gov-navy";
  if (tier === "standard") return "bg-gov-primary";
  return "bg-gov-base";
}

export default async function AdminDashboardPage() {
  await requireAdminSession();

  const [stats, recentResult] = await Promise.all([
    adminGetDashboardStats(),
    adminGetAllApplications({ page: 1 }),
  ]);
  const recent = recentResult.rows.slice(0, 10);

  return (
    <div className="p-6">
      <h1 className="font-serif text-2xl font-bold text-gov-navy">Dashboard</h1>
      <p className="mt-1 text-sm text-gov-base">Live program overview</p>

      {/* ---- 6 stat tiles — 2-col on mobile, 3-col on lg ---- */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <div
          className="usa-card p-5 admin-stat-tile"
          style={{ borderLeft: "4px solid var(--color-gov-navy)" }}
        >
          <p className="font-serif text-3xl font-bold text-gov-navy tabular-nums">
            {stats.totalApplications.toLocaleString()}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gov-base">
            Total Applications
          </p>
        </div>

        <div
          className="usa-card p-5 admin-stat-tile"
          style={{ borderLeft: "4px solid var(--color-gov-accent)" }}
        >
          <p className="font-serif text-3xl font-bold text-gov-navy tabular-nums">
            {stats.pendingReview.toLocaleString()}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gov-base">
            Pending Review
          </p>
        </div>

        <div
          className="usa-card p-5 admin-stat-tile"
          style={{ borderLeft: "4px solid var(--color-gov-primary)" }}
        >
          <p className="font-serif text-3xl font-bold text-gov-navy tabular-nums">
            {stats.approvedAccounts.toLocaleString()}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gov-base">
            Approved
          </p>
        </div>

        <div
          className="usa-card p-5 admin-stat-tile"
          style={{ borderLeft: "4px solid var(--color-gov-green)" }}
        >
          <p className="font-serif text-3xl font-bold text-gov-navy tabular-nums">
            {stats.fundedAccounts.toLocaleString()}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gov-base">
            Funded
          </p>
        </div>

        <div
          className="usa-card p-5 admin-stat-tile"
          style={{ borderLeft: "4px solid var(--color-gov-primary-dark, var(--color-gov-primary))" }}
        >
          <p className="font-serif text-3xl font-bold text-gov-navy tabular-nums">
            {formatUSD(stats.totalPostedCents)}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gov-base">
            Total Posted Deposits
          </p>
        </div>

        <div
          className="usa-card p-5 admin-stat-tile"
          style={{ borderLeft: "4px solid var(--color-gov-base)" }}
        >
          <p className="font-serif text-3xl font-bold text-gov-navy tabular-nums">
            {stats.totalGuardianAccounts.toLocaleString()}
          </p>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gov-base">
            Total Users
          </p>
        </div>
      </div>

      {/* ---- Breakdowns grid ---- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Tier breakdown */}
        <div className="usa-card p-5">
          <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">
            Tier Breakdown
          </h2>
          <div className="space-y-4">
            {stats.tierBreakdown.map((tier) => (
              <div key={tier.tier} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gov-navy capitalize">
                    {tierLabel(tier.tier)}
                  </span>
                  <span className="text-gov-base">
                    {tier.count.toLocaleString()} ({tier.pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded bg-gov-base-light">
                  <div
                    className={`h-full rounded ${tierBarColor(tier.tier)}`}
                    style={{ width: `${tier.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline status distribution */}
        <div className="usa-card p-5">
          <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">
            Pipeline Status
          </h2>
          <div className="space-y-2">
            {stats.statusDistribution.map((s) => (
              <div key={s.status} className="flex items-center justify-between text-sm">
                <StatusBadge status={s.status} />
                <span className="font-semibold tabular-nums text-gov-navy">
                  {s.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Deposit type breakdown */}
        <div className="usa-card overflow-x-auto p-5">
          <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">
            Deposits by Type (Posted)
          </h2>
          {stats.depositTypeTotals.length === 0 ? (
            <p className="text-sm text-gov-base">No posted deposits yet.</p>
          ) : (
            <table className="usa-table w-full text-sm">
              <caption className="sr-only">Deposit Type Breakdown (Posted)</caption>
              <thead>
                <tr>
                  <th>Type</th>
                  <th className="text-right">Total Posted</th>
                </tr>
              </thead>
              <tbody>
                {stats.depositTypeTotals.map((d) => (
                  <tr key={d.depositType}>
                    <td>{TYPE_LABELS[d.depositType] ?? d.depositType}</td>
                    <td className="text-right font-semibold tabular-nums">
                      {formatUSD(d.totalCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ---- Recent applications ---- */}
      <div className="usa-card mt-8 p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-gov-navy">
            Recent Applications
          </h2>
          <Link href="/admin/applications" className="text-sm text-gov-primary hover:underline">
            View all →
          </Link>
        </div>

        {/* Mobile card list — hidden on sm+ */}
        <div className="space-y-3 sm:hidden">
          {recent.map((row) => (
            <div key={row.referenceNumber} className="usa-card p-4">
              <div className="flex items-start justify-between gap-2">
                <Link
                  href={`/admin/applications/${row.referenceNumber}`}
                  className="font-mono text-sm font-bold text-gov-primary hover:underline"
                >
                  {row.referenceNumber}
                </Link>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-1 text-sm font-medium text-gov-navy">
                {row.childFirstName} {row.childLastName}
              </p>
              <p className="mt-0.5 text-xs text-gov-base">
                {row.parentFullName} · {row.parentState}
              </p>
              <p className="mt-1 text-xs text-gov-base">
                Submitted {new Date(row.submittedAt).toLocaleDateString("en-US")}
              </p>
            </div>
          ))}
          {recent.length === 0 && (
            <p className="py-4 text-center text-sm text-gov-base">No applications yet.</p>
          )}
        </div>

        {/* Desktop table — hidden on mobile */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="usa-table w-full">
            <thead>
              <tr>
                <th>Reference</th>
                <th>Child Name</th>
                <th>Guardian</th>
                <th>State</th>
                <th>Tier</th>
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
                  <td>{row.parentFullName}</td>
                  <td>{row.parentState}</td>
                  <td>
                    <TierBadge tier={row.participationTier} />
                  </td>
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
                  <td colSpan={7} className="py-6 text-center text-gov-base">
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
