"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  ACCOUNT_TYPES,
  DOCUMENT_TYPES,
  STATUS_META,
  VERIFICATION_METHODS,
  formatDate,
  formatDateTime,
  formatUSD,
} from "@/lib/program";
import { StatusBadge } from "./ui";

type Deposit = {
  id: number;
  depositType: string;
  amountCents: number;
  status: string;
  description: string;
  source: string;
  scheduledFor: string | null;
  postedAt: string | null;
  createdAt: string;
};
type Doc = {
  id: number;
  docType: string;
  fileName: string;
  fileSize: number;
  reviewStatus: string;
  uploadedAt: string;
};
type Evt = { id: number; event: string; detail: string | null; actor: string; createdAt: string };
type App = {
  referenceNumber: string;
  status: string;
  statusMessage: string | null;
  parentFullName: string;
  parentEmail: string;
  parentState: string;
  childFirstName: string;
  childLastName: string;
  childDob: string;
  participationTier: string;
  autoEnrollment: boolean;
  accountType: string;
  custodianBank: string;
  accountLast4: string;
  childAccountNumber: string | null;
  monthlyContribution: number;
  federalSeedAmount: number;
  stateMatchAmount: number;
  annualSupplementAmount: number;
  verificationMethod: string;
  verificationStatus: string;
  submittedAt: string;
  approvedAt: string | null;
};
type Detail = {
  application: App;
  deposits: Deposit[];
  documents: Doc[];
  events: Evt[];
  state: { name: string; agency: string; contributionMatchPct: number } | undefined;
  balanceCents: number;
  scheduledCents: number;
  projectionAt18Cents: number;
};

const PIPELINE = [
  { key: "submitted", label: "Application filed" },
  { key: "under_review", label: "Federal intake review" },
  { key: "verification_required", label: "Identity verification" },
  { key: "approved", label: "Account approved & opened" },
  { key: "funded", label: "Funds deposited" },
];

const EVENT_LABELS: Record<string, string> = {
  application_submitted: "Application submitted",
  intake_check: "Federal intake check",
  documents_requested: "Documents requested",
  documents_uploaded: "Documents uploaded",
  verification_started: "Identity proofing started",
  identity_verified: "Identity verified",
  account_opened: "Custodial account opened",
  funds_deposited: "Funds deposited",
  contribution_posted: "Contribution posted",
};

const DEPOSIT_TYPE_LABEL: Record<string, string> = {
  federal_seed: "Federal seed deposit",
  state_match: "State match",
  federal_supplement: "Federal birthday supplement",
  parent_contribution: "Guardian contribution",
  earnings: "Investment earnings",
};

export default function StatusTracker({
  initialRef = "",
  initialLast = "",
}: {
  initialRef?: string;
  initialLast?: string;
}) {
  const [ref, setRef] = useState(initialRef);
  const [lastName, setLastName] = useState(initialLast);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [amount, setAmount] = useState(50);
  const [recurring, setRecurring] = useState(false);
  const [docType, setDocType] = useState<string>(DOCUMENT_TYPES[0]);
  const [fileMeta, setFileMeta] = useState<{ fileName: string; fileSize: number; mimeType: string } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const lookup = useCallback(
    async (r: string, l: string) => {
      if (!r.trim()) {
        setError("Enter your TA reference number (for example TA-2026-A4X9K2).");
        return;
      }
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        const res = await fetch(
          `/api/applications/${encodeURIComponent(r.trim().toUpperCase())}?lastName=${encodeURIComponent(l.trim())}`,
        );
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setDetail(null);
          setError(data.error ?? "We could not find that application.");
          return;
        }
        setDetail(data as Detail);
      } catch {
        setDetail(null);
        setError("Network error. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (initialRef) void lookup(initialRef, initialLast);
  }, [initialRef, initialLast, lookup]);

  async function advance() {
    if (!detail) return;
    setBusy("advance");
    setNotice(null);
    try {
      const res = await fetch(`/api/applications/${detail.application.referenceNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "The review step could not be completed.");
      } else {
        setDetail(data as Detail);
        setNotice(`Case advanced — current status: ${STATUS_META[data.application.status]?.label ?? data.application.status}.`);
      }
    } finally {
      setBusy(null);
    }
  }

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setBusy("contribute");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/applications/${detail.application.referenceNumber}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "deposit", amountDollars: amount, recurring }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Contribution failed.");
      } else {
        setNotice(
          `$${amount.toFixed(2)} contribution posted${
            data.matchCents ? `, with a $${(data.matchCents / 100).toFixed(2)} state match queued` : ""
          }.`,
        );
        await lookup(detail.application.referenceNumber, lastName);
      }
    } finally {
      setBusy(null);
    }
  }

  async function uploadDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!detail || !fileMeta) {
      setError("Choose a file to upload.");
      return;
    }
    setBusy("upload");
    setError(null);
    try {
      const res = await fetch(`/api/applications/${detail.application.referenceNumber}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "documents", documents: [{ docType, ...fileMeta }] }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) setError(data.error ?? "Upload failed.");
      else {
        setNotice("Document received and queued for specialist review.");
        setFileMeta(null);
        await lookup(detail.application.referenceNumber, lastName);
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Lookup */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup(ref, lastName);
        }}
        className="usa-card p-5 sm:p-6"
      >
        <h2 className="m-0 font-serif text-xl font-bold text-gov-navy">Look up an application</h2>
        <p className="mt-1 mb-4 max-w-2xl text-sm text-[#3d4551]">
          Enter the reference number from your confirmation screen plus the child&apos;s last name.
          For your security we never display a full Social Security number.
        </p>
        <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr_auto] sm:items-end">
          <div>
            <label className="usa-label" htmlFor="lookup-ref">
              TA reference number <span className="text-gov-red">*</span>
            </label>
            <input
              id="lookup-ref"
              className="usa-input font-mono uppercase"
              placeholder="TA-2026-A4X9K2"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="usa-label" htmlFor="lookup-last">
              Child&apos;s last name <span className="text-gov-red">*</span>
            </label>
            <input
              id="lookup-last"
              className="usa-input"
              placeholder="Johnson"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <button type="submit" disabled={loading} className="usa-button usa-button--primary">
            {loading ? "Searching…" : "Find application"}
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-4 mb-0 border-l-4 border-gov-red bg-[#fdf3f2] p-3 text-sm font-semibold text-gov-red-dark">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 mb-0 border-l-4 border-gov-green bg-[#f0f9ec] p-3 text-sm font-semibold text-gov-green-dark">
            {notice}
          </p>
        )}
      </form>

      {!detail && !loading && !error && (
        <div className="usa-card bg-gov-base-lightest p-6 text-sm text-[#3d4551]">
          <p className="m-0 font-bold text-gov-navy">Haven&apos;t registered yet?</p>
          <p className="mt-1 mb-3">
            Children born in 2025–2028 are enrolled automatically and receive the $1,000 federal
            seed deposit. Children born earlier can be registered and funded by a parent or
            guardian.
          </p>
          <Link href="/apply" className="usa-button usa-button--primary">
            Start an application
          </Link>
        </div>
      )}

      {detail && (
        <>
          {/* Summary */}
          <section className="usa-card overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 bg-gov-navy px-5 py-4 sm:px-6">
              <div>
                <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gov-accent">
                  Trump Account
                </p>
                <h2 className="m-0 mt-1 font-serif text-2xl font-bold text-white">
                  {detail.application.childFirstName} {detail.application.childLastName}
                </h2>
                <p className="m-0 mt-1 text-xs text-gov-primary-light">
                  Reference {detail.application.referenceNumber} · filed{" "}
                  {formatDate(detail.application.submittedAt)} ·{" "}
                  {detail.state?.name ?? detail.application.parentState}
                </p>
              </div>
              <div className="text-right">
                <StatusBadge status={detail.application.status} />
                <p className="m-0 mt-2 font-serif text-2xl font-bold tabular-nums text-white">
                  {formatUSD(detail.balanceCents)}
                </p>
                <p className="m-0 text-[0.7rem] uppercase tracking-wider text-gov-primary-light">
                  Available balance
                </p>
              </div>
            </div>

            <div className="border-b border-gov-base-light bg-gov-primary-lightest px-5 py-3 sm:px-6">
              <p className="m-0 text-sm text-gov-navy">
                <strong>Agency note:</strong> {detail.application.statusMessage ?? STATUS_META[detail.application.status]?.blurb}
              </p>
            </div>

            {/* Pipeline */}
            <ol className="m-0 grid list-none gap-0 p-0 sm:grid-cols-5">
              {PIPELINE.map((p, i) => {
                const currentIdx = PIPELINE.findIndex((x) => x.key === detail.application.status);
                const done = currentIdx >= i || (detail.application.status === "funded" && true);
                const isCurrent = currentIdx === i;
                const skipped = p.key === "verification_required" && detail.application.verificationStatus === "verified";
                return (
                  <li
                    key={p.key}
                    className={`relative border-t-4 px-4 py-3 ${
                      isCurrent
                        ? "border-gov-accent bg-[#fff8e8]"
                        : done || skipped
                          ? "border-gov-green bg-[#f0f9ec]"
                          : "border-gov-base-light bg-white"
                    }`}
                  >
                    <span className="block text-[0.68rem] font-bold uppercase tracking-wider text-gov-base">
                      Step {i + 1}
                    </span>
                    <span className="mt-0.5 block text-sm font-bold text-gov-navy">{p.label}</span>
                    <span className="mt-0.5 block text-[0.72rem] text-gov-base">
                      {done || skipped ? (isCurrent ? "In progress" : "Complete") : "Pending"}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="grid gap-6 px-5 py-6 sm:px-6 md:grid-cols-3">
              <InfoBlock title="Account">
                <Row k="Account number" v={detail.application.childAccountNumber ?? "Pending approval"} />
                <Row k="Type" v={ACCOUNT_TYPES.find((a) => a.id === detail.application.accountType)?.label ?? "—"} />
                <Row k="Custodian" v={`${detail.application.custodianBank} ••••${detail.application.accountLast4}`} />
                <Row k="Cohort" v={detail.application.autoEnrollment ? "Automatic enrollment (2025–2028)" : "Guardian-funded"} />
              </InfoBlock>
              <InfoBlock title="Verification">
                <Row
                  k="Method"
                  v={VERIFICATION_METHODS.find((m) => m.id === detail.application.verificationMethod)?.label ?? "—"}
                />
                <Row k="Status" v={detail.application.verificationStatus.replace(/_/g, " ")} />
                <Row k="Documents on file" v={String(detail.documents.length)} />
                <Row k="Approved" v={detail.application.approvedAt ? formatDateTime(detail.application.approvedAt) : "—"} />
              </InfoBlock>
              <InfoBlock title="Benefit summary">
                <Row k="Federal seed" v={formatUSD(detail.application.federalSeedAmount)} />
                <Row k="State match" v={formatUSD(detail.application.stateMatchAmount)} />
                <Row k="Posted balance" v={formatUSD(detail.balanceCents)} />
                <Row k="Scheduled deposits" v={formatUSD(detail.scheduledCents)} />
                <Row k="Projected at age 18" v={formatUSD(detail.projectionAt18Cents, false)} />
              </InfoBlock>
            </div>
          </section>

          {/* Documents */}
          {(detail.application.status === "verification_required" ||
            detail.application.verificationStatus !== "verified") && (
            <section className="usa-card p-5 sm:p-6">
              <h3 className="m-0 font-serif text-xl font-bold text-gov-navy">
                Complete identity verification
              </h3>
              <p className="mt-1 mb-4 text-sm text-[#3d4551]">
                Upload your government photo ID and the child&apos;s certified birth certificate. A
                verification specialist reviews documents within 3–5 business days.
              </p>

              {detail.documents.length > 0 && (
                <table className="usa-table mb-5">
                  <thead>
                    <tr>
                      <th scope="col">Document</th>
                      <th scope="col">File</th>
                      <th scope="col">Received</th>
                      <th scope="col">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.documents.map((d) => (
                      <tr key={d.id}>
                        <td>{d.docType}</td>
                        <td className="font-mono text-xs">{d.fileName}</td>
                        <td>{formatDateTime(d.uploadedAt)}</td>
                        <td>
                          <span className="usa-tag bg-[#fef0c8] text-[#7a5b00]">{d.reviewStatus}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <form onSubmit={uploadDoc} className="grid gap-4 sm:grid-cols-[1.4fr_1fr_auto] sm:items-end">
                <div>
                  <label className="usa-label" htmlFor="doc-type">
                    Document type
                  </label>
                  <select
                    id="doc-type"
                    className="usa-input"
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                  >
                    {DOCUMENT_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="usa-label" htmlFor="doc-file">
                    File (PDF, JPG or PNG)
                  </label>
                  <input
                    id="doc-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="usa-input bg-white py-1.5 text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setFileMeta(
                        f ? { fileName: f.name, fileSize: f.size, mimeType: f.type || "application/octet-stream" } : null,
                      );
                    }}
                  />
                </div>
                <button type="submit" disabled={busy === "upload"} className="usa-button usa-button--primary">
                  {busy === "upload" ? "Uploading…" : "Upload document"}
                </button>
              </form>
            </section>
          )}

          {/* Contributions */}
          {(detail.application.status === "approved" || detail.application.status === "funded") && (
            <section className="usa-card p-5 sm:p-6">
              <h3 className="m-0 font-serif text-xl font-bold text-gov-navy">Make a deposit</h3>
              <p className="mt-1 mb-4 text-sm text-[#3d4551]">
                Contributions are debited from {detail.application.custodianBank} ••••
                {detail.application.accountLast4}. {detail.state?.name ?? "Your state"} matches{" "}
                {detail.state?.contributionMatchPct ?? 0}% of every guardian contribution. The annual
                limit is $5,000 per child.
              </p>
              <form onSubmit={contribute} className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <div>
                  <label className="usa-label" htmlFor="dep-amount">
                    Contribution amount (USD)
                  </label>
                  <input
                    id="dep-amount"
                    type="number"
                    min={1}
                    max={5000}
                    step={1}
                    className="usa-input"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[25, 50, 100, 250].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setAmount(v)}
                        className={`rounded border px-3 py-1 text-xs font-bold ${
                          amount === v
                            ? "border-gov-primary bg-gov-primary text-white"
                            : "border-gov-base-light bg-white text-gov-primary-dark hover:border-gov-primary"
                        }`}
                      >
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={recurring}
                    onChange={(e) => setRecurring(e.target.checked)}
                    className="h-4 w-4"
                  />
                  Repeat monthly
                </label>
                <button type="submit" disabled={busy === "contribute"} className="usa-button usa-button--primary">
                  {busy === "contribute" ? "Processing…" : "Deposit funds"}
                </button>
              </form>
            </section>
          )}

          {/* Deposit ledger */}
          <section className="usa-card p-5 sm:p-6">
            <h3 className="m-0 font-serif text-xl font-bold text-gov-navy">Deposit ledger</h3>
            <p className="mt-1 mb-4 text-sm text-[#3d4551]">
              Every dollar that moves into this child&apos;s account, in chronological order.
            </p>
            {detail.deposits.length === 0 ? (
              <p className="m-0 rounded bg-gov-base-lightest p-4 text-sm text-[#3d4551]">
                No deposits yet. Funds are wired after identity verification is complete.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="usa-table">
                  <thead>
                    <tr>
                      <th scope="col">Type</th>
                      <th scope="col">Source</th>
                      <th scope="col">Date</th>
                      <th scope="col">Status</th>
                      <th scope="col" className="text-right">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.deposits.map((d) => (
                      <tr key={d.id}>
                        <td>
                          <span className="font-semibold text-gov-navy">
                            {DEPOSIT_TYPE_LABEL[d.depositType] ?? d.depositType}
                          </span>
                          <span className="mt-0.5 block text-xs text-gov-base">{d.description}</span>
                        </td>
                        <td>{d.source}</td>
                        <td>{formatDate(d.postedAt ?? d.scheduledFor)}</td>
                        <td>
                          <span
                            className={`usa-tag ${
                              d.status === "posted"
                                ? "bg-[#ddf9c7] text-gov-green-dark"
                                : "bg-[#fef0c8] text-[#7a5b00]"
                            }`}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="text-right font-serif font-bold tabular-nums text-gov-navy">
                          {formatUSD(d.amountCents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Timeline */}
          <section className="usa-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="m-0 font-serif text-xl font-bold text-gov-navy">Case history</h3>
              <button
                type="button"
                onClick={advance}
                disabled={busy === "advance" || detail.application.status === "funded"}
                className="usa-button usa-button--outline-dark !py-2 text-xs"
              >
                {busy === "advance"
                  ? "Processing…"
                  : detail.application.status === "funded"
                    ? "Case complete"
                    : "Run next agency review step"}
              </button>
            </div>
            <ol className="mt-5 list-none space-y-0 border-l-2 border-gov-base-light p-0 pl-5">
              {detail.events.map((e) => (
                <li key={e.id} className="relative pb-5">
                  <span className="absolute -left-[1.7rem] top-1 h-3 w-3 rounded-full border-2 border-white bg-gov-primary" />
                  <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-primary">
                    {EVENT_LABELS[e.event] ?? e.event} · {formatDateTime(e.createdAt)}
                  </p>
                  <p className="m-0 mt-0.5 text-sm text-[#3d4551]">{e.detail}</p>
                  <p className="m-0 mt-0.5 text-[0.7rem] text-gov-base">Recorded by: {e.actor}</p>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </div>
  );
}

function InfoBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="m-0 border-b border-gov-base-light pb-1.5 text-xs font-bold uppercase tracking-wider text-gov-primary">
        {title}
      </h4>
      <dl className="m-0 mt-2 space-y-1.5">{children}</dl>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <dt className="text-gov-base">{k}</dt>
      <dd className="m-0 text-right font-semibold text-gov-navy">{v}</dd>
    </div>
  );
}
