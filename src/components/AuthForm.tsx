"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Sign-up / sign-in form for guardian accounts (Option A auth).
 * On success the server sets the `ctf_session` cookie and the client navigates
 * to `/apply`, where the gated wizard continues the application.
 */
export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setErrors({});
    setError(null);
    setBusy(true);
    try {
      const payload =
        mode === "signup"
          ? { email, fullName, password, confirmPassword }
          : { email, password };
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok: boolean;
        errors?: Record<string, string>;
        error?: string;
      };
      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        else if (data.error) setError(data.error);
        else setError("Something went wrong. Please try again.");
        return;
      }
      // Decide where to send the guardian after auth
      try {
        const appsRes = await fetch("/api/guardian/applications");
        const appsData = (await appsRes.json().catch(() => ({ ok: false }))) as {
          ok: boolean;
          applications?: { status: string; referenceNumber: string; childLastName: string }[];
        };
        if (appsData.ok && Array.isArray(appsData.applications) && appsData.applications.length > 0) {
          const apps = appsData.applications;
          const statuses = apps.map((a) => a.status);
          if (statuses.some((s) => s === "approved" || s === "funded")) {
            router.push("/dashboard");
          } else if (statuses.some((s) => s === "verification_required")) {
            router.push("/verify");
          } else if (statuses.some((s) => s === "submitted" || s === "under_review")) {
            // Pre-populate the status lookup form with the first matching application
            const first = apps.find((a) => a.status === "submitted" || a.status === "under_review");
            if (first) {
              router.push(
                `/status?ref=${encodeURIComponent(first.referenceNumber)}&last=${encodeURIComponent(first.childLastName)}`,
              );
            } else {
              router.push("/status");
            }
          } else if (statuses.some((s) => s === "rejected")) {
            // Send rejected guardians to status so they can see the case history
            const first = apps.find((a) => a.status === "rejected");
            if (first) {
              router.push(
                `/status?ref=${encodeURIComponent(first.referenceNumber)}&last=${encodeURIComponent(first.childLastName)}`,
              );
            } else {
              router.push("/status");
            }
          } else {
            router.push("/apply");
          }
        } else {
          router.push("/apply");
        }
      } catch {
        router.push("/apply");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4" noValidate>
      {mode === "signup" && (
        <div>
          <label htmlFor="auth-fullname" className="usa-label">
            Full name
          </label>
          <input
            id="auth-fullname"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={`usa-input ${errors.fullName ? "usa-input--error" : ""}`}
            required
          />
          {errors.fullName && (
            <p className="usa-hint text-gov-red-dark">{errors.fullName}</p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="auth-email" className="usa-label">
          Email address
        </label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`usa-input ${errors.email ? "usa-input--error" : ""}`}
          required
        />
        {errors.email && <p className="usa-hint text-gov-red-dark">{errors.email}</p>}
      </div>

      <div>
        <label htmlFor="auth-password" className="usa-label">
          Password
        </label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`usa-input ${errors.password ? "usa-input--error" : ""}`}
          required
        />
        {mode === "signup" && (
          <p className="usa-hint">Use at least 8 characters. Do not reuse a real password.</p>
        )}
        {errors.password && <p className="usa-hint text-gov-red-dark">{errors.password}</p>}
      </div>

      {mode === "signup" && (
        <div>
          <label htmlFor="auth-confirm" className="usa-label">
            Confirm password
          </label>
          <input
            id="auth-confirm"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={`usa-input ${errors.confirmPassword ? "usa-input--error" : ""}`}
            required
          />
          {errors.confirmPassword && (
            <p className="usa-hint text-gov-red-dark">{errors.confirmPassword}</p>
          )}
        </div>
      )}

      {error && (
        <p
          className="rounded border-l-4 border-gov-red bg-[#fdf3f2] p-3 text-sm text-gov-red-dark"
          role="alert"
        >
          {error}
        </p>
      )}

      <button type="submit" className="usa-button usa-button--primary w-full" disabled={busy}>
        {busy
          ? "Please wait…"
          : mode === "signup"
            ? "Create account and continue"
            : "Sign in and continue"}
      </button>

      <p className="text-center text-sm text-gov-base">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-bold text-gov-primary hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New guardian?{" "}
            <Link href="/signup" className="font-bold text-gov-primary hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
