import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Callout, StatusBadge } from "@/components/ui";
import CopyReferenceButton from "@/components/CopyReferenceButton";
import { getSessionGuardian } from "@/lib/auth";
import { formatUSD, tierForDob } from "@/lib/program";
import { getApplicationsByGuardianId, getApplicationDetail, getBalancesByGuardianId } from "@/lib/service";
import { getState } from "@/lib/states";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Dashboard",
  description: "View your Child Trust Fund account balance, deposit history and case status.",
};

const DEPOSIT_LABELS: Record<string, string> = {
  federal_seed: "Federal Seed",
  state_match: "State Match",
  federal_supplement: "Fed. Supplement",
  parent_contribution: "Contribution",
  earnings: "Earnings",
};

const DEPOSIT_STATUS_CLASS: Record<string, string> = {
  posted: "bg-[#ddf9c7] text-gov-green-dark",
  scheduled: "bg-gov-primary-lighter text-gov-primary-darker",
  processing: "bg-gov-primary-lighter text-gov-primary-darker",
  returned: "bg-[#fdf3f2] text-gov-red-dark",
};

const PIPELINE_STEPS = [
  { key: "submitted", label: "Submitted" },
  { key: "under_review", label: "Under Review" },
  { key: "verification_required", label: "Verify Identity" },
  { key: "approved", label: "Approved" },
  { key: "funded", label: "Funded" },
];

/** Relative time label ("3 days ago", "just now", etc.) */
function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

type Props = {
  searchParams: Promise<{ child?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const guardian = await getSessionGuardian();
  if (!guardian) {
    redirect("/login");
  }

  const appRows = await getApplicationsByGuardianId(guardian.guardianId);
  if (appRows.length === 0) {
    redirect("/apply");
  }

  // Fetch per-child balances in one query
  const balanceMap = new Map(
    (await getBalancesByGuardianId(guardian.guardianId)).map((b) => [
      b.referenceNumber,
      b.balanceCents,
    ]),
  );

  // Determine which child to show
  const sp = await searchParams;
  const requestedRef = sp.child;
  const foundRow = requestedRef
    ? appRows.find((a) => a.referenceNumber === requestedRef)
    : undefined;
  const selectedRow = foundRow ?? appRows[0]!;
  const selectedRef = selectedRow.referenceNumber;

  // Fetch full detail for selected application
  const detail = await getApplicationDetail(
    selectedRef,
    undefined,
    guardian.guardianId,
  );

  const hasDetail = detail !== null && !("error" in detail);
  const app = hasDetail ? detail.application : null;
  const deps = hasDetail ? detail.deposits : [];
  const events = hasDetail ? detail.events : [];

  // --- Money aggregates ---
  const postedDeps = deps.filter((d) => d.status === "posted");
  const pendingDeps = deps.filter(
    (d) => d.status === "scheduled" || d.status === "processing",
  );
  const parentDeps = postedDeps.filter(
    (d) => d.depositType === "parent_contribution",
  );
  const govDeps = postedDeps.filter(
    (d) =>
      d.depositType === "federal_seed" ||
      d.depositType === "state_match" ||
      d.depositType === "federal_supplement" ||
      d.depositType === "earnings",
  );

  const balanceCents = postedDeps.reduce((acc, d) => acc + d.amountCents, 0);
  const pendingCents = pendingDeps.reduce((acc, d) => acc + d.amountCents, 0);
  const parentCents = parentDeps.reduce((acc, d) => acc + d.amountCents, 0);
  const govCents = govDeps.reduce((acc, d) => acc + d.amountCents, 0);

  // --- Serialise deposits (Date → ISO string) ---
  const serializedDeps = deps.map((d) => ({
    id: d.id,
    depositType: d.depositType,
    amountCents: d.amountCents,
    status: d.status,
    description: d.description,
    postedAt: d.postedAt instanceof Date ? d.postedAt.toISOString() : (d.postedAt ?? null),
    scheduledFor:
      d.scheduledFor instanceof Date
        ? d.scheduledFor.toISOString()
        : (d.scheduledFor ?? null),
    createdAt:
      d.createdAt instanceof Date ? d.createdAt.toISOString() : (d.createdAt ?? null),
  }));

  // --- Pipeline ---
  const currentStatus = selectedRow.status as string;
  const isRejected = currentStatus === "rejected";
  const currentStepIndex = PIPELINE_STEPS.findIndex((s) => s.key === currentStatus);
  const effectiveIndex = currentStepIndex === -1 ? 0 : currentStepIndex;

  // Last status event
  const lastEvent = [...events].reverse()[0] ?? null;
  const lastEventIso =
    lastEvent?.createdAt instanceof Date
      ? lastEvent.createdAt.toISOString()
      : (lastEvent?.createdAt ?? null);

  // --- Account info ---
  const childDob = app?.childDob ?? selectedRow.childDob;
  const tierInfo = tierForDob(childDob);
  const stateInfo = getState(app?.parentState ?? selectedRow.parentState);
  const verificationStatus = app?.verificationStatus ?? "not_started";

  const childName = `${selectedRow.childFirstName} ${selectedRow.childLastName}`;
  const childDobFormatted = childDob
    ? new Date(`${childDob}T00:00:00`).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const earlyPipeline =
    currentStatus === "submitted" ||
    currentStatus === "under_review" ||
    currentStatus === "verification_required";

  const queryStr = `ref=${encodeURIComponent(selectedRef)}&last=${encodeURIComponent(selectedRow.childLastName)}`;

  // Verification dot color
  const verificationDotClass =
    verificationStatus === "verified"
      ? "bg-gov-green"
      : verificationStatus === "in_progress" ||
          verificationStatus === "in_review" ||
          verificationStatus === "awaiting_documents"
        ? "bg-gov-accent"
        : "bg-gov-base border border-gov-base-light";

  const verificationLabel =
    verificationStatus === "verified"
      ? "Verified"
      : verificationStatus === "in_progress"
        ? "In progress"
        : verificationStatus === "in_review"
          ? "In review"
          : verificationStatus === "awaiting_documents"
            ? "Documents needed"
            : "Not started";

  return (
    <>
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section
        className="text-white"
        style={{
          background: "linear-gradient(135deg, #112e51 0%, #1a4480 100%)",
        }}
      >
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-1.5 text-[0.78rem] text-white/70">
              <li>
                <a href="/" className="hover:text-white transition-colors">
                  Home
                </a>
              </li>
              <li aria-hidden="true">›</li>
              <li className="font-semibold text-white" aria-current="page">
                My Dashboard
              </li>
            </ol>
          </nav>

          <p className="m-0 mb-1 text-xs font-bold uppercase tracking-[0.18em] text-gov-accent">
            Guardian account
          </p>
          <h1 className="font-serif text-3xl font-bold leading-tight text-white sm:text-4xl">
            {childName}&apos;s Trust Fund
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm text-gov-accent">{selectedRef}</span>
            <StatusBadge status={currentStatus} />
          </div>

          <p className="mt-3 max-w-xl text-sm text-white/80">
            Every contribution grows tax-free until {selectedRow.childFirstName} turns 18.
          </p>
        </div>
      </section>

      {/* ── Children folder-card grid (multi-child only) ─────────── */}
      {appRows.length > 1 && (
        <section className="border-b border-gov-base-light bg-white py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gov-primary">
              Your Registered Children
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {appRows.map((row) => {
                const isSelected = row.referenceNumber === selectedRef;
                const childBalance = balanceMap.get(row.referenceNumber) ?? 0;
                return (
                  <Link
                    key={row.referenceNumber}
                    href={`/dashboard?child=${encodeURIComponent(row.referenceNumber)}`}
                    className={`block rounded-lg p-4 transition-colors no-underline cursor-pointer ${
                      isSelected
                        ? "border-2 border-gov-primary bg-gov-primary-lightest"
                        : "border border-gov-base-light bg-white hover:border-gov-primary"
                    }`}
                  >
                    {/* Folder tab accent */}
                    <div
                      className={`mb-3 h-1 w-8 rounded-full ${
                        isSelected ? "bg-gov-primary" : "bg-gov-base-light"
                      }`}
                      aria-hidden="true"
                    />
                    <p className="m-0 font-serif font-bold text-gov-navy leading-snug">
                      {row.childFirstName} {row.childLastName}
                    </p>
                    <p className="m-0 mt-1 font-mono text-xs text-gov-base">
                      {row.referenceNumber}
                    </p>
                    <p className="m-0 mt-2 font-serif text-xl font-bold tabular-nums text-gov-navy">
                      {formatUSD(childBalance)}
                    </p>
                    <div className="mt-2">
                      <StatusBadge status={row.status} />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Balance tiles ──────────────────────────────────────────── */}
      <section className="bg-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Current balance */}
            <div
              className="admin-balance-tile admin-stat-tile"
              style={{ borderTop: "4px solid var(--color-gov-green)" }}
            >
              <div className="text-2xl mb-1">💰</div>
              <p className="m-0 font-serif text-3xl font-bold text-gov-navy tabular-nums">
                {formatUSD(balanceCents)}
              </p>
              <p className="m-0 mt-1 text-xs font-bold uppercase tracking-wider text-gov-navy">
                Current Balance
              </p>
              <p className="m-0 mt-0.5 text-xs text-gov-base">
                {postedDeps.length} posted deposit{postedDeps.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Pending */}
            <div
              className="admin-balance-tile admin-stat-tile"
              style={{ borderTop: "4px solid var(--color-gov-accent)" }}
            >
              <div className="text-2xl mb-1">⏳</div>
              <p className="m-0 font-serif text-3xl font-bold text-gov-navy tabular-nums">
                {formatUSD(pendingCents)}
              </p>
              <p className="m-0 mt-1 text-xs font-bold uppercase tracking-wider text-gov-navy">
                Pending
              </p>
              <p className="m-0 mt-0.5 text-xs text-gov-base">
                {pendingDeps.length} pending
              </p>
            </div>

            {/* Your contributions */}
            <div
              className="admin-balance-tile admin-stat-tile"
              style={{ borderTop: "4px solid var(--color-gov-primary)" }}
            >
              <div className="text-2xl mb-1">🤝</div>
              <p className="m-0 font-serif text-3xl font-bold text-gov-navy tabular-nums">
                {formatUSD(parentCents)}
              </p>
              <p className="m-0 mt-1 text-xs font-bold uppercase tracking-wider text-gov-navy">
                Your Contributions
              </p>
              <p className="m-0 mt-0.5 text-xs text-gov-base">
                {parentDeps.length} contribution{parentDeps.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Gov't Funding */}
            <div
              className="admin-balance-tile admin-stat-tile"
              style={{ borderTop: "4px solid var(--color-gov-navy)" }}
            >
              <div className="text-2xl mb-1">🏛️</div>
              <p className="m-0 font-serif text-3xl font-bold text-gov-navy tabular-nums">
                {formatUSD(govCents)}
              </p>
              <p className="m-0 mt-1 text-xs font-bold uppercase tracking-wider text-gov-navy">
                Gov&apos;t Funding
              </p>
              <p className="m-0 mt-0.5 text-xs text-gov-base">Federal + State match</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Verification callout ───────────────────────────────────── */}
      {earlyPipeline && (
        <section className="py-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <Callout tone="warning" title="Complete identity verification to unlock your account">
              Your application is being reviewed. Complete identity verification to speed up
              approval.{" "}
              <Link href="/verify" className="font-bold underline">
                See verification options →
              </Link>
            </Callout>
          </div>
        </section>
      )}

      {/* ── Two-column body ────────────────────────────────────────── */}
      <section className="bg-gov-base-lightest py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {!hasDetail && (
            <div className="mb-6">
              <Callout tone="warning" title="Could not load account details">
                There was a problem loading this account. Please{" "}
                <Link href="/contact" className="font-bold underline">
                  contact support
                </Link>{" "}
                if the problem persists.
              </Callout>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            {/* ── Left: Deposit history ─────────────────────────── */}
            <div>
              <h2 className="mb-4 font-serif text-xl font-bold text-gov-navy">
                Deposit History
              </h2>

              {serializedDeps.length === 0 ? (
                <Callout tone="info">
                  No deposits posted yet. Your account is being set up.{" "}
                  <Link href="/contact" className="font-bold underline">
                    Contact us
                  </Link>{" "}
                  if you have questions.
                </Callout>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto rounded border border-gov-base-light md:block">
                    <table className="usa-table">
                      <thead>
                        <tr>
                          <th scope="col">Type</th>
                          <th scope="col">Description</th>
                          <th scope="col" className="text-right">
                            Amount
                          </th>
                          <th scope="col">Status</th>
                          <th scope="col">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {serializedDeps.map((dep) => {
                          const dateStr =
                            dep.postedAt ?? dep.scheduledFor ?? dep.createdAt;
                          const date = dateStr
                            ? new Date(dateStr).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "—";
                          const desc =
                            dep.description && dep.description.length > 60
                              ? dep.description.slice(0, 57) + "…"
                              : (dep.description ?? "");
                          const statusCls =
                            DEPOSIT_STATUS_CLASS[dep.status] ?? "bg-gov-base-lighter text-gov-navy";
                          return (
                            <tr key={dep.id}>
                              <td className="text-sm font-bold text-gov-navy">
                                {DEPOSIT_LABELS[dep.depositType] ?? dep.depositType}
                              </td>
                              <td className="text-sm text-gov-base">{desc}</td>
                              <td className="text-right tabular-nums text-sm font-bold">
                                {formatUSD(dep.amountCents)}
                              </td>
                              <td>
                                <span
                                  className={`usa-tag ${statusCls}`}
                                >
                                  {dep.status}
                                </span>
                              </td>
                              <td className="tabular-nums text-sm text-gov-base">{date}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile card list */}
                  <div className="space-y-3 md:hidden">
                    {serializedDeps.map((dep) => {
                      const dateStr =
                        dep.postedAt ?? dep.scheduledFor ?? dep.createdAt;
                      const date = dateStr
                        ? new Date(dateStr).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—";
                      const statusCls =
                        DEPOSIT_STATUS_CLASS[dep.status] ?? "bg-gov-base-lighter text-gov-navy";
                      return (
                        <div
                          key={dep.id}
                          className="usa-card p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="m-0 text-sm font-bold text-gov-navy">
                                {DEPOSIT_LABELS[dep.depositType] ?? dep.depositType}
                              </p>
                              {dep.description && (
                                <p className="m-0 mt-0.5 truncate text-xs text-gov-base">
                                  {dep.description}
                                </p>
                              )}
                              <p className="m-0 mt-1 text-xs text-gov-base">{date}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="m-0 font-serif text-xl font-bold text-gov-navy tabular-nums">
                                {formatUSD(dep.amountCents)}
                              </p>
                              <span className={`usa-tag ${statusCls} mt-1`}>
                                {dep.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* ── Right: Quick actions + Account info ──────────── */}
            <div className="space-y-6">
              {/* Quick actions */}
              <div className="usa-card p-5">
                <h2 className="mb-3 font-serif text-lg font-bold text-gov-navy">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <Link
                    href={`/deposit?ref=${encodeURIComponent(selectedRef)}`}
                    className="usa-button usa-button--primary block w-full text-center"
                  >
                    💳 Make a Contribution
                  </Link>
                  <Link
                    href={`/status?${queryStr}`}
                    className="usa-button usa-button--outline-dark block w-full text-center"
                  >
                    📄 View Full Case Details
                  </Link>
                  <Link
                    href="/contact"
                    className="usa-button usa-button--outline-dark block w-full text-center"
                  >
                    ✉️ Contact Support
                  </Link>
                </div>
              </div>

              {/* Account info */}
              <div className="usa-card p-5 space-y-4">
                <h2 className="m-0 font-serif text-lg font-bold text-gov-navy">
                  Account Info
                </h2>

                {/* Child */}
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-base">
                    Child
                  </p>
                  <p className="m-0 mt-0.5 font-semibold text-gov-navy">{childName}</p>
                  <p className="m-0 text-sm text-gov-base">Born {childDobFormatted}</p>
                </div>

                {/* Reference */}
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-base">
                    Reference Number
                  </p>
                  <div className="mt-0.5 flex items-center">
                    <span className="font-mono text-sm font-semibold text-gov-navy">
                      {selectedRef}
                    </span>
                    <CopyReferenceButton text={selectedRef} />
                  </div>
                </div>

                {/* Account number */}
                {app?.childAccountNumber && (
                  <div>
                    <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-base">
                      Account Number
                    </p>
                    <p className="m-0 mt-0.5 font-mono text-sm text-gov-navy">
                      {app.childAccountNumber}
                    </p>
                  </div>
                )}

                {/* Tier */}
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-base">
                    Program Tier
                  </p>
                  <p className="m-0 mt-0.5 font-semibold text-gov-navy">{tierInfo.label}</p>
                  <p className="m-0 mt-0.5 text-xs text-gov-base leading-relaxed">
                    {tierInfo.summary.length > 120
                      ? tierInfo.summary.slice(0, 117) + "…"
                      : tierInfo.summary}
                  </p>
                </div>

                {/* Guardian */}
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-base">
                    Guardian
                  </p>
                  <p className="m-0 mt-0.5 font-semibold text-gov-navy">
                    {app?.parentFullName ?? "—"}
                  </p>
                  {stateInfo && (
                    <p className="m-0 text-xs text-gov-base">{stateInfo.name}</p>
                  )}
                </div>

                {/* Verification */}
                <div>
                  <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-base">
                    Identity Verification
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full ${verificationDotClass}`}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-gov-navy">
                      {verificationLabel}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pipeline step indicator ────────────────────────────────── */}
      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <h2 className="mb-6 font-serif text-xl font-bold text-gov-navy">
            Application Pipeline
          </h2>

          {isRejected ? (
            <Callout tone="warning" title="Action required — application not approved">
              This application could not be approved as filed. Please review the case
              notes below and{" "}
              <Link href="/contact" className="font-bold underline">
                contact support
              </Link>{" "}
              to resolve any outstanding issues or to re-apply.
            </Callout>
          ) : (
            <>
              {/* Desktop horizontal stepper */}
              <ol className="hidden list-none items-center gap-0 sm:flex">
                {PIPELINE_STEPS.map((step, i) => {
                  const isDone = i < effectiveIndex;
                  const isActive = i === effectiveIndex;

                  const circleClass = isDone
                    ? "bg-gov-green text-white"
                    : isActive
                      ? "bg-gov-primary text-white ring-4 ring-gov-primary-lighter"
                      : "bg-gov-base-lighter text-gov-base border border-gov-base-light";

                  const lineClass =
                    isDone ? "bg-gov-green" : "bg-gov-base-light";

                  const labelClass = isDone
                    ? "text-gov-green-dark font-bold"
                    : isActive
                      ? "text-gov-primary font-bold"
                      : "text-gov-base";

                  return (
                    <li key={step.key} className="flex flex-1 flex-col items-center">
                      <div className="flex w-full items-center">
                        {/* Left connector */}
                        {i > 0 && (
                          <div
                            className={`h-0.5 flex-1 ${i <= effectiveIndex ? "bg-gov-green" : "bg-gov-base-light"}`}
                          />
                        )}
                        {/* Circle */}
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${circleClass}`}
                          aria-current={isActive ? "step" : undefined}
                        >
                          {isDone ? "✓" : i + 1}
                        </div>
                        {/* Right connector */}
                        {i < PIPELINE_STEPS.length - 1 && (
                          <div className={`h-0.5 flex-1 ${lineClass}`} />
                        )}
                      </div>
                      <p className={`mt-2 text-center text-xs ${labelClass}`}>{step.label}</p>
                    </li>
                  );
                })}
              </ol>

              {/* Mobile vertical timeline */}
              <ol className="list-none space-y-4 border-l-2 border-gov-base-light pl-4 sm:hidden">
                {PIPELINE_STEPS.map((step, i) => {
                  const isDone = i < effectiveIndex;
                  const isActive = i === effectiveIndex;

                  const dotClass = isDone
                    ? "bg-gov-green"
                    : isActive
                      ? "bg-gov-primary"
                      : "bg-gov-base-light border border-gov-base";

                  const labelClass = isDone
                    ? "text-gov-green-dark font-bold"
                    : isActive
                      ? "text-gov-primary font-bold"
                      : "text-gov-base";

                  return (
                    <li key={step.key} className="relative flex items-center gap-3">
                      <span
                        className={`absolute -left-[1.375rem] flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold text-white ${dotClass}`}
                        aria-current={isActive ? "step" : undefined}
                      >
                        {isDone ? "✓" : ""}
                      </span>
                      <span className={`text-sm ${labelClass}`}>{step.label}</span>
                      {isActive && (
                        <span className="usa-tag bg-gov-primary-lighter text-gov-primary-darker">
                          Current
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </>
          )}

          {/* Last event detail */}
          {lastEvent && (
            <div className="mt-6 rounded border border-gov-base-light bg-gov-base-lightest p-4 text-sm">
              <p className="m-0 font-bold text-gov-navy">
                {String(lastEvent.event).replace(/_/g, " ")}
              </p>
              {lastEvent.detail && (
                <p className="m-0 mt-0.5 text-gov-base">{lastEvent.detail}</p>
              )}
              {lastEventIso && (
                <p className="m-0 mt-1 text-xs text-gov-base">
                  {relativeTime(lastEventIso)} —{" "}
                  {new Date(lastEventIso).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          )}

          {/* Encouraging message for early pipeline */}
          {earlyPipeline && (
            <div className="mt-6">
              <Callout tone="info" title="Your application is in progress">
                A benefits specialist will review your registration within 2 business days.
                You will receive an email update when your status changes.
              </Callout>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
