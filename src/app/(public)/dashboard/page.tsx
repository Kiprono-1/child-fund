import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Callout, PageHero, SectionHeading, StatTile, StatusBadge } from "@/components/ui";
import { getSessionGuardian } from "@/lib/auth";
import { formatUSD } from "@/lib/program";
import { getApplicationsByGuardianId, getApplicationDetail } from "@/lib/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "View your Child Trust Fund account balance, deposit history and case status.",
};

const DEPOSIT_LABELS: Record<string, string> = {
  federal_seed: "Federal seed deposit",
  state_match: "State match",
  federal_supplement: "Federal birthday supplement",
  parent_contribution: "Guardian contribution",
  earnings: "Earnings",
};

const STATUS_CHIP: Record<string, string> = {
  scheduled: "usa-tag bg-gov-primary-lighter text-gov-primary-darker",
  processing: "usa-tag bg-[#fff8e8] text-[#7a5b00]",
  posted: "usa-tag bg-[#ddf9c7] text-gov-green-dark",
  returned: "usa-tag bg-[#fdf3f2] text-gov-red-dark",
};

export default async function DashboardPage() {
  const guardian = await getSessionGuardian();
  if (!guardian) {
    redirect("/login");
  }

  const appRows = await getApplicationsByGuardianId(guardian.guardianId);
  if (appRows.length === 0) {
    redirect("/apply");
  }

  // Use the most recent application for the main view
  const primary = appRows[0]!;
  const detail = await getApplicationDetail(primary.referenceNumber);

  // getApplicationDetail may return an error object or null — treat both as empty
  const deps =
    detail && "application" in detail ? detail.deposits : [];
  const events =
    detail && "application" in detail ? detail.events : [];
  const appDetail =
    detail && "application" in detail ? detail.application : null;

  // Money aggregates
  const postedDeps = deps.filter((d) => d.status === "posted");
  const balanceCents = postedDeps.reduce((acc, d) => acc + d.amountCents, 0);
  const scheduledCents = deps
    .filter((d) => d.status === "scheduled" || d.status === "processing")
    .reduce((acc, d) => acc + d.amountCents, 0);
  const federalCents = postedDeps
    .filter((d) => d.depositType === "federal_seed" || d.depositType === "federal_supplement")
    .reduce((acc, d) => acc + d.amountCents, 0);
  const stateCents = postedDeps
    .filter((d) => d.depositType === "state_match")
    .reduce((acc, d) => acc + d.amountCents, 0);
  const parentCents = postedDeps
    .filter((d) => d.depositType === "parent_contribution")
    .reduce((acc, d) => acc + d.amountCents, 0);

  // Serialize deposits for rendering (avoid raw Date objects in server JSX)
  const serializedDeps = deps.map((d) => ({
    id: d.id,
    depositType: d.depositType,
    amountCents: d.amountCents,
    status: d.status,
    description: d.description,
    postedAt: d.postedAt instanceof Date ? d.postedAt.toISOString() : d.postedAt,
    scheduledFor: d.scheduledFor instanceof Date ? d.scheduledFor.toISOString() : d.scheduledFor,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
  }));

  const recentEvents = events.slice(-5).reverse().map((ev) => ({
    id: ev.id,
    event: ev.event,
    detail: ev.detail,
    actor: ev.actor,
    createdAt: ev.createdAt instanceof Date ? ev.createdAt.toISOString() : ev.createdAt,
  }));

  const needsVerification =
    primary.status === "submitted" ||
    primary.status === "under_review" ||
    primary.status === "verification_required";

  const childName = `${primary.childFirstName} ${primary.childLastName}`;
  const statusStr = primary.status as string;
  const queryStr = `ref=${encodeURIComponent(primary.referenceNumber)}&last=${encodeURIComponent(primary.childLastName)}`;

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "My Dashboard" }]}
        eyebrow="Guardian account"
        title={`${childName}'s Child Trust Fund`}
        lede={
          <>
            Reference number:{" "}
            <strong className="font-mono text-gov-navy">{primary.referenceNumber}</strong>
          </>
        }
        actions={
          <>
            <StatusBadge status={statusStr} />
            {appDetail?.childAccountNumber && (
              <span className="text-sm text-gov-base">
                Account <span className="font-mono">{appDetail.childAccountNumber}</span>
              </span>
            )}
          </>
        }
      />

      {/* Multi-child switcher */}
      {appRows.length > 1 && (
        <section className="border-b border-gov-base-light bg-white py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wider text-gov-primary">
              Your registered children
            </p>
            <ul className="flex flex-wrap gap-2 list-none p-0 m-0">
              {appRows.map((app) => (
                <li key={app.referenceNumber}>
                  <Link
                    href={`/status?ref=${encodeURIComponent(app.referenceNumber)}&last=${encodeURIComponent(app.childLastName)}`}
                    className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-bold ${
                      app.referenceNumber === primary.referenceNumber
                        ? "border-gov-primary bg-gov-primary text-white"
                        : "border-gov-base-light bg-white text-gov-navy hover:border-gov-primary"
                    }`}
                  >
                    {app.childFirstName} {app.childLastName}
                    <StatusBadge status={app.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Verification callout */}
      {needsVerification && (
        <section className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Callout
              tone="warning"
              title="Complete identity verification to unlock your account"
            >
              Your application is being reviewed. To speed up approval, complete identity
              verification now.{" "}
              <Link href="/verify" className="font-bold underline">
                See verification options →
              </Link>
            </Callout>
          </div>
        </section>
      )}

      {/* Balance tiles */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading kicker="Account summary" title="Balance breakdown" />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              value={formatUSD(balanceCents)}
              label="Current balance"
              sub="Posted deposits"
              tone="navy"
            />
            <StatTile
              value={formatUSD(scheduledCents)}
              label="Pending"
              sub="Scheduled deposits"
              tone="white"
            />
            <StatTile
              value={formatUSD(federalCents)}
              label="Federal deposits"
              sub="Seed + supplements"
              tone="white"
            />
            <StatTile
              value={formatUSD(stateCents + parentCents)}
              label="State & guardian"
              sub="State match + contributions"
              tone="gold"
            />
          </div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="bg-gov-base-lightest py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading kicker="Guardian actions" title="What would you like to do?" />
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="usa-card p-5">
              <h3 className="m-0 mb-2 font-serif text-lg font-bold text-gov-navy">
                Make a contribution
              </h3>
              <p className="m-0 mb-4 text-sm text-gov-base">
                Add funds to {primary.childFirstName}&apos;s account. Your state may match a
                portion of your deposit.
              </p>
              <Link
                href={`/deposit?ref=${encodeURIComponent(primary.referenceNumber)}`}
                className="usa-button usa-button--primary"
              >
                Deposit funds
              </Link>
            </div>
            <div className="usa-card p-5">
              <h3 className="m-0 mb-2 font-serif text-lg font-bold text-gov-navy">
                Upload documents
              </h3>
              <p className="m-0 mb-4 text-sm text-gov-base">
                Submit your photo ID and {primary.childFirstName}&apos;s birth certificate to
                complete verification.
              </p>
              <Link
                href={`/status?${queryStr}`}
                className="usa-button usa-button--outline"
              >
                Go to tracker
              </Link>
            </div>
            <div className="usa-card p-5">
              <h3 className="m-0 mb-2 font-serif text-lg font-bold text-gov-navy">
                View full case
              </h3>
              <p className="m-0 mb-4 text-sm text-gov-base">
                Review your pipeline, events, and all deposit details for this application.
              </p>
              <Link
                href={`/status?${queryStr}`}
                className="usa-button usa-button--outline"
              >
                Open case tracker
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Deposit ledger */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading kicker="Deposit history" title="Transaction ledger" />
          {serializedDeps.length === 0 ? (
            <div className="mt-6">
              <Callout tone="info">
                No deposits yet. Deposits will appear here once your account is approved and funded.
              </Callout>
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto rounded border border-gov-base-light">
              <table className="usa-table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Type</th>
                    <th scope="col">Description</th>
                    <th scope="col" className="text-right">Amount</th>
                    <th scope="col">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {serializedDeps.map((dep) => {
                    const dateStr = dep.postedAt ?? dep.scheduledFor ?? dep.createdAt;
                    const date = dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
                    return (
                      <tr key={dep.id}>
                        <td className="tabular-nums text-sm">{date}</td>
                        <td className="text-sm font-bold text-gov-navy">
                          {DEPOSIT_LABELS[dep.depositType] ?? dep.depositType}
                        </td>
                        <td className="text-sm text-gov-base">{dep.description}</td>
                        <td className="text-right tabular-nums text-sm font-bold">
                          {formatUSD(dep.amountCents)}
                        </td>
                        <td>
                          <span className={STATUS_CHIP[dep.status] ?? "usa-tag"}>
                            {dep.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* Recent case events */}
      {recentEvents.length > 0 && (
        <section className="bg-gov-base-lightest py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <SectionHeading kicker="Case history" title="Recent activity" />
            <ul className="mt-6 list-none space-y-3 p-0">
              {recentEvents.map((ev) => {
                const date = ev.createdAt
                  ? new Date(ev.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "";
                return (
                  <li key={ev.id} className="usa-card flex items-start gap-4 p-4">
                    <div className="flex-1">
                      <p className="m-0 text-sm font-bold text-gov-navy">
                        {ev.event.replace(/_/g, " ")}
                      </p>
                      {ev.detail && (
                        <p className="m-0 mt-0.5 text-sm text-gov-base">{ev.detail}</p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gov-base">{date}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
