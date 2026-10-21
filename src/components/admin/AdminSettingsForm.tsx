"use client";

import { useState, type FormEvent } from "react";
import type { SiteContactInfo } from "@/lib/service";

export default function AdminSettingsForm({ initial }: { initial: SiteContactInfo }) {
  const [fields, setFields] = useState<SiteContactInfo>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setErrorMsg(data.error ?? "Save failed.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Network error. Please try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {status === "saved" && (
        <div role="status" className="rounded border border-gov-green bg-green-50 px-4 py-2 text-sm font-semibold text-gov-green-dark">
          ✅ Settings saved successfully.
        </div>
      )}
      {status === "error" && (
        <div role="alert" className="rounded border border-gov-red bg-red-50 px-4 py-2 text-sm text-gov-red">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="usa-label" htmlFor="cs-phone">
          Help line phone number
        </label>
        <p className="mb-1 text-xs text-gov-base">Displayed in the footer and contact page. Include country code if needed.</p>
        <input
          id="cs-phone"
          type="text"
          className="usa-input"
          value={fields.contactPhone}
          onChange={(e) => setFields((f) => ({ ...f, contactPhone: e.target.value }))}
          placeholder="e.g. 1-800-555-0199"
          required
        />
      </div>

      <div>
        <label className="usa-label" htmlFor="cs-email">
          Support email address
        </label>
        <p className="mb-1 text-xs text-gov-base">Shown on the contact page as the primary email.</p>
        <input
          id="cs-email"
          type="email"
          className="usa-input"
          value={fields.contactEmail}
          onChange={(e) => setFields((f) => ({ ...f, contactEmail: e.target.value }))}
          placeholder="e.g. support@childtrustfund.gov"
          required
        />
      </div>

      <div>
        <label className="usa-label" htmlFor="cs-hours">
          Help line hours
        </label>
        <p className="mb-1 text-xs text-gov-base">Displayed beneath the phone number in the footer.</p>
        <input
          id="cs-hours"
          type="text"
          className="usa-input"
          value={fields.helplineHours}
          onChange={(e) => setFields((f) => ({ ...f, helplineHours: e.target.value }))}
          placeholder="e.g. Monday–Friday, 8:00 a.m. – 8:00 p.m. Eastern"
          required
        />
      </div>

      <button
        type="submit"
        className="usa-button usa-button--primary w-full sm:w-auto"
        disabled={status === "saving"}
      >
        {status === "saving" ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
