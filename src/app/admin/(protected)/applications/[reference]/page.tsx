import { requireAdminSession } from "@/app/admin/_adminAuth";
import { adminGetApplicationDetail } from "@/lib/service";
import { StatusBadge } from "@/components/ui";
import { formatUSD } from "@/lib/program";
import ApplicationEditForm from "@/components/admin/ApplicationEditForm";
import ApplicationStatusPanel from "@/components/admin/ApplicationStatusPanel";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ reference: string }> };

export async function generateMetadata({ params }: Props) {
  const { reference } = await params;
  return { title: `${reference} — Admin` };
}

export default async function AdminApplicationDetailPage({ params }: Props) {
  await requireAdminSession();

  const { reference } = await params;
  const detail = await adminGetApplicationDetail(reference);
  if (!detail) notFound();

  const { application: app, deposits, documents, events, balanceCents } = detail;

  // Serialize dates for client components
  const initialFields = {
    parentFullName: app.parentFullName,
    parentEmail: app.parentEmail,
    parentPhone: app.parentPhone,
    parentAddressLine1: app.parentAddressLine1,
    parentAddressLine2: app.parentAddressLine2 ?? null,
    parentCity: app.parentCity,
    parentState: app.parentState,
    parentZip: app.parentZip,
    childFirstName: app.childFirstName,
    childMiddleName: app.childMiddleName ?? null,
    childLastName: app.childLastName,
    childDob: app.childDob,
    verificationStatus: app.verificationStatus,
    participationTier: app.participationTier,
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/admin/applications" className="text-sm text-gov-primary hover:underline">
            ← Back to Applications
          </Link>
          <h1 className="mt-2 font-mono text-xl font-bold text-gov-navy">{app.referenceNumber}</h1>
          <p className="mt-0.5 text-sm text-gov-base">
            {app.childFirstName} {app.childLastName} · {app.parentFullName}
          </p>
        </div>
        <StatusBadge status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: status panel + edit form */}
        <div className="space-y-6 lg:col-span-2">
          {/* Approval panel */}
          <div className="usa-card">
            <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">
              Status &amp; Approval
            </h2>
            <ApplicationStatusPanel
              reference={app.referenceNumber}
              currentStatus={app.status}
            />
          </div>

          {/* Edit form */}
          <div className="usa-card">
            <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">
              Edit Application
            </h2>
            <ApplicationEditForm reference={app.referenceNumber} initial={initialFields} />
          </div>
        </div>

        {/* Right: summary */}
        <div className="space-y-6">
          <div className="usa-card text-sm">
            <h2 className="mb-3 font-serif text-base font-semibold text-gov-navy">Account Summary</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gov-base">Balance</dt>
                <dd className="font-semibold">{formatUSD(balanceCents)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gov-base">Account #</dt>
                <dd className="font-mono">{app.childAccountNumber ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gov-base">Tier</dt>
                <dd>{app.participationTier}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gov-base">Verification</dt>
                <dd>{app.verificationStatus}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gov-base">State</dt>
                <dd>{app.parentState}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gov-base">Submitted</dt>
                <dd>{new Date(app.submittedAt).toLocaleDateString("en-US")}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Deposit ledger */}
      <div className="usa-card mt-6">
        <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">Deposit Ledger</h2>
        {deposits.length === 0 ? (
          <p className="text-sm text-gov-base">No deposits yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="usa-table w-full">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Posted</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((d) => (
                  <tr key={d.id}>
                    <td className="text-sm">{d.depositType.replace(/_/g, " ")}</td>
                    <td className="font-semibold">{formatUSD(d.amountCents)}</td>
                    <td>
                      <span className={`usa-tag text-xs ${d.status === "posted" ? "bg-gov-green text-white" : "bg-gov-base-light text-gov-ink"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="text-sm text-gov-base">{d.source}</td>
                    <td className="text-sm text-gov-base">
                      {d.postedAt ? new Date(d.postedAt).toLocaleDateString("en-US") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="usa-card mt-6">
        <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">Documents</h2>
        {documents.length === 0 ? (
          <p className="text-sm text-gov-base">No documents uploaded.</p>
        ) : (
          <table className="usa-table w-full">
            <thead>
              <tr>
                <th>File</th>
                <th>Type</th>
                <th>Size</th>
                <th>Review Status</th>
                <th>Uploaded</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="font-mono text-sm">{doc.fileName}</td>
                  <td className="text-sm">{doc.docType}</td>
                  <td className="text-sm">{(doc.fileSize / 1024).toFixed(1)} KB</td>
                  <td>
                    <span className="usa-tag text-xs">{doc.reviewStatus}</span>
                  </td>
                  <td className="text-sm text-gov-base">
                    {new Date(doc.uploadedAt).toLocaleDateString("en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Audit trail */}
      <div className="usa-card mt-6">
        <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">Audit Trail</h2>
        {events.length === 0 ? (
          <p className="text-sm text-gov-base">No events recorded.</p>
        ) : (
          <ol className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className="flex gap-3 text-sm">
                <span className="mt-0.5 shrink-0 rounded bg-gov-primary-lightest px-2 py-0.5 font-mono text-xs text-gov-primary-dark">
                  {ev.actor}
                </span>
                <div>
                  <p className="font-semibold capitalize">{ev.event.replace(/_/g, " ")}</p>
                  {ev.detail && <p className="text-gov-base">{ev.detail}</p>}
                  <p className="mt-0.5 text-xs text-gov-base">
                    {new Date(ev.createdAt).toLocaleString("en-US")}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
