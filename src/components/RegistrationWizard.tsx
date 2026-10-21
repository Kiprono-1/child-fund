"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ACCOUNT_TYPES,
  DOCUMENT_TYPES,
  RELATIONSHIPS,
  VERIFICATION_METHODS,
  formatUSD,
  quoteBenefits,
} from "@/lib/program";
import { STATES } from "@/lib/states";
import type { BenefitQuote } from "@/lib/program";

type FormState = {
  // guardian
  parentFullName: string;
  parentDob: string;
  parentSsnLast4: string;
  parentEmail: string;
  parentPhone: string;
  parentRelationship: string;
  // residence
  parentAddressLine1: string;
  parentAddressLine2: string;
  parentCity: string;
  parentState: string;
  parentZip: string;
  // child
  childFirstName: string;
  childMiddleName: string;
  childLastName: string;
  childDob: string;
  childGender: string;
  childSsnLast4: string;
  childBirthCity: string;
  childBirthState: string;
  // account
  accountType: string;
  custodianBank: string;
  routingNumber: string;
  accountLast4: string;
  monthlyContribution: number;
  // verification
  verificationMethod: string;
  // certification
  identityConsent: boolean;
  penaltyOfPerjury: boolean;
  electronicSignature: string;
};

const EMPTY: FormState = {
  parentFullName: "",
  parentDob: "",
  parentSsnLast4: "",
  parentEmail: "",
  parentPhone: "",
  parentRelationship: "",
  parentAddressLine1: "",
  parentAddressLine2: "",
  parentCity: "",
  parentState: "",
  parentZip: "",
  childFirstName: "",
  childMiddleName: "",
  childLastName: "",
  childDob: "",
  childGender: "",
  childSsnLast4: "",
  childBirthCity: "",
  childBirthState: "",
  accountType: "ctf_savings",
  custodianBank: "",
  routingNumber: "",
  accountLast4: "",
  monthlyContribution: 0,
  verificationMethod: "",
  identityConsent: false,
  penaltyOfPerjury: false,
  electronicSignature: "",
};

const STEP_NAMES = [
  "Guardian",
  "Residence & State",
  "Child",
  "Trust Account",
  "Verification",
  "Review & Certify",
];

const STORAGE_KEY = "ctf-application-draft-v1";

type PendingFile = { docType: string; fileName: string; fileSize: number; mimeType: string };

export default function RegistrationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    reference: string;
    quote: BenefitQuote;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setForm({ ...EMPTY, ...(JSON.parse(raw) as FormState) });
    } catch {
      /* ignore corrupt drafts */
    }
    setHydrated(true);
  }, []);


  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* storage full or blocked */
    }
  }, [form, hydrated]);

  const quote = useMemo(
    () =>
      quoteBenefits({
        dob: form.childDob || null,
        stateCode: form.parentState || null,
        guardianMonthlyCents: form.monthlyContribution * 100,
      }),
    [form.childDob, form.parentState, form.monthlyContribution],
  );

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const next = { ...e };
      delete next[key as string];
      return next;
    });
  };

  function validate(target: number): Record<string, string> {
    const e: Record<string, string> = {};
    if (target === 0) {
      if (!form.parentFullName.trim()) e.parentFullName = "Enter your full legal name.";
      if (!form.parentDob) e.parentDob = "Enter your date of birth.";
      if (!/^\d{4}$/.test(form.parentSsnLast4)) e.parentSsnLast4 = "Last 4 digits of your SSN.";
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.parentEmail))
        e.parentEmail = "Enter a valid email address.";
      if (form.parentPhone.replace(/\D/g, "").length < 10)
        e.parentPhone = "Enter a 10-digit U.S. phone number.";
      if (!form.parentRelationship) e.parentRelationship = "Select your relationship to the child.";
    }
    if (target === 1) {
      if (!form.parentAddressLine1.trim()) e.parentAddressLine1 = "Enter your street address.";
      if (!form.parentCity.trim()) e.parentCity = "Enter your city.";
      if (!form.parentState) e.parentState = "Select your state of residence.";
      if (!/^\d{5}(-\d{4})?$/.test(form.parentZip)) e.parentZip = "Enter a valid 5-digit ZIP code.";
    }
    if (target === 2) {
      if (!form.childFirstName.trim()) e.childFirstName = "Enter the child's first name.";
      if (!form.childLastName.trim()) e.childLastName = "Enter the child's last name.";
      if (!form.childDob) e.childDob = "Enter the child's date of birth.";
      else {
        const d = new Date(`${form.childDob}T00:00:00`);
        if (Number.isNaN(d.getTime())) e.childDob = "Enter a valid date.";
        else if (d > new Date()) e.childDob = "The date of birth cannot be in the future.";
      }
      if (!/^\d{4}$/.test(form.childSsnLast4))
        e.childSsnLast4 = "Enter the child's SSN last 4 digits.";
      if (!form.childBirthState) e.childBirthState = "Select the state of birth.";
    }
    if (target === 3) {
      if (!form.accountType) e.accountType = "Choose an account type.";
      if (!form.custodianBank.trim()) e.custodianBank = "Enter the custodian bank name.";
      if (!/^\d{9}$/.test(form.routingNumber))
        e.routingNumber = "A U.S. routing number is exactly 9 digits.";
      if (!/^\d{4}$/.test(form.accountLast4)) e.accountLast4 = "Enter the last 4 digits.";
      if (form.monthlyContribution < 0 || form.monthlyContribution > 416)
        e.monthlyContribution = "Enter $0–$416 (the annual limit is $5,000).";
    }
    if (target === 4) {
      if (!form.verificationMethod) e.verificationMethod = "Choose a verification method.";
    }
    if (target === 5) {
      if (!form.identityConsent) e.identityConsent = "You must authorize the identity check.";
      if (!form.penaltyOfPerjury) e.penaltyOfPerjury = "You must certify the information.";
      if (form.electronicSignature.trim().toLowerCase() !== form.parentFullName.trim().toLowerCase())
        e.electronicSignature = "Type your full legal name exactly as entered in Step 1.";
    }
    return e;
  }

  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length === 0) {
      setStep((s) => Math.min(s + 1, STEP_NAMES.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      const first = document.querySelector<HTMLElement>("[data-invalid='true']");
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      first?.focus?.();
    }
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    const e = validate(5);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          monthlyContribution: Number(form.monthlyContribution) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setErrors(data.errors ?? { form: data.error ?? "Submission failed." });
        return;
      }
      if (files.length > 0) {
        await fetch(`/api/applications/${data.reference}/actions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kind: "documents", documents: files }),
        });
      }
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
      setResult({ reference: data.reference, quote: data.quote });
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Redirect to dashboard so the guardian sees their account immediately
      router.push("/dashboard");
    } catch {
      setErrors({ form: "Network error. Please check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- confirmation ---------------- */
  if (result) {
    return (
      <div className="usa-card border-l-8 !border-l-gov-green p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ddf9c7] text-gov-green-dark">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-gov-green-dark">
              Registration submitted
            </p>
            <h2 className="mt-1 mb-0 font-serif text-2xl font-bold text-gov-navy">
              {form.childFirstName} {form.childLastName} is registered
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#3d4551]">
              Your application was received by the Child Trust Fund Administration and routed to
              the {result.quote.state?.name ?? "state"} treasury office. Write down your reference
              number — you will need it to track the application and to make deposits.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded border-2 border-dashed border-gov-primary bg-gov-primary-lightest p-4">
            <p className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-gov-primary-dark">
              Reference number
            </p>
            <p className="m-0 mt-1 font-mono text-2xl font-bold tracking-wide text-gov-navy">
              {result.reference}
            </p>
            <p className="m-0 mt-1 text-xs text-gov-base">
              Filed {new Date().toLocaleString("en-US")}
            </p>
          </div>
          <div className="rounded border border-gov-base-light bg-white p-4">
            <p className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-gov-primary-dark">
              Expected opening deposits
            </p>
            <ul className="m-0 mt-2 list-none space-y-1 p-0 text-sm">
              <li className="flex justify-between gap-3">
                <span>Federal seed deposit</span>
                <span className="font-bold tabular-nums">
                  {formatUSD(result.quote.tier.federalSeedCents)}
                </span>
              </li>
              <li className="flex justify-between gap-3">
                <span>{result.quote.state?.name ?? "State"} opening match</span>
                <span className="font-bold tabular-nums">{formatUSD(result.quote.stateMatchCents)}</span>
              </li>
              <li className="flex justify-between gap-3 border-t border-gov-base-light pt-1">
                <span>Projected total at age 18</span>
                <span className="font-bold tabular-nums text-gov-green-dark">
                  {formatUSD(result.quote.projectionAt18Cents, false)}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded bg-gov-base-lightest p-4">
          <h3 className="m-0 font-serif text-base font-bold text-gov-navy">What happens next</h3>
          <ol className="mt-2 mb-0 list-decimal space-y-1 pl-5 text-sm text-[#3d4551]">
            <li>
              We match the child&apos;s Social Security record and confirm{" "}
              {result.quote.state?.name ?? "your state"} residency (1–2 business days).
            </li>
            <li>
              Complete identity verification using the method you selected.{" "}
              <Link href="/verify" className="font-semibold text-gov-primary hover:underline">
                See verification options
              </Link>
              .
            </li>
            <li>
              A custodial account is opened at {form.custodianBank || "your custodian bank"} ending
              in ••••{form.accountLast4 || "0000"}.
            </li>
            <li>
              Federal and state deposits are wired within 10 business days of verification. You can
              follow every step on the{" "}
              <Link href="/status" className="font-semibold text-gov-primary hover:underline">
                application tracker
              </Link>
              .
            </li>
          </ol>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="usa-button usa-button--primary">
            Go to my dashboard
          </Link>
          <Link href={`/status?ref=${result.reference}&last=${encodeURIComponent(form.childLastName)}`} className="usa-button usa-button--outline-dark">
            Track this application
          </Link>
          <button type="button" onClick={() => window.print()} className="usa-button usa-button--outline-dark">
            Print confirmation
          </button>
          <button
            type="button"
            className="usa-button usa-button--outline-dark"
            onClick={() => {
              setResult(null);
              setForm(EMPTY);
              setFiles([]);
              setStep(0);
            }}
          >
            Register another child
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- wizard ---------------- */
  const pct = Math.round(((step + 1) / STEP_NAMES.length) * 100);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.75fr_1fr]">
      <div className="usa-card p-0">
        {/* progress */}
        <div className="border-b border-gov-base-light bg-gov-base-lightest px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-gov-primary">
              Step {step + 1} of {STEP_NAMES.length} — {STEP_NAMES[step]}
            </p>
            <p className="m-0 text-xs font-semibold text-gov-base">{pct}% complete</p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gov-base-light">
            <div className="h-full bg-gov-primary transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <ol className="mt-3 hidden list-none gap-1 p-0 sm:flex sm:flex-wrap">
            {STEP_NAMES.map((name, i) => (
              <li key={name} className="flex items-center gap-1 text-[0.7rem]">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i)}
                  disabled={i > step}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                    i === step
                      ? "bg-gov-navy text-white"
                      : i < step
                        ? "bg-[#ddf9c7] text-gov-green-dark hover:underline"
                        : "bg-gov-base-lighter text-gov-base"
                  }`}
                >
                  {i < step ? "✓" : i + 1} {name}
                </button>
              </li>
            ))}
          </ol>
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-8">
          {Object.keys(errors).length > 0 && (
            <div className="mb-6 border-l-4 border-gov-red bg-[#fdf3f2] p-4" role="alert">
              <p className="m-0 font-bold text-gov-red-dark">
                {errors.form ? "Submission failed" : "Please correct the following errors"}
              </p>
              <ul className="mt-2 mb-0 list-disc pl-5 text-sm text-gov-red-dark">
                {Object.values(errors).map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {step === 0 && (
            <StepShell
              title="Parent or legal guardian"
              desc="The account is opened by an adult U.S. resident who is the child's parent or court-appointed guardian. You will be the custodian until the child turns 18."
            >
              <Field label="Full legal name" required error={errors.parentFullName} htmlFor="parentFullName">
                <input
                  id="parentFullName"
                  className={`usa-input ${errors.parentFullName ? "usa-input--error" : ""}`}
                  data-invalid={Boolean(errors.parentFullName)}
                  value={form.parentFullName}
                  onChange={(e) => set("parentFullName", e.target.value)}
                  placeholder="First Middle Last"
                  autoComplete="name"
                />
                <span className="usa-hint">Exactly as printed on your driver&apos;s license or passport.</span>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date of birth" required error={errors.parentDob} htmlFor="parentDob">
                  <input
                    id="parentDob"
                    type="date"
                    className={`usa-input ${errors.parentDob ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentDob)}
                    value={form.parentDob}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => set("parentDob", e.target.value)}
                  />
                </Field>
                <Field label="SSN last 4 digits" required error={errors.parentSsnLast4} htmlFor="parentSsnLast4">
                  <input
                    id="parentSsnLast4"
                    inputMode="numeric"
                    maxLength={4}
                    className={`usa-input ${errors.parentSsnLast4 ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentSsnLast4)}
                    value={form.parentSsnLast4}
                    onChange={(e) => set("parentSsnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                  />
                  <span className="usa-hint">Never enter your full SSN on any website, including this one.</span>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Email address" required error={errors.parentEmail} htmlFor="parentEmail">
                  <input
                    id="parentEmail"
                    type="email"
                    className={`usa-input ${errors.parentEmail ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentEmail)}
                    value={form.parentEmail}
                    onChange={(e) => set("parentEmail", e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Field>
                <Field label="Mobile phone" required error={errors.parentPhone} htmlFor="parentPhone">
                  <input
                    id="parentPhone"
                    type="tel"
                    className={`usa-input ${errors.parentPhone ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentPhone)}
                    value={form.parentPhone}
                    onChange={(e) => set("parentPhone", e.target.value)}
                    placeholder="(555) 555-0100"
                    autoComplete="tel"
                  />
                </Field>
              </div>

              <Field label="Relationship to the child" required error={errors.parentRelationship} htmlFor="parentRelationship">
                <select
                  id="parentRelationship"
                  className={`usa-input ${errors.parentRelationship ? "usa-input--error" : ""}`}
                  data-invalid={Boolean(errors.parentRelationship)}
                  value={form.parentRelationship}
                  onChange={(e) => set("parentRelationship", e.target.value)}
                >
                  <option value="">— Select —</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
            </StepShell>
          )}

          {step === 1 && (
            <StepShell
              title="Residence and state of participation"
              desc="Your state of legal residence determines the state match added to the federal deposit and the state treasury office that reviews your application."
            >
              <Field label="Street address" required error={errors.parentAddressLine1} htmlFor="parentAddressLine1">
                <input
                  id="parentAddressLine1"
                  className={`usa-input ${errors.parentAddressLine1 ? "usa-input--error" : ""}`}
                  data-invalid={Boolean(errors.parentAddressLine1)}
                  value={form.parentAddressLine1}
                  onChange={(e) => set("parentAddressLine1", e.target.value)}
                  placeholder="1600 Pennsylvania Ave NW"
                  autoComplete="address-line1"
                />
              </Field>
              <Field label="Apartment, unit, or suite (optional)" htmlFor="parentAddressLine2">
                <input
                  id="parentAddressLine2"
                  className="usa-input"
                  value={form.parentAddressLine2}
                  onChange={(e) => set("parentAddressLine2", e.target.value)}
                  autoComplete="address-line2"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
                <Field label="City" required error={errors.parentCity} htmlFor="parentCity">
                  <input
                    id="parentCity"
                    className={`usa-input ${errors.parentCity ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentCity)}
                    value={form.parentCity}
                    onChange={(e) => set("parentCity", e.target.value)}
                    autoComplete="address-level2"
                  />
                </Field>
                <Field label="ZIP code" required error={errors.parentZip} htmlFor="parentZip">
                  <input
                    id="parentZip"
                    inputMode="numeric"
                    maxLength={10}
                    className={`usa-input ${errors.parentZip ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentZip)}
                    value={form.parentZip}
                    onChange={(e) => set("parentZip", e.target.value.replace(/[^\d-]/g, ""))}
                    placeholder="20500"
                    autoComplete="postal-code"
                  />
                </Field>
              </div>

              <fieldset className="m-0 border-0 p-0" data-invalid={Boolean(errors.parentState)}>
                <legend className="usa-label mb-2">
                  State, district or territory of residence <span className="text-gov-red">*</span>
                </legend>
                {errors.parentState && (
                  <p className="m-0 mb-2 text-sm font-bold text-gov-red-dark">{errors.parentState}</p>
                )}
                <div className="grid max-h-72 gap-1.5 overflow-y-auto rounded border border-gov-base-light bg-gov-base-lightest p-2 sm:grid-cols-2 lg:grid-cols-3">
                  {STATES.map((s) => {
                    const active = form.parentState === s.code;
                    return (
                      <label
                        key={s.code}
                        className={`flex cursor-pointer items-center gap-2 rounded border px-2.5 py-1.5 text-sm transition-colors ${
                          active
                            ? "border-gov-primary bg-gov-primary text-white"
                            : "border-transparent bg-white text-gov-ink hover:border-gov-primary-light"
                        }`}
                      >
                        <input
                          type="radio"
                          name="parentState"
                          className="accent-current"
                          checked={active}
                          onChange={() => set("parentState", s.code)}
                        />
                        <span className="font-semibold">{s.name}</span>
                        <span className={`ml-auto text-[0.68rem] font-bold ${active ? "text-gov-accent" : "text-gov-green-dark"}`}>
                          +{formatUSD(s.stateMatchCents, false)}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="usa-hint mt-2">
                  Green figures show each jurisdiction&apos;s opening match for the automatic
                  enrollment cohort (children born 2025–2028).
                </p>
              </fieldset>
            </StepShell>
          )}

          {step === 2 && (
            <StepShell
              title="Child information"
              desc="Enter the details exactly as they appear on the child's certified birth certificate. The date of birth determines the funding tier."
            >
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_2fr]">
                <Field label="First name" required error={errors.childFirstName} htmlFor="childFirstName">
                  <input
                    id="childFirstName"
                    className={`usa-input ${errors.childFirstName ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.childFirstName)}
                    value={form.childFirstName}
                    onChange={(e) => set("childFirstName", e.target.value)}
                  />
                </Field>
                <Field label="Middle (optional)" htmlFor="childMiddleName">
                  <input
                    id="childMiddleName"
                    className="usa-input"
                    value={form.childMiddleName}
                    onChange={(e) => set("childMiddleName", e.target.value)}
                  />
                </Field>
                <Field label="Last name" required error={errors.childLastName} htmlFor="childLastName">
                  <input
                    id="childLastName"
                    className={`usa-input ${errors.childLastName ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.childLastName)}
                    value={form.childLastName}
                    onChange={(e) => set("childLastName", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date of birth" required error={errors.childDob} htmlFor="childDob">
                  <input
                    id="childDob"
                    type="date"
                    className={`usa-input ${errors.childDob ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.childDob)}
                    value={form.childDob}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => set("childDob", e.target.value)}
                  />
                </Field>
                <Field label="SSN last 4 digits" required error={errors.childSsnLast4} htmlFor="childSsnLast4">
                  <input
                    id="childSsnLast4"
                    inputMode="numeric"
                    maxLength={4}
                    className={`usa-input ${errors.childSsnLast4 ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.childSsnLast4)}
                    value={form.childSsnLast4}
                    onChange={(e) => set("childSsnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="City of birth" htmlFor="childBirthCity">
                  <input
                    id="childBirthCity"
                    className="usa-input"
                    value={form.childBirthCity}
                    onChange={(e) => set("childBirthCity", e.target.value)}
                  />
                </Field>
                <Field label="State of birth" required error={errors.childBirthState} htmlFor="childBirthState">
                  <select
                    id="childBirthState"
                    className={`usa-input ${errors.childBirthState ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.childBirthState)}
                    value={form.childBirthState}
                    onChange={(e) => set("childBirthState", e.target.value)}
                  >
                    <option value="">— Select —</option>
                    {STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <fieldset className="m-0 border-0 p-0">
                <legend className="usa-label">Gender (optional, used for program statistics)</legend>
                <div className="flex flex-wrap gap-4 pt-1">
                  {["Female", "Male", "Prefer not to say"].map((g) => (
                    <label key={g} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="childGender"
                        checked={form.childGender === g}
                        onChange={() => set("childGender", g)}
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </fieldset>

              {form.childDob && (
                <div
                  className={`mt-2 rounded border-l-4 p-4 text-sm ${
                    quote.tier.autoEnrollment
                      ? "border-gov-green bg-[#f0f9ec] text-gov-green-dark"
                      : "border-gov-accent bg-[#fff8e8] text-[#5c4400]"
                  }`}
                >
                  <p className="m-0 font-bold">{quote.tier.headline}</p>
                  <p className="m-0 mt-1 leading-relaxed">{quote.tier.summary}</p>
                </div>
              )}
            </StepShell>
          )}

          {step === 3 && (
            <StepShell
              title="Child trust account"
              desc="Choose how the funds are held. The account is owned by the child; you are the custodian and cannot withdraw until the child turns 18."
            >
              <fieldset className="m-0 grid gap-3 border-0 p-0" data-invalid={Boolean(errors.accountType)}>
                <legend className="usa-label">Account type <span className="text-gov-red">*</span></legend>
                {ACCOUNT_TYPES.map((t) => (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer gap-3 rounded border p-3.5 transition-colors ${
                      form.accountType === t.id
                        ? "border-gov-primary bg-gov-primary-lightest"
                        : "border-gov-base-light bg-white hover:border-gov-primary-light"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      className="mt-1"
                      checked={form.accountType === t.id}
                      onChange={() => set("accountType", t.id)}
                    />
                    <span>
                      <span className="block font-serif text-base font-bold text-gov-navy">{t.label}</span>
                      <span className="mt-1 block text-sm text-[#3d4551]">{t.detail}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <Field label="Custodian bank or credit union" required error={errors.custodianBank} htmlFor="custodianBank">
                <input
                  id="custodianBank"
                  list="bank-list"
                  className={`usa-input ${errors.custodianBank ? "usa-input--error" : ""}`}
                  data-invalid={Boolean(errors.custodianBank)}
                  value={form.custodianBank}
                  onChange={(e) => set("custodianBank", e.target.value)}
                  placeholder="Start typing your bank's name"
                />
                <datalist id="bank-list">
                  {[
                    "First National Custodian Bank",
                    "Pacific Trust & Savings",
                    "Heritage Community Bank",
                    "Liberty Federal Credit Union",
                    "Meridian Savings Bank",
                    "Great Plains Trust Bank",
                    "Bank of America",
                    "Chase",
                    "Wells Fargo",
                    "Navy Federal Credit Union",
                  ].map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
                <span className="usa-hint">Must be an FDIC/NCUA-insured institution approved by the Fund Board.</span>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Routing number" required error={errors.routingNumber} htmlFor="routingNumber">
                  <input
                    id="routingNumber"
                    inputMode="numeric"
                    maxLength={9}
                    className={`usa-input ${errors.routingNumber ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.routingNumber)}
                    value={form.routingNumber}
                    onChange={(e) => set("routingNumber", e.target.value.replace(/\D/g, "").slice(0, 9))}
                    placeholder="9 digits"
                  />
                </Field>
                <Field label="Account last 4 digits" required error={errors.accountLast4} htmlFor="accountLast4">
                  <input
                    id="accountLast4"
                    inputMode="numeric"
                    maxLength={4}
                    className={`usa-input ${errors.accountLast4 ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.accountLast4)}
                    value={form.accountLast4}
                    onChange={(e) => set("accountLast4", e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="••••"
                  />
                </Field>
              </div>

              <Field
                label="Optional guardian contribution ($ per month)"
                error={errors.monthlyContribution}
                htmlFor="monthlyContribution"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gov-navy">$</span>
                  <input
                    id="monthlyContribution"
                    type="range"
                    min={0}
                    max={416}
                    step={5}
                    className="flex-1 accent-gov-primary"
                    value={form.monthlyContribution}
                    onChange={(e) => set("monthlyContribution", Number(e.target.value))}
                  />
                  <span className="w-20 text-right font-serif text-lg font-bold tabular-nums text-gov-navy">
                    ${form.monthlyContribution}
                  </span>
                </div>
                <span className="usa-hint">
                  Annual limit $5,000 per child.{" "}
                  {quote.state
                    ? `${quote.state.name} matches ${quote.state.contributionMatchPct}% of guardian contributions, up to ${formatUSD(
                        quote.state.contributionMatchCapCents,
                        false,
                      )} per year.`
                    : "Select your state in Step 2 to see your match rate."}
                </span>
              </Field>
            </StepShell>
          )}

          {step === 4 && (
            <StepShell
              title="Identity verification"
              desc="Federal law requires us to verify the identity of every adult who opens a custodial account for a minor. Choose the method that works for you."
            >
              <fieldset className="m-0 grid gap-3 border-0 p-0" data-invalid={Boolean(errors.verificationMethod)}>
                <legend className="sr-only">Verification method</legend>
                {VERIFICATION_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer gap-3 rounded border p-3.5 transition-colors ${
                      form.verificationMethod === m.id
                        ? "border-gov-primary bg-gov-primary-lightest"
                        : "border-gov-base-light bg-white hover:border-gov-primary-light"
                    }`}
                  >
                    <input
                      type="radio"
                      name="verificationMethod"
                      className="mt-1"
                      checked={form.verificationMethod === m.id}
                      onChange={() => set("verificationMethod", m.id)}
                    />
                    <span>
                      <span className="block font-serif text-base font-bold text-gov-navy">{m.label}</span>
                      <span className="mt-0.5 block text-sm text-[#3d4551]">{m.detail}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {errors.verificationMethod && (
                <p className="m-0 mt-2 text-sm font-bold text-gov-red-dark">{errors.verificationMethod}</p>
              )}

              {form.verificationMethod === "document_upload" && (
                <div className="mt-5 rounded border border-gov-base-light bg-gov-base-lightest p-4">
                  <h3 className="m-0 font-serif text-base font-bold text-gov-navy">
                    Upload your supporting documents
                  </h3>
                  <p className="mt-1 mb-3 text-sm text-[#3d4551]">
                    At least two documents are required: your government photo ID and the child&apos;s
                    certified birth certificate. Files stay on your device in this prototype — only
                    the file name and size are recorded with your application.
                  </p>
                  {files.length > 0 && (
                    <ul className="mb-3 list-none space-y-1 p-0 text-sm">
                      {files.map((f, i) => (
                        <li key={`${f.fileName}-${i}`} className="flex items-center gap-2 rounded bg-white px-3 py-2">
                          <span className="text-gov-green-dark">✓</span>
                          <span className="font-semibold">{f.fileName}</span>
                          <span className="text-gov-base">{(f.fileSize / 1024).toFixed(0)} KB</span>
                          <button
                            type="button"
                            onClick={() => setFiles(files.filter((_, x) => x !== i))}
                            className="ml-auto text-xs font-bold text-gov-red hover:underline"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <label className="usa-label" htmlFor="docType">
                    Document type
                  </label>
                  <select
                    id="docType"
                    className="usa-input mb-2"
                    defaultValue={DOCUMENT_TYPES[0]}
                    onChange={(e) => {
                      const input = document.getElementById("docFile") as HTMLInputElement | null;
                      if (input) input.dataset.docType = e.target.value;
                    }}
                  >
                    {DOCUMENT_TYPES.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <input
                    id="docFile"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="usa-input bg-white text-sm"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      const sel = document.getElementById("docType") as HTMLSelectElement | null;
                      if (!f) return;
                      setFiles((prev) => [
                        ...prev,
                        {
                          docType: sel?.value ?? DOCUMENT_TYPES[0],
                          fileName: f.name,
                          fileSize: f.size,
                          mimeType: f.type || "application/octet-stream",
                        },
                      ]);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {form.verificationMethod === "in_person" && (
                <p className="mt-4 text-sm text-[#3d4551]">
                  Bring originals to any {quote.state?.agency ?? "state treasury"} office. No
                  appointment is needed and verification is completed while you wait.
                </p>
              )}
            </StepShell>
          )}

          {step === 5 && (
            <StepShell
              title="Review and certify"
              desc="Confirm the information below, then sign electronically. Submitting a false statement is punishable under 18 U.S.C. § 1001."
            >
              <dl className="m-0 grid gap-x-8 gap-y-4 sm:grid-cols-2">
                <ReviewGroup title="Guardian">
                  <ReviewRow k="Name" v={form.parentFullName} />
                  <ReviewRow k="Date of birth" v={form.parentDob} />
                  <ReviewRow k="SSN (last 4)" v={form.parentSsnLast4} />
                  <ReviewRow k="Email" v={form.parentEmail} />
                  <ReviewRow k="Phone" v={form.parentPhone} />
                  <ReviewRow k="Relationship" v={form.parentRelationship} />
                </ReviewGroup>
                <ReviewGroup title="Residence">
                  <ReviewRow
                    k="Address"
                    v={`${form.parentAddressLine1}${form.parentAddressLine2 ? `, ${form.parentAddressLine2}` : ""}`}
                  />
                  <ReviewRow
                    k="City / ZIP"
                    v={`${form.parentCity}, ${form.parentState} ${form.parentZip}`}
                  />
                  <ReviewRow k="Participating office" v={quote.state?.agency ?? "—"} />
                </ReviewGroup>
                <ReviewGroup title="Child">
                  <ReviewRow
                    k="Name"
                    v={`${form.childFirstName} ${form.childMiddleName} ${form.childLastName}`.replace(/\s+/g, " ")}
                  />
                  <ReviewRow k="Date of birth" v={form.childDob} />
                  <ReviewRow k="SSN (last 4)" v={form.childSsnLast4} />
                  <ReviewRow k="Cohort" v={quote.tier.label} />
                </ReviewGroup>
                <ReviewGroup title="Trust account">
                  <ReviewRow k="Account type" v={ACCOUNT_TYPES.find((a) => a.id === form.accountType)?.label ?? "—"} />
                  <ReviewRow k="Custodian" v={form.custodianBank} />
                  <ReviewRow k="Routing / account" v={`${form.routingNumber} ••••${form.accountLast4}`} />
                  <ReviewRow k="Monthly contribution" v={`$${form.monthlyContribution}`} />
                  <ReviewRow
                    k="Verification"
                    v={VERIFICATION_METHODS.find((v) => v.id === form.verificationMethod)?.label ?? "—"}
                  />
                </ReviewGroup>
              </dl>

              <div className="mt-6 space-y-3 border-t border-gov-base-light pt-5">
                <label className="flex cursor-pointer items-start gap-3 text-sm" data-invalid={Boolean(errors.identityConsent)}>
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={form.identityConsent}
                    onChange={(e) => set("identityConsent", e.target.checked)}
                  />
                  <span>
                    I authorize the Child Trust Fund Administration and{" "}
                    {quote.state?.agency ?? "my state treasury office"} to verify my identity, my
                    relationship to the child, and the child&apos;s Social Security record.
                  </span>
                </label>
                {errors.identityConsent && (
                  <p className="m-0 pl-7 text-sm font-bold text-gov-red-dark">{errors.identityConsent}</p>
                )}
                <label className="flex cursor-pointer items-start gap-3 text-sm" data-invalid={Boolean(errors.penaltyOfPerjury)}>
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={form.penaltyOfPerjury}
                    onChange={(e) => set("penaltyOfPerjury", e.target.checked)}
                  />
                  <span>
                    I certify under penalty of perjury that I am the child&apos;s parent or legal
                    guardian, that the information above is true and correct, and that these funds
                    are held for the sole benefit of the child until age 18.
                  </span>
                </label>
                {errors.penaltyOfPerjury && (
                  <p className="m-0 pl-7 text-sm font-bold text-gov-red-dark">{errors.penaltyOfPerjury}</p>
                )}
                <Field label="Electronic signature (type your full legal name)" required error={errors.electronicSignature} htmlFor="electronicSignature">
                  <input
                    id="electronicSignature"
                    className={`usa-input font-serif text-base italic ${errors.electronicSignature ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.electronicSignature)}
                    value={form.electronicSignature}
                    onChange={(e) => set("electronicSignature", e.target.value)}
                    placeholder={form.parentFullName || "Your full legal name"}
                  />
                  <span className="usa-hint">
                    Signing on {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}. Your
                    IP address and timestamp are recorded with this application.
                  </span>
                </Field>
              </div>
            </StepShell>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gov-base-light pt-6">
            {step > 0 && (
              <button type="button" onClick={back} className="usa-button usa-button--outline-dark">
                ← Back
              </button>
            )}
            {step < STEP_NAMES.length - 1 ? (
              <button type="button" onClick={next} className="usa-button usa-button--primary">
                Continue →
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={submitting} className="usa-button usa-button--primary">
                {submitting ? "Submitting to the Treasury…" : "Submit application"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY);
                setFiles([]);
                setErrors({});
                setStep(0);
              }}
              className="ml-auto text-sm font-semibold text-gov-base hover:text-gov-red hover:underline"
            >
              Clear this draft
            </button>
          </div>
          <p className="mt-3 text-xs text-gov-base">
            Your answers are saved automatically in this browser so you can finish later. Estimated
            time to complete: 8–12 minutes.
          </p>
        </div>
      </div>

      <BenefitSidebar form={form} quote={quote} />
    </div>
  );
}

function StepShell({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby="step-title">
      <h2 id="step-title" className="m-0 font-serif text-2xl font-bold text-gov-navy">
        {title}
      </h2>
      <div className="gov-rule mt-2" />
      <p className="mt-3 mb-6 max-w-2xl text-sm leading-relaxed text-[#3d4551]">{desc}</p>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="usa-label" htmlFor={htmlFor}>
        {label} {required && <span className="text-gov-red">*</span>}
      </label>
      {children}
      {error && <p className="m-0 mt-1 text-sm font-bold text-gov-red-dark">{error}</p>}
    </div>
  );
}

function ReviewGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-2 border-b border-gov-base-light pb-1 text-xs font-bold uppercase tracking-wider text-gov-primary">
        {title}
      </dt>
      <dd className="m-0">
        <dl className="m-0 space-y-1.5">{children}</dl>
      </dd>
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-gov-base">{k}</dt>
      <dd className="m-0 text-right font-semibold text-gov-navy">{v || "—"}</dd>
    </div>
  );
}

function BenefitSidebar({ form, quote }: { form: FormState; quote: BenefitQuote }) {
  const rows = [
    {
      label: "Federal seed deposit",
      value: formatUSD(quote.tier.federalSeedCents),
      note: quote.tier.autoEnrollment ? "Automatic at verification" : "Not in this cohort",
    },
    {
      label: `${quote.state?.name ?? "State"} opening match`,
      value: formatUSD(quote.stateMatchCents),
      note: quote.state ? `${quote.state.contributionMatchPct}% match on your deposits` : "Select your state",
    },
    {
      label: "Federal birthday supplement",
      value: `${formatUSD(quote.tier.federalSupplementCents)} / yr`,
      note: "Paid each year until the child turns 6",
    },
    {
      label: "Your contributions",
      value: `${formatUSD(form.monthlyContribution * 100, false)} / mo`,
      note: `Up to ${formatUSD(500000, false)} per year`,
    },
  ];

  return (
    <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
      <div className="overflow-hidden rounded border border-gov-base-light bg-white">
        <div className="bg-gov-navy px-4 py-3">
          <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gov-accent">
            Live benefit estimate
          </p>
          <p className="m-0 mt-0.5 font-serif text-lg font-bold text-white">
            {form.childFirstName ? form.childFirstName : "Your child"}
            {form.childDob ? ` · born ${form.childDob}` : ""}
          </p>
        </div>
        <ul className="m-0 list-none divide-y divide-gov-base-light p-0">
          {rows.map((r) => (
            <li key={r.label} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-[#3d4551]">{r.label}</span>
                <span className="font-serif text-base font-bold tabular-nums text-gov-navy">{r.value}</span>
              </div>
              <span className="mt-0.5 block text-[0.72rem] text-gov-base">{r.note}</span>
            </li>
          ))}
        </ul>
        <div className="border-t-4 border-gov-accent bg-gov-primary-lightest px-4 py-4">
          <p className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-gov-primary-dark">
            Opening day total
          </p>
          <p className="m-0 font-serif text-3xl font-bold tabular-nums text-gov-navy">
            {formatUSD(quote.openingDayTotalCents)}
          </p>
          <p className="m-0 mt-2 text-[0.72rem] font-bold uppercase tracking-wider text-gov-primary-dark">
            Projected balance at age 18
          </p>
          <p className="m-0 font-serif text-2xl font-bold tabular-nums text-gov-green-dark">
            {formatUSD(quote.projectionAt18Cents, false)}
          </p>
          <p className="m-0 mt-1 text-[0.7rem] leading-snug text-gov-base">
            Assumes a 4.5% nominal annual return in the CTF Growth Portfolio. Projections are
            estimates, not a guarantee.
          </p>
        </div>
      </div>

      <div className="rounded border border-gov-base-light bg-gov-base-lightest p-4 text-xs leading-relaxed text-[#3d4551]">
        <p className="m-0 font-bold text-gov-navy">Need help?</p>
        <p className="m-0 mt-1">
          Call the Guardian Help Line at{" "}
          <a href="tel:18445554823" className="font-semibold text-gov-primary hover:underline">
            1-844-555-4CTF
          </a>{" "}
          or visit a{" "}
          <Link href="/contact" className="font-semibold text-gov-primary hover:underline">
            state treasury office
          </Link>
          . Assistance is available in English and Spanish, Monday–Friday 8 a.m. – 8 p.m. ET.
        </p>
      </div>
    </aside>
  );
}
