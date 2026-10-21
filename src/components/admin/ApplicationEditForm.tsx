"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

type EditableFields = {
  parentFullName: string;
  parentEmail: string;
  parentPhone: string;
  parentAddressLine1: string;
  parentAddressLine2: string | null;
  parentCity: string;
  parentState: string;
  parentZip: string;
  childFirstName: string;
  childMiddleName: string | null;
  childLastName: string;
  childDob: string;
  verificationStatus: string;
  participationTier: string;
};

type Props = {
  reference: string;
  initial: EditableFields;
};

export default function ApplicationEditForm({ reference, initial }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<EditableFields>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Nullable fields — empty string → null. Required string fields keep their value.
  const NULLABLE_FIELDS = new Set<keyof EditableFields>(["parentAddressLine2", "childMiddleName"]);

  function update(key: keyof EditableFields, value: string) {
    setFields((prev) => ({
      ...prev,
      [key]: NULLABLE_FIELDS.has(key) ? (value || null) : value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/admin/applications/${reference}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setStatus("success");
        router.refresh();
      } else {
        setErrorMsg(data.error ?? "Save failed.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("A network error occurred.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {status === "success" && (
        <div role="status" className="rounded border border-gov-green bg-green-50 px-4 py-2 text-sm text-gov-green-dark">
          Changes saved successfully.
        </div>
      )}
      {status === "error" && (
        <div role="alert" className="rounded border border-gov-red bg-red-50 px-4 py-2 text-sm text-gov-red">
          {errorMsg}
        </div>
      )}

      {/* Guardian section */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-gov-navy">Guardian Information</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="usa-label" htmlFor="ef-parentFullName">Full name</label>
            <input id="ef-parentFullName" className="usa-input" value={fields.parentFullName}
              onChange={(e) => update("parentFullName", e.target.value)} required />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-parentEmail">Email</label>
            <input id="ef-parentEmail" type="email" className="usa-input" value={fields.parentEmail}
              onChange={(e) => update("parentEmail", e.target.value)} required />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-parentPhone">Phone</label>
            <input id="ef-parentPhone" className="usa-input" value={fields.parentPhone}
              onChange={(e) => update("parentPhone", e.target.value)} />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-parentAddressLine1">Address line 1</label>
            <input id="ef-parentAddressLine1" className="usa-input" value={fields.parentAddressLine1}
              onChange={(e) => update("parentAddressLine1", e.target.value)} />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-parentAddressLine2">Address line 2</label>
            <input id="ef-parentAddressLine2" className="usa-input" value={fields.parentAddressLine2 ?? ""}
              onChange={(e) => update("parentAddressLine2", e.target.value)} />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-parentCity">City</label>
            <input id="ef-parentCity" className="usa-input" value={fields.parentCity}
              onChange={(e) => update("parentCity", e.target.value)} />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-parentState">State</label>
            <input id="ef-parentState" className="usa-input" maxLength={2} value={fields.parentState}
              onChange={(e) => update("parentState", e.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-parentZip">ZIP</label>
            <input id="ef-parentZip" className="usa-input" value={fields.parentZip}
              onChange={(e) => update("parentZip", e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Child section */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-gov-navy">Child Information</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="usa-label" htmlFor="ef-childFirstName">First name</label>
            <input id="ef-childFirstName" className="usa-input" value={fields.childFirstName}
              onChange={(e) => update("childFirstName", e.target.value)} required />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-childMiddleName">Middle name</label>
            <input id="ef-childMiddleName" className="usa-input" value={fields.childMiddleName ?? ""}
              onChange={(e) => update("childMiddleName", e.target.value)} />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-childLastName">Last name</label>
            <input id="ef-childLastName" className="usa-input" value={fields.childLastName}
              onChange={(e) => update("childLastName", e.target.value)} required />
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-childDob">Date of birth</label>
            <input id="ef-childDob" type="date" className="usa-input" value={fields.childDob}
              onChange={(e) => update("childDob", e.target.value)} />
          </div>
        </div>
      </fieldset>

      {/* Account / verification */}
      <fieldset className="space-y-4">
        <legend className="font-semibold text-gov-navy">Account &amp; Verification</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="usa-label" htmlFor="ef-verificationStatus">Verification status</label>
            <select id="ef-verificationStatus" className="usa-input"
              value={fields.verificationStatus}
              onChange={(e) => update("verificationStatus", e.target.value)}>
              <option value="not_started">Not started</option>
              <option value="in_progress">In progress</option>
              <option value="awaiting_documents">Awaiting documents</option>
              <option value="in_review">In review</option>
              <option value="verified">Verified</option>
              <option value="failed">Failed</option>
            </select>
          </div>
          <div>
            <label className="usa-label" htmlFor="ef-participationTier">Participation tier</label>
            <select id="ef-participationTier" className="usa-input"
              value={fields.participationTier}
              onChange={(e) => update("participationTier", e.target.value)}>
              <option value="automatic">Automatic</option>
              <option value="standard">Standard</option>
              <option value="legacy">Legacy</option>
            </select>
          </div>
        </div>
      </fieldset>

      <button
        type="submit"
        className="usa-button usa-button--primary w-full sm:w-auto"
        disabled={status === "saving"}
      >
        {status === "saving" ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
