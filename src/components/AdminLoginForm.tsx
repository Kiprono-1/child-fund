"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError(data.error ?? "Invalid credentials. Please try again.");
      }
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded border border-gov-red bg-red-50 px-4 py-3 text-sm text-gov-red">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="admin-email" className="usa-label">
          Email address
        </label>
        <input
          id="admin-email"
          type="email"
          className="usa-input"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="admin-password" className="usa-label">
          Password
        </label>
        <input
          id="admin-password"
          type="password"
          className="usa-input"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button
        type="submit"
        className="usa-button usa-button--primary w-full"
        disabled={loading}
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
