"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui";

const STATUS_OPTIONS = [
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "verification_required", label: "Verification Required" },
  { value: "approved", label: "Approved" },
  { value: "funded", label: "Funded" },
  { value: "rejected", label: "Rejected" },
];

type Props = {
  reference: string;
  currentStatus: string;
};

export default function ApplicationStatusPanel({ reference, currentStatus }: Props) {
  const router = useRouter();
  const [advanceState, setAdvanceState] = useState<"idle" | "loading" | "error">("idle");
  const [advanceError, setAdvanceError] = useState("");
  const [overrideStatus, setOverrideStatus] = useState(currentStatus);
  const [overrideNotes, setOverrideNotes] = useState("");
  const [overrideState, setOverrideState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [overrideError, setOverrideError] = useState("");

  async function handleAdvance() {
    setAdvanceState("loading");
    setAdvanceError("");
    try {
      const res = await fetch(`/api/applications/${reference}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance" }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        router.refresh();
      } else {
        setAdvanceError(data.error ?? "Could not advance.");
        setAdvanceState("error");
        return;
      }
    } catch {
      setAdvanceError("Network error.");
      setAdvanceState("error");
      return;
    }
    setAdvanceState("idle");
  }

  async function handleOverride(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setOverrideState("saving");
    setOverrideError("");
    try {
      const res = await fetch(`/api/admin/applications/${reference}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: overrideStatus, notes: overrideNotes }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setOverrideState("success");
        router.refresh();
      } else {
        setOverrideError(data.error ?? "Override failed.");
        setOverrideState("error");
      }
    } catch {
      setOverrideError("Network error.");
      setOverrideState("error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Current status */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gov-base">Current status:</span>
        <StatusBadge status={currentStatus} />
      </div>

      {/* Advance pipeline */}
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gov-navy">Advance pipeline</h3>
        <p className="mb-3 text-xs text-gov-base">
          Runs the next agency review step (same as the guardian-facing "advance" action).
        </p>
        {advanceError && (
          <p className="mb-2 text-sm text-gov-red">{advanceError}</p>
        )}
        <button
          type="button"
          onClick={handleAdvance}
          disabled={advanceState === "loading"}
          className="usa-button usa-button--primary w-full text-sm sm:w-auto"
        >
          {advanceState === "loading" ? "Advancing…" : "Approve & advance"}
        </button>
      </div>

      {/* Direct status override */}
      <form onSubmit={handleOverride} className="space-y-3">
        <h3 className="text-sm font-semibold text-gov-navy">Set status directly</h3>
        {overrideState === "success" && (
          <p className="text-sm text-gov-green-dark">Status updated.</p>
        )}
        {overrideState === "error" && (
          <p className="text-sm text-gov-red">{overrideError}</p>
        )}
        <div>
          <label className="usa-label text-xs" htmlFor="override-status">New status</label>
          <select
            id="override-status"
            className="usa-input py-1.5 text-sm"
            value={overrideStatus}
            onChange={(e) => setOverrideStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="usa-label text-xs" htmlFor="override-notes">Notes</label>
          <textarea
            id="override-notes"
            className="usa-input min-h-[5rem] text-sm"
            placeholder="Reason for this status change…"
            value={overrideNotes}
            onChange={(e) => setOverrideNotes(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={overrideState === "saving"}
          className="usa-button usa-button--outline-dark w-full text-sm sm:w-auto"
        >
          {overrideState === "saving" ? "Saving…" : "Apply override"}
        </button>
      </form>
    </div>
  );
}
