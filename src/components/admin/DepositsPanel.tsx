"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUSD } from "@/lib/program";
import type { DepositType, DepositStatus } from "@/db/schema";

// ------------------------------------------------------------------ //
// Types                                                               //
// ------------------------------------------------------------------ //

type DepositRow = {
  id: number;
  depositType: string;
  amountCents: number;
  status: string;
  description: string;
  source: string;
  scheduledFor: string | null;
  postedAt: string | null;
};

type AdminDepositInput = {
  depositType: DepositType;
  amountCents: number;
  description: string;
  status: DepositStatus;
  scheduledFor: string | null;
  /** Institution or system that originated the deposit (defaults to "Admin Portal"). */
  source?: string;
};

type Props = {
  reference: string;
  initialDeposits: DepositRow[];
};

// ------------------------------------------------------------------ //
// Constants                                                           //
// ------------------------------------------------------------------ //

const TYPE_LABELS: Record<string, string> = {
  federal_seed: "Federal Seed",
  state_match: "State Match",
  federal_supplement: "Federal Supplement",
  parent_contribution: "Guardian Contribution",
  earnings: "Earnings",
};

const DEPOSIT_TYPES: DepositType[] = [
  "federal_seed",
  "state_match",
  "federal_supplement",
  "parent_contribution",
  "earnings",
];

const DEPOSIT_STATUSES: DepositStatus[] = ["scheduled", "processing", "posted", "returned"];

function statusClass(status: string): string {
  switch (status) {
    case "posted":
      return "bg-gov-green text-white";
    case "scheduled":
      return "bg-gov-primary-lighter text-gov-primary-darker";
    case "processing":
      return "bg-[#fef0c8] text-[#7a5b00]";
    case "returned":
      return "bg-[#f4e3db] text-gov-red-dark";
    default:
      return "bg-gov-base-light text-gov-ink";
  }
}

const DEFAULT_ADD: AdminDepositInput = {
  depositType: "federal_seed",
  amountCents: 0,
  description: "",
  status: "scheduled",
  scheduledFor: null,
  source: "",
};

// ------------------------------------------------------------------ //
// Component                                                           //
// ------------------------------------------------------------------ //

export default function DepositsPanel({ reference, initialDeposits }: Props) {
  const router = useRouter();
  const [deposits, setDeposits] = useState<DepositRow[]>(initialDeposits);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState<Partial<AdminDepositInput>>({});
  const [adding, setAdding] = useState(false);
  const [addFields, setAddFields] = useState<AdminDepositInput>(DEFAULT_ADD);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ---------------------------------------------------------------- //
  // Computed balance summary (posted only)                            //
  // ---------------------------------------------------------------- //

  const posted = deposits.filter((d) => d.status === "posted");
  const federalTotal = posted
    .filter((d) => d.depositType === "federal_seed" || d.depositType === "federal_supplement")
    .reduce((s, d) => s + d.amountCents, 0);
  const stateTotal = posted
    .filter((d) => d.depositType === "state_match")
    .reduce((s, d) => s + d.amountCents, 0);
  const contributions = posted
    .filter((d) => d.depositType === "parent_contribution")
    .reduce((s, d) => s + d.amountCents, 0);
  const earnings = posted
    .filter((d) => d.depositType === "earnings")
    .reduce((s, d) => s + d.amountCents, 0);
  const grandTotal = posted.reduce((s, d) => s + d.amountCents, 0);

  // ---------------------------------------------------------------- //
  // Handlers                                                          //
  // ---------------------------------------------------------------- //

  function startEdit(d: DepositRow) {
    setEditingId(d.id);
    setEditFields({
      depositType: d.depositType as DepositType,
      amountCents: d.amountCents,
      description: d.description,
      status: d.status as DepositStatus,
      scheduledFor: d.scheduledFor ? d.scheduledFor.slice(0, 10) : null,
      source: d.source,
    });
    setError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setEditFields({});
    setError("");
  }

  async function saveEdit(id: number) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/deposits/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editFields),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setDeposits((prev) =>
          prev.map((d) =>
            d.id === id
              ? {
                  ...d,
                  ...(editFields.depositType !== undefined && {
                    depositType: editFields.depositType,
                  }),
                  ...(editFields.amountCents !== undefined && {
                    amountCents: editFields.amountCents,
                  }),
                  ...(editFields.description !== undefined && {
                    description: editFields.description,
                  }),
                  ...(editFields.status !== undefined && { status: editFields.status }),
                  ...(editFields.scheduledFor !== undefined && {
                    scheduledFor: editFields.scheduledFor,
                  }),
                  ...(editFields.source !== undefined && { source: editFields.source }),
                  ...(editFields.status === "posted" &&
                    d.postedAt === null && {
                      postedAt: new Date().toISOString(),
                    }),
                }
              : d,
          ),
        );
        setEditingId(null);
        setEditFields({});
        router.refresh();
      } else {
        setError(data.error ?? "Save failed.");
      }
    } catch {
      setError("A network error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete(id: number) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/deposits/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setDeposits((prev) => prev.filter((d) => d.id !== id));
        setConfirmDeleteId(null);
        router.refresh();
      } else {
        setError(data.error ?? "Delete failed.");
        setConfirmDeleteId(null);
      }
    } catch {
      setError("A network error occurred.");
    } finally {
      setSaving(false);
    }
  }

  async function submitAdd() {
    if (!addFields.depositType || !addFields.description || !addFields.status) {
      setError("All fields are required.");
      return;
    }
    if (!Number.isFinite(addFields.amountCents) || addFields.amountCents <= 0) {
      setError("Amount must be greater than $0.00.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/applications/${reference}/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addFields),
      });
      // The API serializes Date fields to ISO strings before sending JSON,
      // so dep.scheduledFor and dep.postedAt are already string | null here.
      const data = (await res.json()) as {
        ok: boolean;
        deposit?: DepositRow;
        error?: string;
      };
      if (data.ok && data.deposit) {
        const dep = data.deposit;
        setDeposits((prev) => [
          ...prev,
          {
            id: dep.id,
            depositType: dep.depositType,
            amountCents: dep.amountCents,
            status: dep.status,
            description: dep.description,
            source: dep.source,
            scheduledFor: dep.scheduledFor ?? null,
            postedAt: dep.postedAt ?? null,
          },
        ]);
        setAdding(false);
        setAddFields(DEFAULT_ADD);
        router.refresh();
      } else {
        setError(data.error ?? "Add failed.");
      }
    } catch {
      setError("A network error occurred.");
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------- //
  // Render                                                            //
  // ---------------------------------------------------------------- //

  return (
    <div className="usa-card mt-6">
      {/* Balance summary */}
      <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">Deposit Ledger</h2>

      <dl className="mb-6 grid grid-cols-2 gap-3 rounded border border-gov-base-light bg-gov-base-lightest p-4 text-sm sm:grid-cols-5">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-gov-base">Federal</dt>
          <dd className="mt-0.5 font-semibold text-gov-navy">{formatUSD(federalTotal)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-gov-base">State Match</dt>
          <dd className="mt-0.5 font-semibold text-gov-navy">{formatUSD(stateTotal)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-gov-base">Contributions</dt>
          <dd className="mt-0.5 font-semibold text-gov-navy">{formatUSD(contributions)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-gov-base">Earnings</dt>
          <dd className="mt-0.5 font-semibold text-gov-navy">{formatUSD(earnings)}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-gov-base">Grand Total</dt>
          <dd className="mt-0.5 font-serif text-base font-bold text-gov-navy">
            {formatUSD(grandTotal)}
          </dd>
        </div>
      </dl>

      {/* Error banner */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded border-l-4 border-gov-red bg-[#fdf3f2] p-3 text-sm text-gov-red-dark"
        >
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          className="usa-button usa-button--outline text-sm"
          onClick={() => {
            setAdding((v) => !v);
            setError("");
          }}
        >
          {adding ? "Cancel" : "+ Add deposit"}
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <div className="mb-4 rounded border border-gov-primary-lighter bg-gov-base-lightest p-4">
          <h3 className="mb-3 font-semibold text-gov-navy">New Deposit</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="usa-label" htmlFor="add-type">
                Type
              </label>
              <select
                id="add-type"
                className="usa-input"
                value={addFields.depositType}
                onChange={(e) =>
                  setAddFields((f) => ({
                    ...f,
                    depositType: e.target.value as DepositType,
                  }))
                }
              >
                {DEPOSIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="usa-label" htmlFor="add-amount">
                Amount ($)
              </label>
              <input
                id="add-amount"
                type="number"
                step="0.01"
                min="0.01"
                className="usa-input"
                value={addFields.amountCents > 0 ? (addFields.amountCents / 100).toFixed(2) : ""}
                onChange={(e) =>
                  setAddFields((f) => ({
                    ...f,
                    amountCents: Math.round(parseFloat(e.target.value || "0") * 100),
                  }))
                }
              />
            </div>

            <div>
              <label className="usa-label" htmlFor="add-status">
                Status
              </label>
              <select
                id="add-status"
                className="usa-input"
                value={addFields.status}
                onChange={(e) =>
                  setAddFields((f) => ({ ...f, status: e.target.value as DepositStatus }))
                }
              >
                {DEPOSIT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="usa-label" htmlFor="add-description">
                Description
              </label>
              <input
                id="add-description"
                type="text"
                className="usa-input"
                value={addFields.description}
                onChange={(e) => setAddFields((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div>
              <label className="usa-label" htmlFor="add-scheduled">
                Scheduled for
              </label>
              <input
                id="add-scheduled"
                type="date"
                className="usa-input"
                value={addFields.scheduledFor ?? ""}
                onChange={(e) =>
                  setAddFields((f) => ({
                    ...f,
                    scheduledFor: e.target.value || null,
                  }))
                }
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="usa-label" htmlFor="add-source">
                Source{" "}
                <span className="text-xs font-normal text-gov-base">
                  (institution name — leave blank for &ldquo;Admin Portal&rdquo;)
                </span>
              </label>
              <input
                id="add-source"
                type="text"
                className="usa-input"
                placeholder="e.g. U.S. Department of the Treasury"
                value={addFields.source ?? ""}
                onChange={(e) =>
                  setAddFields((f) => ({ ...f, source: e.target.value || undefined }))
                }
              />
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="usa-button usa-button--primary text-sm"
              disabled={saving}
              onClick={submitAdd}
            >
              {saving ? "Saving…" : "Save deposit"}
            </button>
            <button
              type="button"
              className="usa-button usa-button--outline text-sm"
              onClick={() => {
                setAdding(false);
                setAddFields(DEFAULT_ADD);
                setError("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDeleteId !== null && (
        <div
          role="alert"
          className="mb-4 flex items-center justify-between rounded border border-gov-red bg-[#fdf3f2] p-3 text-sm"
        >
          <span className="text-gov-red-dark">Delete this deposit? This cannot be undone.</span>
          <div className="flex gap-2">
            <button
              type="button"
              className="usa-button usa-button--secondary text-sm"
              disabled={saving}
              onClick={() => confirmDelete(confirmDeleteId)}
            >
              {saving ? "Deleting…" : "Confirm delete"}
            </button>
            <button
              type="button"
              className="usa-button usa-button--outline text-sm"
              onClick={() => setConfirmDeleteId(null)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      {deposits.length === 0 ? (
        <p className="text-sm text-gov-base">No deposits yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="usa-table w-full">
            <thead>
              <tr>
                <th>Type</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Source</th>
                <th>Scheduled for</th>
                <th>Posted at</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((d) =>
                editingId === d.id ? (
                  // ---- Edit row ---- //
                  <tr key={d.id} className="bg-gov-base-lightest">
                    <td>
                      <select
                        className="usa-input text-sm"
                        value={editFields.depositType ?? d.depositType}
                        onChange={(e) =>
                          setEditFields((f) => ({
                            ...f,
                            depositType: e.target.value as DepositType,
                          }))
                        }
                      >
                        {DEPOSIT_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABELS[t] ?? t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="usa-input text-sm"
                        value={editFields.description ?? d.description}
                        onChange={(e) =>
                          setEditFields((f) => ({ ...f, description: e.target.value }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        className="usa-input text-sm"
                        value={
                          editFields.amountCents !== undefined
                            ? (editFields.amountCents / 100).toFixed(2)
                            : (d.amountCents / 100).toFixed(2)
                        }
                        onChange={(e) =>
                          setEditFields((f) => ({
                            ...f,
                            amountCents: Math.round(parseFloat(e.target.value || "0") * 100),
                          }))
                        }
                      />
                    </td>
                    <td>
                      <select
                        className="usa-input text-sm"
                        value={editFields.status ?? d.status}
                        onChange={(e) =>
                          setEditFields((f) => ({
                            ...f,
                            status: e.target.value as DepositStatus,
                          }))
                        }
                      >
                        {DEPOSIT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.charAt(0).toUpperCase() + s.slice(1)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        className="usa-input text-sm"
                        value={editFields.source ?? d.source}
                        onChange={(e) =>
                          setEditFields((f) => ({ ...f, source: e.target.value || undefined }))
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="date"
                        className="usa-input text-sm"
                        value={
                          editFields.scheduledFor !== undefined
                            ? (editFields.scheduledFor ?? "")
                            : d.scheduledFor
                              ? d.scheduledFor.slice(0, 10)
                              : ""
                        }
                        onChange={(e) =>
                          setEditFields((f) => ({
                            ...f,
                            scheduledFor: e.target.value || null,
                          }))
                        }
                      />
                    </td>
                    <td className="text-sm text-gov-base">
                      {d.postedAt ? new Date(d.postedAt).toLocaleDateString("en-US") : "—"}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="usa-button usa-button--primary text-xs"
                          disabled={saving}
                          onClick={() => saveEdit(d.id)}
                        >
                          {saving ? "…" : "Save"}
                        </button>
                        <button
                          type="button"
                          className="usa-button usa-button--outline text-xs"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  // ---- Read row ---- //
                  <tr key={d.id}>
                    <td className="text-sm">{TYPE_LABELS[d.depositType] ?? d.depositType}</td>
                    <td className="text-sm text-gov-base">{d.description}</td>
                    <td className="font-semibold">{formatUSD(d.amountCents)}</td>
                    <td>
                      <span className={`usa-tag text-xs ${statusClass(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="text-sm text-gov-base">{d.source}</td>
                    <td className="text-sm text-gov-base">
                      {d.scheduledFor
                        ? new Date(d.scheduledFor).toLocaleDateString("en-US")
                        : "—"}
                    </td>
                    <td className="text-sm text-gov-base">
                      {d.postedAt
                        ? new Date(d.postedAt).toLocaleDateString("en-US")
                        : "—"}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          className="usa-button usa-button--outline text-xs"
                          onClick={() => startEdit(d)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs text-gov-red hover:underline"
                          onClick={() => {
                            setConfirmDeleteId(d.id);
                            setError("");
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
