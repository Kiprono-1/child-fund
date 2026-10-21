"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

/**
 * Sign-up / sign-in form for guardian accounts (Option A auth).
 * On success the server sets the `ctf_session` cookie and the client navigates
 * to the appropriate page based on account status.
 */
export default function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Password strength (signup mode only)
  const passwordChecks = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const strengthScore = Object.values(passwordChecks).filter(Boolean).length;

  const strengthLabel = strengthScore === 0
    ? ""
    : strengthScore === 1
      ? "Weak"
      : strengthScore === 2
        ? "Fair"
        : strengthScore === 3
          ? "Good"
          : "Strong";

  const strengthColor = strengthScore <= 1
    ? "bg-gov-red"
    : strengthScore === 2
      ? "bg-gov-accent"
      : strengthScore === 3
        ? "bg-[#c2a900]"
        : "bg-gov-green";

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
          : { email, password, rememberMe };
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
            const first = apps.find((a) => a.status === "submitted" || a.status === "under_review");
            if (first) {
              router.push(
                `/status?ref=${encodeURIComponent(first.referenceNumber)}&last=${encodeURIComponent(first.childLastName)}`,
              );
            } else {
              router.push("/status");
            }
          } else if (statuses.some((s) => s === "rejected")) {
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

      {/* Password with eye toggle */}
      <div>
        <label htmlFor="auth-password" className="usa-label">
          Password
        </label>
        <div className="relative">
          <input
            id="auth-password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`usa-input pr-10 ${errors.password ? "usa-input--error" : ""}`}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gov-base hover:text-gov-navy transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              /* Eye-off icon */
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              /* Eye icon */
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>

        {/* Password strength (signup only) */}
        {mode === "signup" && password.length > 0 && (
          <div className="mt-2 space-y-2">
            {/* Strength bar */}
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1" aria-hidden="true">
                {[1, 2, 3, 4].map((seg) => (
                  <div
                    key={seg}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      strengthScore >= seg ? strengthColor : "bg-gov-base-lighter"
                    }`}
                  />
                ))}
              </div>
              {strengthLabel && (
                <span className="text-xs font-bold text-gov-base">{strengthLabel}</span>
              )}
            </div>
            {/* Requirements checklist */}
            <ul className="space-y-0.5 text-xs" aria-label="Password requirements">
              {([
                { key: "length" as const, label: "At least 8 characters" },
                { key: "upper" as const, label: "1 uppercase letter" },
                { key: "number" as const, label: "1 number" },
                { key: "special" as const, label: "1 special character (!@#$…)" },
              ] as const).map(({ key, label }) => (
                <li
                  key={key}
                  className={`flex items-center gap-1.5 ${
                    passwordChecks[key] ? "text-gov-green-dark font-semibold" : "text-gov-base"
                  }`}
                >
                  <span aria-hidden="true">{passwordChecks[key] ? "✓" : "○"}</span>
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {mode === "signup" && password.length === 0 && (
          <p className="usa-hint">Use at least 8 characters. Do not reuse a real password.</p>
        )}
        {errors.password && <p className="usa-hint text-gov-red-dark">{errors.password}</p>}
      </div>

      {mode === "signup" && (
        <div>
          <label htmlFor="auth-confirm" className="usa-label">
            Confirm password
          </label>
          <div className="relative">
            <input
              id="auth-confirm"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`usa-input pr-10 ${errors.confirmPassword ? "usa-input--error" : ""}`}
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gov-base hover:text-gov-navy transition-colors"
              aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            >
              {showConfirm ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="usa-hint text-gov-red-dark">{errors.confirmPassword}</p>
          )}
        </div>
      )}

      {/* Remember-me + forgot password row (login only) */}
      {mode === "login" && (
        <div className="flex items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gov-navy select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 accent-gov-primary"
            />
            Remember me for {rememberMe ? "30" : "7"} days
          </label>
          <span
            className="text-sm text-gov-base cursor-default"
            title="Contact support to reset your password"
          >
            Forgot password?
          </span>
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

      {/* Trust signals */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-1">
        <span className="flex items-center gap-1.5 text-xs text-gov-base">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-gov-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          256-bit encryption
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gov-base">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-gov-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          Secure .gov server
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gov-base">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-gov-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          No sharing of your data
        </span>
      </div>

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
