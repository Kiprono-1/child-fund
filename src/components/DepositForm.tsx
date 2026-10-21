"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ACCOUNT_TYPES, MINIMUM_INITIAL_DEPOSIT_CENTS, formatUSD } from "@/lib/program";

type Detail = {
  application: {
    referenceNumber: string;
    status: string;
    childFirstName: string;
    childLastName: string;
    childDob: string;
    autoEnrollment: boolean;
    accountType: string;
    custodianBank: string;
    accountLast4: string;
    childAccountNumber: string | null;
    monthlyContribution: number;
    parentContributionAmount: number;
  };
  state: { name: string; agency: string; contributionMatchPct: number; contributionMatchCapCents: number } | undefined;
  balanceCents: number;
  scheduledCents: number;
  deposits: {
    id: number;
    depositType: string;
    amountCents: number;
    status: string;
    description: string;
    postedAt: string | null;
    scheduledFor: string | null;
  }[];
};

export default function DepositForm({ initialRef = "" }: { initialRef?: string }) {
  const [ref, setRef] = useState(initialRef);
  const [lastName, setLastName] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const minDeposit = MINIMUM_INITIAL_DEPOSIT_CENTS / 100; // 1500
  const [amount, setAmount] = useState(minDeposit);
  const [recurring, setRecurring] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    if (!ref.trim()) {
      setError("Enter your CTF reference number.");
      return;
    }
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(
        `/api/applications/${encodeURIComponent(ref.trim().toUpperCase())}?lastName=${encodeURIComponent(lastName.trim())}`,
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setDetail(null);
        setError(data.error ?? "We could not find that account.");
        return;
      }
      setDetail(data as Detail);
    } catch {
      setDetail(null);
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialRef) void lookup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRef]);

  async function contribute(e: React.FormEvent) {
    e.preventDefault();
    if (!detail) return;
    setBusy(true);
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
        setError(data.error ?? "The contribution could not be processed.");
        return;
      }
      setNotice(
        `$${amount.toFixed(2)} was debited from ${detail.application.custodianBank} ••••${
          detail.application.accountLast4
        }${data.matchCents ? ` and a $${(data.matchCents / 100).toFixed(2)} state match is queued` : ""}.`,
      );
      await lookup();
    } finally {
      setBusy(false);
    }
  }

  const pct = detail?.state?.contributionMatchPct ?? 0;
  const cap = detail?.state?.contributionMatchCapCents ?? 0;
  const matchPreview = Math.min(Math.round(amount * pct), cap / 100);
  const canContribute =
    detail?.application.status === "approved" || detail?.application.status === "funded";

  return (
    <div className="space-y-8">
      <form onSubmit={lookup} className="usa-card p-5 sm:p-6">
        <h2 className="m-0 font-serif text-xl font-bold text-gov-navy">Find the child account</h2>
        <p className="mt-1 mb-4 max-w-2xl text-sm text-[#3d4551]">
          Contributions are only accepted once the account has been verified and opened. Enter your
          reference number and the child&apos;s last name.
        </p>
        <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr_auto] sm:items-end">
          <div>
            <label className="usa-label" htmlFor="dep-ref">
              CTF reference number <span className="text-gov-red">*</span>
            </label>
            <input
              id="dep-ref"
              className="usa-input font-mono uppercase"
              placeholder="CTF-2026-A4X9K2"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
            />
          </div>
          <div>
            <label className="usa-label" htmlFor="dep-last">
              Child&apos;s last name <span className="text-gov-red">*</span>
            </label>
            <input
              id="dep-last"
              className="usa-input"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Johnson"
            />
          </div>
          <button type="submit" disabled={loading} className="usa-button usa-button--primary">
            {loading ? "Looking up…" : "Find account"}
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

      {!detail && (
        <div className="usa-card bg-gov-base-lightest p-6 text-sm text-[#3d4551]">
          <p className="m-0 font-bold text-gov-navy">No account yet?</p>
          <p className="mt-1 mb-3">
            You must register the child and complete identity verification before contributions can
            be accepted.
          </p>
          <Link href="/apply" className="usa-button usa-button--primary">
            Register a child
          </Link>
        </div>
      )}

      {detail && (
        <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
          <div className="usa-card overflow-hidden">
            <div className="bg-gov-navy px-5 py-4 text-white">
              <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gov-accent">
                {ACCOUNT_TYPES.find((a) => a.id === detail.application.accountType)?.label ?? "Child trust account"}
              </p>
              <h3 className="m-0 mt-1 font-serif text-2xl font-bold">
                {detail.application.childFirstName} {detail.application.childLastName}
              </h3>
              <p className="m-0 mt-1 text-xs text-gov-primary-light">
                Account {detail.application.childAccountNumber ?? "pending"} · {detail.application.custodianBank} ••••
                {detail.application.accountLast4}
              </p>
            </div>
            <dl className="m-0 grid grid-cols-2 divide-x divide-gov-base-light border-b border-gov-base-light">
              <div className="p-4">
                <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-gov-base">Available balance</dt>
                <dd className="m-0 mt-1 font-serif text-2xl font-bold tabular-nums text-gov-navy">
                  {formatUSD(detail.balanceCents)}
                </dd>
              </div>
              <div className="p-4">
                <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-gov-base">Scheduled deposits</dt>
                <dd className="m-0 mt-1 font-serif text-2xl font-bold tabular-nums text-gov-navy">
                  {formatUSD(detail.scheduledCents)}
                </dd>
              </div>
            </dl>

            <form onSubmit={contribute} className="p-5">
              <h4 className="m-0 font-serif text-lg font-bold text-gov-navy">Make a contribution</h4>
              <p className="mt-1 mb-4 text-sm text-[#3d4551]">
                {detail.state
                  ? `${detail.state.name} matches ${pct}% of guardian contributions, up to ${formatUSD(cap, false)} per program year.`
                  : "Contributions are accepted up to $5,000 per program year."}
              </p>

              <div className="flex flex-wrap gap-2">
                {[1500, 2000, 2500, 3000, 5000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setAmount(v)}
                    className={`rounded border px-4 py-2 text-sm font-bold ${
                      amount === v
                        ? "border-gov-primary bg-gov-primary text-white"
                        : "border-gov-base-light bg-white text-gov-primary-dark hover:border-gov-primary"
                    }`}
                  >
                    ${v}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="usa-label" htmlFor="dep-amount">
                    Custom amount (USD)
                  </label>
                  <input
                    id="dep-amount"
                    type="number"
                    min={minDeposit}
                    max={5000}
                    step={1}
                    className="usa-input"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                  <span className="usa-hint">Minimum deposit: $1,500. Annual limit: $5,000 per child.</span>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={recurring}
                      onChange={(e) => setRecurring(e.target.checked)}
                    />
                    Repeat this amount every month
                  </label>
                </div>
              </div>

              <div className="mt-4 rounded border border-gov-base-light bg-gov-base-lightest p-4">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>Your contribution</span>
                  <span className="font-serif text-lg font-bold tabular-nums text-gov-navy">
                    ${amount.toFixed(2)}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-3 text-sm">
                  <span>{detail.state?.name ?? "State"} match ({pct}%)</span>
                  <span className="font-serif text-lg font-bold tabular-nums text-gov-green-dark">
                    ${matchPreview.toFixed(2)}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-gov-base-light pt-2 text-sm font-bold">
                  <span>Total credited to the account</span>
                  <span className="font-serif text-xl tabular-nums text-gov-navy">
                    ${(amount + matchPreview).toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={busy || !canContribute}
                className="usa-button usa-button--primary mt-5 w-full sm:w-auto"
              >
                {busy ? "Processing…" : `Deposit $${amount.toFixed(2)}`}
              </button>
              {!canContribute && (
                <p className="mt-3 mb-0 border-l-4 border-gov-accent bg-[#fff8e8] p-3 text-sm font-semibold text-[#5c4400]">
                  This account has not been verified and opened yet. Complete identity verification
                  first — then deposits unlock automatically.{" "}
                  <Link href={`/status?ref=${detail.application.referenceNumber}`} className="underline">
                    Open the tracker
                  </Link>
                  .
                </p>
              )}
            </form>
          </div>

          <div className="space-y-5">
            <div className="usa-card p-5">
              <h4 className="m-0 font-serif text-lg font-bold text-gov-navy">Recent activity</h4>
              {detail.deposits.length === 0 ? (
                <p className="mt-2 mb-0 text-sm text-[#3d4551]">No deposits recorded yet.</p>
              ) : (
                <ul className="mt-3 mb-0 list-none divide-y divide-gov-base-light p-0 text-sm">
                  {detail.deposits.slice(0, 8).map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3 py-2">
                      <span>
                        <span className="block font-semibold text-gov-navy">{d.description}</span>
                        <span className="block text-xs text-gov-base">
                          {(d.postedAt ?? d.scheduledFor ?? "").slice(0, 10)} · {d.status}
                        </span>
                      </span>
                      <span className="font-serif font-bold tabular-nums text-gov-navy">
                        {formatUSD(d.amountCents)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="usa-card bg-gov-primary-lightest p-5">
              <h4 className="m-0 font-serif text-lg font-bold text-gov-navy">Ways to fund the account</h4>
              <ul className="mt-3 mb-0 list-disc space-y-2 pl-5 text-sm text-[#3d4551]">
                <li>
                  <strong>Recurring ACH debit</strong> — set it once, matched every month by your
                  state.
                </li>
                <li>
                  <strong>Family gifting</strong> — grandparents and relatives can contribute using
                  the reference number; gifts above $100 require custodian approval.
                </li>
                <li>
                  <strong>Tax refund direct deposit</strong> — split your federal refund so a
                  portion goes straight to the child account.
                </li>
                <li>
                  <strong>Employer payroll deduction</strong> — available where your employer
                  participates in the Workplace CTF Alliance.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
