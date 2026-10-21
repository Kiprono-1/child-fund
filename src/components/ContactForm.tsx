"use client";

import { useState } from "react";
import { STATES } from "@/lib/states";

const TOPICS = [
  "Registering a child",
  "Identity verification",
  "Deposits and balances",
  "State match rates",
  "Changing account details",
  "Report fraud or a problem",
  "Media inquiry",
  "Accessibility assistance",
];

export default function ContactForm() {
  const [form, setForm] = useState({
    topic: TOPICS[0],
    fullName: "",
    email: "",
    phone: "",
    state: "",
    referenceNumber: "",
    message: "",
  });
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setStatus(
        data.ok
          ? {
              ok: true,
              text: "Your message was logged with the Guardian Help Desk. A specialist replies within 2 business days.",
            }
          : { ok: false, text: data.error ?? "We could not submit your message." },
      );
      if (data.ok) {
        setForm({ ...form, fullName: "", email: "", phone: "", referenceNumber: "", message: "" });
      }
    } catch {
      setStatus({ ok: false, text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="usa-card p-5 sm:p-6">
      <h2 className="m-0 font-serif text-xl font-bold text-gov-navy">Send us a message</h2>
      <p className="mt-1 mb-5 text-sm text-[#3d4551]">
        Do not include your full Social Security number, bank account number or passwords in this
        form. Reference numbers are safe to include.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="usa-label" htmlFor="c-topic">
            Topic <span className="text-gov-red">*</span>
          </label>
          <select
            id="c-topic"
            className="usa-input"
            value={form.topic}
            onChange={(e) => set("topic", e.target.value)}
          >
            {TOPICS.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="usa-label" htmlFor="c-ref">
            CTF reference number (optional)
          </label>
          <input
            id="c-ref"
            className="usa-input font-mono uppercase"
            value={form.referenceNumber}
            onChange={(e) => set("referenceNumber", e.target.value.toUpperCase())}
            placeholder="CTF-2026-XXXXXX"
          />
        </div>
        <div>
          <label className="usa-label" htmlFor="c-name">
            Full name <span className="text-gov-red">*</span>
          </label>
          <input
            id="c-name"
            className="usa-input"
            required
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            autoComplete="name"
          />
        </div>
        <div>
          <label className="usa-label" htmlFor="c-email">
            Email <span className="text-gov-red">*</span>
          </label>
          <input
            id="c-email"
            type="email"
            className="usa-input"
            required
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
        </div>
        <div>
          <label className="usa-label" htmlFor="c-phone">
            Phone (optional)
          </label>
          <input
            id="c-phone"
            type="tel"
            className="usa-input"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
            autoComplete="tel"
          />
        </div>
        <div>
          <label className="usa-label" htmlFor="c-state">
            State (optional)
          </label>
          <select id="c-state" className="usa-input" value={form.state} onChange={(e) => set("state", e.target.value)}>
            <option value="">— Select —</option>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className="usa-label" htmlFor="c-message">
          How can we help? <span className="text-gov-red">*</span>
        </label>
        <textarea
          id="c-message"
          className="usa-input min-h-36"
          required
          maxLength={2000}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
        />
        <span className="usa-hint">{form.message.length} / 2000 characters</span>
      </div>

      {status && (
        <p
          role="status"
          className={`mt-4 mb-0 border-l-4 p-3 text-sm font-semibold ${
            status.ok
              ? "border-gov-green bg-[#f0f9ec] text-gov-green-dark"
              : "border-gov-red bg-[#fdf3f2] text-gov-red-dark"
          }`}
        >
          {status.text}
        </p>
      )}

      <div className="mt-5">
        <button type="submit" disabled={busy} className="usa-button usa-button--primary">
          {busy ? "Sending…" : "Send message"}
        </button>
      </div>
    </form>
  );
}
