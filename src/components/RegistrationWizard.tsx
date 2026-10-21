"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ACCOUNT_TYPES,
  DOCUMENT_TYPES,
  MINIMUM_INITIAL_DEPOSIT_CENTS,
  RELATIONSHIPS,
  VERIFICATION_METHODS,
  formatUSD,
  quoteBenefits,
} from "@/lib/program";
import { STATES } from "@/lib/states";
import type { BenefitQuote } from "@/lib/program";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChildEntry = {
  firstName: string;
  middleName: string;
  lastName: string;
  dob: string;
  gender: string;
  ssnLast4: string;
  birthCity: string;
  birthState: string;
  accountType: string;
  custodianBank: string;
  routingNumber: string;
  accountLast4: string;
  initialDepositDollars: number;
  verificationMethod: string;
};

type GuardianState = {
  parentFullName: string;
  parentDob: string;
  parentSsnLast4: string;
  parentEmail: string;
  parentPhone: string;
  parentRelationship: string;
  parentAddressLine1: string;
  parentAddressLine2: string;
  parentCity: string;
  parentState: string;
  parentZip: string;
  identityConsent: boolean;
  penaltyOfPerjury: boolean;
  electronicSignature: string;
};

type FormState = GuardianState & {
  numChildren: number;
  children: ChildEntry[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_DEPOSIT = MINIMUM_INITIAL_DEPOSIT_CENTS / 100; // 1500

const EMPTY_CHILD: ChildEntry = {
  firstName: "",
  middleName: "",
  lastName: "",
  dob: "",
  gender: "",
  ssnLast4: "",
  birthCity: "",
  birthState: "",
  accountType: "ctf_savings",
  custodianBank: "",
  routingNumber: "",
  accountLast4: "",
  initialDepositDollars: MIN_DEPOSIT,
  verificationMethod: "",
};

const EMPTY_GUARDIAN: GuardianState = {
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
  identityConsent: false,
  penaltyOfPerjury: false,
  electronicSignature: "",
};

const EMPTY: FormState = {
  ...EMPTY_GUARDIAN,
  numChildren: 1,
  children: [{ ...EMPTY_CHILD }],
};

/**
 * Logical step indices:
 *  0 — How Many Children
 *  1 — Guardian
 *  2 — Residence & State
 *  3 — Child N – Details  (repeats per child)
 *  4 — Child N – Account  (repeats per child)
 *  5 — Verification       (repeats per child)
 *  6 — Review & Certify
 */
const STEP_NAMES = [
  "How Many Children",
  "Guardian",
  "Residence & State",
  "Child Details",
  "Child Account",
  "Verification",
  "Review & Certify",
] as const;

const STORAGE_KEY = "ctf-application-draft-v2";

type PendingFile = { docType: string; fileName: string; fileSize: number; mimeType: string };

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegistrationWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [childIndex, setChildIndex] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<PendingFile[][]>([[]]); // per-child file lists
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<
    { reference: string; quote: BenefitQuote; childName: string }[]
  >([]);
  const [hydrated, setHydrated] = useState(false);

  // ── hydrate from localStorage ──
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as FormState;
        setForm({ ...EMPTY, ...parsed });
      }
    } catch {
      /* ignore corrupt drafts */
    }
    setHydrated(true);
  }, []);

  // ── persist draft ──
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      /* storage full or blocked */
    }
  }, [form, hydrated]);

  // ── keep children array in sync with numChildren ──
  useEffect(() => {
    setForm((f) => {
      const n = f.numChildren;
      if (f.children.length === n) return f;
      if (f.children.length < n) {
        return {
          ...f,
          children: [
            ...f.children,
            ...Array.from({ length: n - f.children.length }, () => ({ ...EMPTY_CHILD })),
          ],
        };
      }
      return { ...f, children: f.children.slice(0, n) };
    });
    setFiles((prev) => {
      const n = form.numChildren;
      if (prev.length === n) return prev;
      if (prev.length < n) {
        return [...prev, ...Array.from({ length: n - prev.length }, () => [] as PendingFile[])];
      }
      return prev.slice(0, n);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.numChildren]);

  // ── current child ──
  const child = form.children[childIndex] ?? EMPTY_CHILD;

  const quote = useMemo(
    () =>
      quoteBenefits({
        dob: child.dob || null,
        stateCode: form.parentState || null,
        guardianMonthlyCents: 0,
      }),
    [child.dob, form.parentState],
  );

  // ── setters ──
  function setGuardian<K extends keyof GuardianState>(key: K, value: GuardianState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  function setChild<K extends keyof ChildEntry>(key: K, value: ChildEntry[K]) {
    setForm((f) => {
      const children = [...f.children];
      children[childIndex] = { ...children[childIndex], [key]: value };
      return { ...f, children };
    });
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  // ── validation ──
  function validate(target: number): Record<string, string> {
    const e: Record<string, string> = {};
    const today = new Date();

    if (target === 0) {
      if (form.numChildren < 1 || form.numChildren > 5)
        e.numChildren = "Select a number between 1 and 5.";
    }

    if (target === 1) {
      if (form.parentFullName.trim().split(/\s+/).length < 2)
        e.parentFullName = "Enter your first and last name.";
      if (!form.parentDob) {
        e.parentDob = "Enter your date of birth.";
      } else {
        const dob = new Date(`${form.parentDob}T00:00:00`);
        if (Number.isNaN(dob.getTime())) {
          e.parentDob = "Enter a valid date.";
        } else {
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
          if (age < 18) e.parentDob = "Guardian must be 18 or older.";
        }
      }
      if (!/^\d{4}$/.test(form.parentSsnLast4))
        e.parentSsnLast4 = "Enter the last 4 digits of your SSN.";
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(form.parentEmail))
        e.parentEmail = "Enter a valid email address.";
      if (form.parentPhone.replace(/\D/g, "").length !== 10)
        e.parentPhone = "Enter a 10-digit U.S. phone number.";
      if (!form.parentRelationship)
        e.parentRelationship = "Select your relationship to the child.";
    }

    if (target === 2) {
      if (!form.parentAddressLine1.trim()) e.parentAddressLine1 = "Enter your street address.";
      if (!form.parentCity.trim()) e.parentCity = "Enter your city.";
      if (!form.parentState) e.parentState = "Select your state of residence.";
      if (!/^\d{5}(-\d{4})?$/.test(form.parentZip))
        e.parentZip = "Enter a valid 5-digit ZIP code.";
    }

    if (target === 3) {
      // child details
      if (!/^[A-Za-z\-']+$/.test(child.firstName.trim()) || !child.firstName.trim())
        e.firstName = "First name must contain only letters, hyphens, or apostrophes.";
      if (!/^[A-Za-z\-']+$/.test(child.lastName.trim()) || !child.lastName.trim())
        e.lastName = "Last name must contain only letters, hyphens, or apostrophes.";
      if (!child.dob) {
        e.dob = "Enter the child's date of birth.";
      } else {
        const dob = new Date(`${child.dob}T00:00:00`);
        if (Number.isNaN(dob.getTime())) {
          e.dob = "Enter a valid date.";
        } else if (dob > today) {
          e.dob = "The date of birth cannot be in the future.";
        } else {
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
          if (age >= 18) e.dob = "Child must be under 18 years old.";
        }
      }
      if (!/^\d{4}$/.test(child.ssnLast4))
        e.ssnLast4 = "Enter the child's SSN last 4 digits.";
      if (!child.birthCity.trim()) e.birthCity = "Enter the city of birth.";
      if (!child.birthState) e.birthState = "Select the state of birth.";
    }

    if (target === 4) {
      // child account
      if (!child.accountType) e.accountType = "Choose an account type.";
      if (!child.custodianBank.trim()) e.custodianBank = "Enter the custodian bank name.";
      if (!/^\d{9}$/.test(child.routingNumber))
        e.routingNumber = "A U.S. routing number is exactly 9 digits.";
      if (!/^\d{4}$/.test(child.accountLast4)) e.accountLast4 = "Enter the last 4 digits.";
      if (child.initialDepositDollars < MIN_DEPOSIT)
        e.initialDepositDollars = `Minimum deposit is $${MIN_DEPOSIT.toFixed(2)}.`;
    }

    if (target === 5) {
      // verification
      if (!child.verificationMethod) e.verificationMethod = "Choose a verification method.";
    }

    if (target === 6) {
      // review & certify
      if (!form.identityConsent) e.identityConsent = "You must authorize the identity check.";
      if (!form.penaltyOfPerjury) e.penaltyOfPerjury = "You must certify the information.";
      if (
        form.electronicSignature.trim().toLowerCase() !==
        form.parentFullName.trim().toLowerCase()
      )
        e.electronicSignature = "Type your full legal name exactly as entered in Step 2.";
    }

    return e;
  }

  // ── navigation ──
  function next() {
    const e = validate(step);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      const first = document.querySelector<HTMLElement>("[data-invalid='true']");
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      first?.focus?.();
      return;
    }

    // After child details (step 3) or child account (step 4), we stay on the
    // same logical step but increment childIndex if more children remain.
    if (step === 3 || step === 4 || step === 5) {
      const isLastChild = childIndex === form.numChildren - 1;
      if (!isLastChild && step === 5) {
        // finished all per-child steps for this child → move to next child, back to step 3
        setChildIndex((c) => c + 1);
        setStep(3);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
    }

    setStep((s) => Math.min(s + 1, STEP_NAMES.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setErrors({});
    // If on child details (step 3) and not on the first child, go back to
    // previous child's verification step.
    if (step === 3 && childIndex > 0) {
      setChildIndex((c) => c - 1);
      setStep(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setStep((s) => Math.max(0, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── submit ──
  async function submit() {
    const e = validate(6);
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    const submitted: { reference: string; quote: BenefitQuote; childName: string }[] = [];

    try {
      for (let i = 0; i < form.numChildren; i++) {
        const c = form.children[i];
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentFullName: form.parentFullName,
            parentDob: form.parentDob,
            parentSsnLast4: form.parentSsnLast4,
            parentEmail: form.parentEmail,
            parentPhone: form.parentPhone,
            parentRelationship: form.parentRelationship,
            parentAddressLine1: form.parentAddressLine1,
            parentAddressLine2: form.parentAddressLine2,
            parentCity: form.parentCity,
            parentState: form.parentState,
            parentZip: form.parentZip,
            childFirstName: c.firstName,
            childMiddleName: c.middleName,
            childLastName: c.lastName,
            childDob: c.dob,
            childGender: c.gender,
            childSsnLast4: c.ssnLast4,
            childBirthCity: c.birthCity,
            childBirthState: c.birthState,
            accountType: c.accountType,
            custodianBank: c.custodianBank,
            routingNumber: c.routingNumber,
            accountLast4: c.accountLast4,
            monthlyContribution: 0,
            verificationMethod: c.verificationMethod,
            identityConsent: form.identityConsent,
            penaltyOfPerjury: form.penaltyOfPerjury,
            electronicSignature: form.electronicSignature,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setErrors(
            data.errors ?? {
              form: `Registration failed for child ${i + 1} (${c.firstName} ${c.lastName}): ${data.error ?? "Submission failed."}`,
            },
          );
          setSubmitting(false);
          return;
        }

        // Upload documents for this child
        const childFiles = files[i] ?? [];
        if (childFiles.length > 0) {
          await fetch(`/api/applications/${data.reference}/actions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: "documents", documents: childFiles }),
          });
        }

        submitted.push({
          reference: data.reference as string,
          quote: data.quote as BenefitQuote,
          childName: `${c.firstName} ${c.lastName}`,
        });
      }

      // All children registered
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* noop */
      }
      setResults(submitted);
      window.scrollTo({ top: 0, behavior: "smooth" });
      router.push("/dashboard");
    } catch {
      setErrors({ form: "Network error. Please check your connection and try again." });
    } finally {
      setSubmitting(false);
    }
  }

  // ── confirmation screen ──
  if (results.length > 0) {
    return (
      <div className="usa-card border-l-8 !border-l-gov-green p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ddf9c7] text-gov-green-dark">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path
                d="m5 12.5 4.5 4.5L19 7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-gov-green-dark">
              Registration submitted
            </p>
            <h2 className="mt-1 mb-0 font-serif text-2xl font-bold text-gov-navy">
              {results.length === 1
                ? `${results[0].childName} is registered`
                : `${results.length} children registered`}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#3d4551]">
              Your {results.length === 1 ? "application was" : "applications were"} received by
              the Child Trust Fund Administration. Write down your reference{" "}
              {results.length === 1 ? "number" : "numbers"} — you will need{" "}
              {results.length === 1 ? "it" : "them"} to track and make deposits.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {results.map((r) => (
            <div
              key={r.reference}
              className="rounded border-2 border-dashed border-gov-primary bg-gov-primary-lightest p-4"
            >
              <p className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-gov-primary-dark">
                {r.childName} · Reference number
              </p>
              <p className="m-0 mt-1 font-mono text-2xl font-bold tracking-wide text-gov-navy">
                {r.reference}
              </p>
              <p className="m-0 mt-1 text-xs text-gov-base">
                Filed {new Date().toLocaleString("en-US")}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/dashboard" className="usa-button usa-button--primary">
            Go to my dashboard
          </Link>
          <button
            type="button"
            className="usa-button usa-button--outline-dark"
            onClick={() => window.print()}
          >
            Print confirmation
          </button>
          <button
            type="button"
            className="usa-button usa-button--outline-dark"
            onClick={() => {
              setResults([]);
              setForm(EMPTY);
              setFiles([[]]);
              setChildIndex(0);
              setStep(0);
            }}
          >
            Register more children
          </button>
        </div>
      </div>
    );
  }

  // ── progress calculation ──
  // Total logical pages = 3 fixed (0,1,2) + numChildren×3 (steps 3,4,5 per child) + 1 (step 6)
  const totalPages = 3 + form.numChildren * 3 + 1;
  // Completed pages so far
  const completedPages =
    step <= 2
      ? step
      : step === 6
        ? totalPages - 1
        : 3 + childIndex * 3 + (step - 3);
  const pct = Math.round(((completedPages + 1) / totalPages) * 100);

  // Step name with child index
  const stepLabel =
    step === 3
      ? `Child ${childIndex + 1} of ${form.numChildren} – Details`
      : step === 4
        ? `Child ${childIndex + 1} of ${form.numChildren} – Account`
        : step === 5
          ? `Child ${childIndex + 1} of ${form.numChildren} – Verification`
          : STEP_NAMES[step];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.75fr_1fr]">
      <div className="usa-card p-0">
        {/* ── progress bar ── */}
        <div className="border-b border-gov-base-light bg-gov-base-lightest px-5 py-4 sm:px-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-gov-primary">
              {stepLabel}
            </p>
            <p className="m-0 text-xs font-semibold text-gov-base">{pct}% complete</p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gov-base-light">
            <div
              className="h-full bg-gov-primary transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          {/* compact step chips */}
          <ol className="mt-3 hidden list-none gap-1 p-0 sm:flex sm:flex-wrap">
            {STEP_NAMES.map((name, i) => {
              const done = i < step || (i === step && step < 3);
              const active = i === step;
              return (
                <li key={name} className="flex items-center gap-1 text-[0.7rem]">
                  <span
                    className={`flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                      active
                        ? "bg-gov-navy text-white"
                        : done
                          ? "bg-[#ddf9c7] text-gov-green-dark"
                          : "bg-gov-base-lighter text-gov-base"
                    }`}
                  >
                    {done ? "✓" : i + 1} {name}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="px-5 py-6 sm:px-7 sm:py-8">
          {/* error summary */}
          {Object.keys(errors).length > 0 && (
            <div
              className="mb-6 border-l-4 border-gov-red bg-[#fdf3f2] p-4"
              role="alert"
            >
              <p className="m-0 font-bold text-gov-red-dark">
                {errors.form
                  ? "Submission failed"
                  : "Please correct the following errors"}
              </p>
              <ul className="mt-2 mb-0 list-disc pl-5 text-sm text-gov-red-dark">
                {Object.values(errors).map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ── STEP 0: How Many Children ── */}
          {step === 0 && (
            <StepShell
              title="How many children are you registering?"
              desc="You can register 1 to 5 children in a single session. You will enter details for each child separately."
            >
              <div className="rounded border border-gov-accent bg-[#fff8e8] p-4 text-sm text-[#5c4400]">
                <p className="m-0 font-bold">
                  A $1,500.00 initial deposit is required per child.
                </p>
                <p className="m-0 mt-1">
                  Total for {form.numChildren} child{form.numChildren !== 1 ? "ren" : ""}:{" "}
                  <strong>{formatUSD(form.numChildren * MIN_DEPOSIT * 100)}</strong>. Contact admin
                  to arrange payment after registering.
                </p>
              </div>

              <fieldset className="m-0 border-0 p-0" data-invalid={Boolean(errors.numChildren)}>
                <legend className="usa-label mb-3">
                  Number of children <span className="text-gov-red">*</span>
                </legend>
                {errors.numChildren && (
                  <p className="m-0 mb-2 text-sm font-bold text-gov-red-dark">
                    {errors.numChildren}
                  </p>
                )}
                <div className="flex flex-wrap gap-3">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label
                      key={n}
                      className={`flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 font-serif text-xl font-bold transition-colors ${
                        form.numChildren === n
                          ? "border-gov-primary bg-gov-primary text-white"
                          : "border-gov-base-light bg-white text-gov-navy hover:border-gov-primary"
                      }`}
                    >
                      <input
                        type="radio"
                        name="numChildren"
                        className="sr-only"
                        value={n}
                        checked={form.numChildren === n}
                        onChange={() =>
                          setForm((f) => ({ ...f, numChildren: n }))
                        }
                      />
                      {n}
                    </label>
                  ))}
                </div>
                <p className="usa-hint mt-3">
                  Each child gets a separate application and reference number.
                </p>
              </fieldset>
            </StepShell>
          )}

          {/* ── STEP 1: Guardian ── */}
          {step === 1 && (
            <StepShell
              title="Parent or legal guardian"
              desc="The account is opened by an adult U.S. resident who is the child's parent or court-appointed guardian. You will be the custodian until the child turns 18."
            >
              <Field
                label="Full legal name"
                required
                error={errors.parentFullName}
                htmlFor="parentFullName"
              >
                <input
                  id="parentFullName"
                  className={`usa-input ${errors.parentFullName ? "usa-input--error" : ""}`}
                  data-invalid={Boolean(errors.parentFullName)}
                  value={form.parentFullName}
                  onChange={(e) => setGuardian("parentFullName", e.target.value)}
                  placeholder="First Middle Last"
                  autoComplete="name"
                />
                <span className="usa-hint">
                  Exactly as printed on your driver&apos;s license or passport.
                </span>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Date of birth"
                  required
                  error={errors.parentDob}
                  htmlFor="parentDob"
                >
                  <input
                    id="parentDob"
                    type="date"
                    className={`usa-input ${errors.parentDob ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentDob)}
                    value={form.parentDob}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setGuardian("parentDob", e.target.value)}
                  />
                  <span className="usa-hint">Guardian must be 18 or older.</span>
                </Field>
                <Field
                  label="SSN last 4 digits"
                  required
                  error={errors.parentSsnLast4}
                  htmlFor="parentSsnLast4"
                >
                  <input
                    id="parentSsnLast4"
                    inputMode="numeric"
                    maxLength={4}
                    className={`usa-input ${errors.parentSsnLast4 ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentSsnLast4)}
                    value={form.parentSsnLast4}
                    onChange={(e) =>
                      setGuardian("parentSsnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="••••"
                  />
                  <span className="usa-hint">Last 4 digits only.</span>
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Email address"
                  required
                  error={errors.parentEmail}
                  htmlFor="parentEmail"
                >
                  <input
                    id="parentEmail"
                    type="email"
                    className={`usa-input ${errors.parentEmail ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentEmail)}
                    value={form.parentEmail}
                    onChange={(e) => setGuardian("parentEmail", e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </Field>
                <Field
                  label="Mobile phone"
                  required
                  error={errors.parentPhone}
                  htmlFor="parentPhone"
                >
                  <input
                    id="parentPhone"
                    type="tel"
                    className={`usa-input ${errors.parentPhone ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.parentPhone)}
                    value={form.parentPhone}
                    onChange={(e) => setGuardian("parentPhone", e.target.value)}
                    placeholder="(555) 555-0100"
                    autoComplete="tel"
                  />
                </Field>
              </div>

              <Field
                label="Relationship to the child"
                required
                error={errors.parentRelationship}
                htmlFor="parentRelationship"
              >
                <select
                  id="parentRelationship"
                  className={`usa-input ${errors.parentRelationship ? "usa-input--error" : ""}`}
                  data-invalid={Boolean(errors.parentRelationship)}
                  value={form.parentRelationship}
                  onChange={(e) => setGuardian("parentRelationship", e.target.value)}
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

          {/* ── STEP 2: Residence ── */}
          {step === 2 && (
            <StepShell
              title="Residence and state of participation"
              desc="Your state of legal residence determines the state match added to the federal deposit and the state treasury office that reviews your application."
            >
              <Field
                label="Street address"
                required
                error={errors.parentAddressLine1}
                htmlFor="parentAddressLine1"
              >
                <input
                  id="parentAddressLine1"
                  className={`usa-input ${errors.parentAddressLine1 ? "usa-input--error" : ""}`}
                  data-invalid={Boolean(errors.parentAddressLine1)}
                  value={form.parentAddressLine1}
                  onChange={(e) => setGuardian("parentAddressLine1", e.target.value)}
                  placeholder="1600 Pennsylvania Ave NW"
                  autoComplete="address-line1"
                />
              </Field>
              <Field
                label="Apartment, unit, or suite (optional)"
                htmlFor="parentAddressLine2"
              >
                <input
                  id="parentAddressLine2"
                  className="usa-input"
                  value={form.parentAddressLine2}
                  onChange={(e) => setGuardian("parentAddressLine2", e.target.value)}
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
                    onChange={(e) => setGuardian("parentCity", e.target.value)}
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
                    onChange={(e) =>
                      setGuardian("parentZip", e.target.value.replace(/[^\d-]/g, ""))
                    }
                    placeholder="20500"
                    autoComplete="postal-code"
                  />
                </Field>
              </div>

              <fieldset
                className="m-0 border-0 p-0"
                data-invalid={Boolean(errors.parentState)}
              >
                <legend className="usa-label mb-2">
                  State, district or territory of residence{" "}
                  <span className="text-gov-red">*</span>
                </legend>
                {errors.parentState && (
                  <p className="m-0 mb-2 text-sm font-bold text-gov-red-dark">
                    {errors.parentState}
                  </p>
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
                          onChange={() => setGuardian("parentState", s.code)}
                        />
                        <span className="font-semibold">{s.name}</span>
                        <span
                          className={`ml-auto text-[0.68rem] font-bold ${active ? "text-gov-accent" : "text-gov-green-dark"}`}
                        >
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

          {/* ── STEP 3: Child Details ── */}
          {step === 3 && (
            <StepShell
              title={`Child ${childIndex + 1} of ${form.numChildren} – Details`}
              desc="Enter the details exactly as they appear on the child's certified birth certificate. The date of birth determines the funding tier."
            >
              <div className="grid gap-4 sm:grid-cols-[2fr_1fr_2fr]">
                <Field
                  label="First name"
                  required
                  error={errors.firstName}
                  htmlFor="childFirstName"
                >
                  <input
                    id="childFirstName"
                    className={`usa-input ${errors.firstName ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.firstName)}
                    value={child.firstName}
                    onChange={(e) => setChild("firstName", e.target.value)}
                  />
                </Field>
                <Field label="Middle (optional)" htmlFor="childMiddleName">
                  <input
                    id="childMiddleName"
                    className="usa-input"
                    value={child.middleName}
                    onChange={(e) => setChild("middleName", e.target.value)}
                  />
                </Field>
                <Field
                  label="Last name"
                  required
                  error={errors.lastName}
                  htmlFor="childLastName"
                >
                  <input
                    id="childLastName"
                    className={`usa-input ${errors.lastName ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.lastName)}
                    value={child.lastName}
                    onChange={(e) => setChild("lastName", e.target.value)}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Date of birth"
                  required
                  error={errors.dob}
                  htmlFor="childDob"
                >
                  <input
                    id="childDob"
                    type="date"
                    className={`usa-input ${errors.dob ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.dob)}
                    value={child.dob}
                    max={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setChild("dob", e.target.value)}
                  />
                </Field>
                <Field
                  label="SSN last 4 digits"
                  required
                  error={errors.ssnLast4}
                  htmlFor="childSsnLast4"
                >
                  <input
                    id="childSsnLast4"
                    inputMode="numeric"
                    maxLength={4}
                    className={`usa-input ${errors.ssnLast4 ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.ssnLast4)}
                    value={child.ssnLast4}
                    onChange={(e) =>
                      setChild("ssnLast4", e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="••••"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="City of birth"
                  required
                  error={errors.birthCity}
                  htmlFor="childBirthCity"
                >
                  <input
                    id="childBirthCity"
                    className={`usa-input ${errors.birthCity ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.birthCity)}
                    value={child.birthCity}
                    onChange={(e) => setChild("birthCity", e.target.value)}
                  />
                </Field>
                <Field
                  label="State of birth"
                  required
                  error={errors.birthState}
                  htmlFor="childBirthState"
                >
                  <select
                    id="childBirthState"
                    className={`usa-input ${errors.birthState ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.birthState)}
                    value={child.birthState}
                    onChange={(e) => setChild("birthState", e.target.value)}
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
                <legend className="usa-label">
                  Gender (optional, used for program statistics)
                </legend>
                <div className="flex flex-wrap gap-4 pt-1">
                  {["Female", "Male", "Prefer not to say"].map((g) => (
                    <label key={g} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="childGender"
                        checked={child.gender === g}
                        onChange={() => setChild("gender", g)}
                      />
                      {g}
                    </label>
                  ))}
                </div>
              </fieldset>

              {child.dob && (
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

          {/* ── STEP 4: Child Account ── */}
          {step === 4 && (
            <StepShell
              title={`Child ${childIndex + 1} of ${form.numChildren} – Account`}
              desc="Choose how the funds are held. The account is owned by the child; you are the custodian and cannot withdraw until the child turns 18."
            >
              <fieldset
                className="m-0 grid gap-3 border-0 p-0"
                data-invalid={Boolean(errors.accountType)}
              >
                <legend className="usa-label">
                  Account type <span className="text-gov-red">*</span>
                </legend>
                {ACCOUNT_TYPES.map((t) => (
                  <label
                    key={t.id}
                    className={`flex cursor-pointer gap-3 rounded border p-3.5 transition-colors ${
                      child.accountType === t.id
                        ? "border-gov-primary bg-gov-primary-lightest"
                        : "border-gov-base-light bg-white hover:border-gov-primary-light"
                    }`}
                  >
                    <input
                      type="radio"
                      name="accountType"
                      className="mt-1"
                      checked={child.accountType === t.id}
                      onChange={() => setChild("accountType", t.id)}
                    />
                    <span>
                      <span className="block font-serif text-base font-bold text-gov-navy">
                        {t.label}
                      </span>
                      <span className="mt-1 block text-sm text-[#3d4551]">{t.detail}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <Field
                label="Custodian bank or credit union"
                required
                error={errors.custodianBank}
                htmlFor="custodianBank"
              >
                <input
                  id="custodianBank"
                  list="bank-list"
                  className={`usa-input ${errors.custodianBank ? "usa-input--error" : ""}`}
                  data-invalid={Boolean(errors.custodianBank)}
                  value={child.custodianBank}
                  onChange={(e) => setChild("custodianBank", e.target.value)}
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
                <span className="usa-hint">
                  Must be an FDIC/NCUA-insured institution approved by the Fund Board.
                </span>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Routing number"
                  required
                  error={errors.routingNumber}
                  htmlFor="routingNumber"
                >
                  <input
                    id="routingNumber"
                    inputMode="numeric"
                    maxLength={9}
                    className={`usa-input ${errors.routingNumber ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.routingNumber)}
                    value={child.routingNumber}
                    onChange={(e) =>
                      setChild("routingNumber", e.target.value.replace(/\D/g, "").slice(0, 9))
                    }
                    placeholder="9 digits"
                  />
                </Field>
                <Field
                  label="Account last 4 digits"
                  required
                  error={errors.accountLast4}
                  htmlFor="accountLast4"
                >
                  <input
                    id="accountLast4"
                    inputMode="numeric"
                    maxLength={4}
                    className={`usa-input ${errors.accountLast4 ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.accountLast4)}
                    value={child.accountLast4}
                    onChange={(e) =>
                      setChild("accountLast4", e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="••••"
                  />
                </Field>
              </div>

              <Field
                label={`Initial deposit (minimum $${MIN_DEPOSIT.toFixed(2)})`}
                required
                error={errors.initialDepositDollars}
                htmlFor="initialDepositDollars"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gov-navy">$</span>
                  <input
                    id="initialDepositDollars"
                    type="number"
                    min={MIN_DEPOSIT}
                    max={5000}
                    step={1}
                    className={`usa-input ${errors.initialDepositDollars ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.initialDepositDollars)}
                    value={child.initialDepositDollars}
                    onChange={(e) =>
                      setChild("initialDepositDollars", Number(e.target.value))
                    }
                  />
                </div>
                <span className="usa-hint">
                  This one-time deposit opens the child account. Contact admin to arrange payment.
                  Minimum: $1,500.00. Annual limit: $5,000 per child.
                </span>
              </Field>

              {/* live total */}
              <div className="rounded border border-gov-base-light bg-gov-base-lightest p-4 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-gov-base">
                    Deposit for child {childIndex + 1}
                  </span>
                  <span className="font-serif font-bold tabular-nums text-gov-navy">
                    {formatUSD(child.initialDepositDollars * 100)}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between gap-3 border-t border-gov-base-light pt-2 font-bold">
                  <span>
                    Estimated total ({form.numChildren} child
                    {form.numChildren !== 1 ? "ren" : ""})
                  </span>
                  <span className="font-serif text-lg tabular-nums text-gov-navy">
                    {formatUSD(form.numChildren * MIN_DEPOSIT * 100)}
                  </span>
                </div>
              </div>
            </StepShell>
          )}

          {/* ── STEP 5: Verification ── */}
          {step === 5 && (
            <StepShell
              title={`Child ${childIndex + 1} of ${form.numChildren} – Verification`}
              desc="Federal law requires us to verify the identity of every adult who opens a custodial account for a minor. Choose the method that works for you."
            >
              <fieldset
                className="m-0 grid gap-3 border-0 p-0"
                data-invalid={Boolean(errors.verificationMethod)}
              >
                <legend className="sr-only">Verification method</legend>
                {VERIFICATION_METHODS.map((m) => (
                  <label
                    key={m.id}
                    className={`flex cursor-pointer gap-3 rounded border p-3.5 transition-colors ${
                      child.verificationMethod === m.id
                        ? "border-gov-primary bg-gov-primary-lightest"
                        : "border-gov-base-light bg-white hover:border-gov-primary-light"
                    }`}
                  >
                    <input
                      type="radio"
                      name="verificationMethod"
                      className="mt-1"
                      checked={child.verificationMethod === m.id}
                      onChange={() => setChild("verificationMethod", m.id)}
                    />
                    <span>
                      <span className="block font-serif text-base font-bold text-gov-navy">
                        {m.label}
                      </span>
                      <span className="mt-0.5 block text-sm text-[#3d4551]">{m.detail}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
              {errors.verificationMethod && (
                <p className="m-0 mt-2 text-sm font-bold text-gov-red-dark">
                  {errors.verificationMethod}
                </p>
              )}

              {child.verificationMethod === "document_upload" && (
                <div className="mt-5 rounded border border-gov-base-light bg-gov-base-lightest p-4">
                  <h3 className="m-0 font-serif text-base font-bold text-gov-navy">
                    Upload supporting documents for child {childIndex + 1}
                  </h3>
                  <p className="mt-1 mb-3 text-sm text-[#3d4551]">
                    At least two documents are required: your government photo ID and the
                    child&apos;s certified birth certificate.
                  </p>
                  {(files[childIndex] ?? []).length > 0 && (
                    <ul className="mb-3 list-none space-y-1 p-0 text-sm">
                      {(files[childIndex] ?? []).map((f, i) => (
                        <li
                          key={`${f.fileName}-${i}`}
                          className="flex items-center gap-2 rounded bg-white px-3 py-2"
                        >
                          <span className="text-gov-green-dark">✓</span>
                          <span className="font-semibold">{f.fileName}</span>
                          <span className="text-gov-base">
                            {(f.fileSize / 1024).toFixed(0)} KB
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setFiles((prev) => {
                                const next = [...prev];
                                next[childIndex] = (next[childIndex] ?? []).filter(
                                  (_, x) => x !== i,
                                );
                                return next;
                              })
                            }
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
                      const input = document.getElementById(
                        "docFile",
                      ) as HTMLInputElement | null;
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
                      const sel = document.getElementById(
                        "docType",
                      ) as HTMLSelectElement | null;
                      if (!f) return;
                      const newFile: PendingFile = {
                        docType: sel?.value ?? DOCUMENT_TYPES[0],
                        fileName: f.name,
                        fileSize: f.size,
                        mimeType: f.type || "application/octet-stream",
                      };
                      setFiles((prev) => {
                        const next = [...prev];
                        next[childIndex] = [...(next[childIndex] ?? []), newFile];
                        return next;
                      });
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {child.verificationMethod === "in_person" && (
                <p className="mt-4 text-sm text-[#3d4551]">
                  Bring originals to any {quote.state?.agency ?? "state treasury"} office. No
                  appointment is needed and verification is completed while you wait.
                </p>
              )}
            </StepShell>
          )}

          {/* ── STEP 6: Review & Certify ── */}
          {step === 6 && (
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
                  <ReviewRow k="State office" v={quote.state?.agency ?? "—"} />
                </ReviewGroup>
              </dl>

              {form.children.slice(0, form.numChildren).map((c, i) => (
                <div key={i} className="mt-4 rounded border border-gov-base-light p-4">
                  <h3 className="m-0 font-serif text-base font-bold text-gov-navy">
                    Child {i + 1}: {c.firstName} {c.lastName}
                  </h3>
                  <dl className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                    <ReviewGroup title="Details">
                      <ReviewRow k="DOB" v={c.dob} />
                      <ReviewRow k="SSN (last 4)" v={c.ssnLast4} />
                      <ReviewRow k="Birth city/state" v={`${c.birthCity}, ${c.birthState}`} />
                    </ReviewGroup>
                    <ReviewGroup title="Account">
                      <ReviewRow
                        k="Account type"
                        v={
                          ACCOUNT_TYPES.find((a) => a.id === c.accountType)?.label ?? "—"
                        }
                      />
                      <ReviewRow k="Bank" v={c.custodianBank} />
                      <ReviewRow
                        k="Routing / acct"
                        v={`${c.routingNumber} ••••${c.accountLast4}`}
                      />
                      <ReviewRow
                        k="Initial deposit"
                        v={formatUSD(c.initialDepositDollars * 100)}
                      />
                      <ReviewRow
                        k="Verification"
                        v={
                          VERIFICATION_METHODS.find((v) => v.id === c.verificationMethod)
                            ?.label ?? "—"
                        }
                      />
                    </ReviewGroup>
                  </dl>
                </div>
              ))}

              {/* grand total */}
              <div className="mt-4 rounded border-2 border-gov-primary bg-gov-primary-lightest p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-bold text-gov-navy">
                    Grand total initial deposit ({form.numChildren} child
                    {form.numChildren !== 1 ? "ren" : ""})
                  </span>
                  <span className="font-serif text-2xl font-bold tabular-nums text-gov-navy">
                    {formatUSD(
                      form.children
                        .slice(0, form.numChildren)
                        .reduce((sum, c) => sum + c.initialDepositDollars * 100, 0),
                    )}
                  </span>
                </div>
                <p className="m-0 mt-1 text-xs text-gov-base">
                  Contact admin to arrange payment. Do not send payment until contacted.
                </p>
              </div>

              <div className="mt-6 space-y-3 border-t border-gov-base-light pt-5">
                <label
                  className="flex cursor-pointer items-start gap-3 text-sm"
                  data-invalid={Boolean(errors.identityConsent)}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={form.identityConsent}
                    onChange={(e) => setGuardian("identityConsent", e.target.checked)}
                  />
                  <span>
                    I authorize the Child Trust Fund Administration and{" "}
                    {quote.state?.agency ?? "my state treasury office"} to verify my identity, my
                    relationship to the child, and the child&apos;s Social Security record.
                  </span>
                </label>
                {errors.identityConsent && (
                  <p className="m-0 pl-7 text-sm font-bold text-gov-red-dark">
                    {errors.identityConsent}
                  </p>
                )}
                <label
                  className="flex cursor-pointer items-start gap-3 text-sm"
                  data-invalid={Boolean(errors.penaltyOfPerjury)}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4"
                    checked={form.penaltyOfPerjury}
                    onChange={(e) => setGuardian("penaltyOfPerjury", e.target.checked)}
                  />
                  <span>
                    I certify under penalty of perjury that I am the child&apos;s parent or legal
                    guardian, that the information above is true and correct, and that these funds
                    are held for the sole benefit of the child until age 18.
                  </span>
                </label>
                {errors.penaltyOfPerjury && (
                  <p className="m-0 pl-7 text-sm font-bold text-gov-red-dark">
                    {errors.penaltyOfPerjury}
                  </p>
                )}
                <Field
                  label="Electronic signature (type your full legal name)"
                  required
                  error={errors.electronicSignature}
                  htmlFor="electronicSignature"
                >
                  <input
                    id="electronicSignature"
                    className={`usa-input font-serif text-base italic ${errors.electronicSignature ? "usa-input--error" : ""}`}
                    data-invalid={Boolean(errors.electronicSignature)}
                    value={form.electronicSignature}
                    onChange={(e) => setGuardian("electronicSignature", e.target.value)}
                    placeholder={form.parentFullName || "Your full legal name"}
                  />
                  <span className="usa-hint">
                    Signing on{" "}
                    {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}. Your
                    IP address and timestamp are recorded with this application.
                  </span>
                </Field>
              </div>
            </StepShell>
          )}

          {/* ── nav buttons ── */}
          <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-gov-base-light pt-6">
            {(step > 0) && (
              <button
                type="button"
                onClick={back}
                className="usa-button usa-button--outline-dark"
              >
                ← Back
              </button>
            )}
            {step < STEP_NAMES.length - 1 ? (
              <button
                type="button"
                onClick={next}
                className="usa-button usa-button--primary"
              >
                Continue →
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={submitting}
                className="usa-button usa-button--primary"
              >
                {submitting ? "Submitting to the Treasury…" : "Submit application"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setForm(EMPTY);
                setFiles([[]]);
                setErrors({});
                setChildIndex(0);
                setStep(0);
              }}
              className="ml-auto text-sm font-semibold text-gov-base hover:text-gov-red hover:underline"
            >
              Clear this draft
            </button>
          </div>
          <p className="mt-3 text-xs text-gov-base">
            Your answers are saved automatically in this browser so you can finish later. Estimated
            time to complete: 10–15 minutes.
          </p>
        </div>
      </div>

      <BenefitSidebar
        form={form}
        quote={quote}
        childIndex={childIndex}
        numChildren={form.numChildren}
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

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

function BenefitSidebar({
  form,
  quote,
  childIndex,
  numChildren,
}: {
  form: FormState;
  quote: BenefitQuote;
  childIndex: number;
  numChildren: number;
}) {
  const child = form.children[childIndex] ?? EMPTY_CHILD;
  const rows = [
    {
      label: "Federal seed deposit",
      value: formatUSD(quote.tier.federalSeedCents),
      note: quote.tier.autoEnrollment ? "Automatic at verification" : "Not in this cohort",
    },
    {
      label: `${quote.state?.name ?? "State"} opening match`,
      value: formatUSD(quote.stateMatchCents),
      note: quote.state
        ? `${quote.state.contributionMatchPct}% match on guardian deposits`
        : "Select your state",
    },
    {
      label: "Federal birthday supplement",
      value: `${formatUSD(quote.tier.federalSupplementCents)} / yr`,
      note: "Paid each year until the child turns 6",
    },
    {
      label: "Initial deposit",
      value: formatUSD(child.initialDepositDollars * 100),
      note: "One-time required opening deposit",
    },
  ];

  const grandTotal = form.children
    .slice(0, numChildren)
    .reduce((sum, c) => sum + c.initialDepositDollars * 100, 0);

  return (
    <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
      <div className="overflow-hidden rounded border border-gov-base-light bg-white">
        <div className="bg-gov-navy px-4 py-3">
          <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gov-accent">
            Live benefit estimate
          </p>
          <p className="m-0 mt-0.5 font-serif text-lg font-bold text-white">
            {child.firstName ? child.firstName : `Child ${childIndex + 1}`}
            {child.dob ? ` · born ${child.dob}` : ""}
          </p>
          {numChildren > 1 && (
            <p className="m-0 mt-0.5 text-xs text-gov-primary-light">
              {numChildren} children registered
            </p>
          )}
        </div>
        <ul className="m-0 list-none divide-y divide-gov-base-light p-0">
          {rows.map((r) => (
            <li key={r.label} className="px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm text-[#3d4551]">{r.label}</span>
                <span className="font-serif text-base font-bold tabular-nums text-gov-navy">
                  {r.value}
                </span>
              </div>
              <span className="mt-0.5 block text-[0.72rem] text-gov-base">{r.note}</span>
            </li>
          ))}
        </ul>
        <div className="border-t-4 border-gov-accent bg-gov-primary-lightest px-4 py-4">
          <p className="m-0 text-[0.7rem] font-bold uppercase tracking-wider text-gov-primary-dark">
            Opening day total (this child)
          </p>
          <p className="m-0 font-serif text-3xl font-bold tabular-nums text-gov-navy">
            {formatUSD(quote.openingDayTotalCents)}
          </p>
          {numChildren > 1 && (
            <>
              <p className="m-0 mt-3 text-[0.7rem] font-bold uppercase tracking-wider text-gov-primary-dark">
                Total initial deposit ({numChildren} children)
              </p>
              <p className="m-0 font-serif text-2xl font-bold tabular-nums text-gov-navy">
                {formatUSD(grandTotal)}
              </p>
            </>
          )}
          <p className="m-0 mt-2 text-[0.7rem] font-bold uppercase tracking-wider text-gov-primary-dark">
            Projected balance at age 18
          </p>
          <p className="m-0 font-serif text-2xl font-bold tabular-nums text-gov-green-dark">
            {formatUSD(quote.projectionAt18Cents, false)}
          </p>
          <p className="m-0 mt-1 text-[0.7rem] leading-snug text-gov-base">
            Assumes a 4.5% nominal annual return. Projections are estimates, not a guarantee.
          </p>
        </div>
      </div>

      <div className="rounded border border-gov-base-light bg-gov-base-lightest p-4 text-xs leading-relaxed text-[#3d4551]">
        <p className="m-0 font-bold text-gov-navy">Need help?</p>
        <p className="m-0 mt-1">
          Call the Guardian Help Line at{" "}
          <a
            href="tel:18445554823"
            className="font-semibold text-gov-primary hover:underline"
          >
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
