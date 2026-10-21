"use client";

import { useState } from "react";

function FlagIcon() {
  return (
    <svg
      className="gov-banner-flag"
      viewBox="0 0 22 15"
      role="img"
      aria-label="U.S. flag"
      focusable="false"
    >
      <rect width="22" height="15" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((y) => (
        <rect key={y} y={y} width="22" height="1.15" fill="#b31942" />
      ))}
      <rect width="9" height="8.05" fill="#0a3161" />
      {[0, 1, 2, 3, 4].map((r) =>
        [0, 1, 2, 3, 4, 5].map((c) => (
          <circle
            key={`${r}-${c}`}
            cx={0.85 + c * 1.45}
            cy={0.85 + r * 1.6}
            r="0.32"
            fill="#fff"
          />
        )),
      )}
    </svg>
  );
}

export default function GovBanner() {
  const [open, setOpen] = useState(false);

  return (
    <section
      className="border-b border-gov-base-light bg-gov-base-lightest text-[0.78rem] leading-snug text-gov-ink"
      aria-label="Official website of the United States government"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 sm:px-6">
        <FlagIcon />
        <p className="m-0">An official website of the United States government</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="gov-banner-detail"
          className="ml-auto flex items-center gap-1 font-semibold text-gov-primary underline decoration-1 underline-offset-2 hover:text-gov-primary-dark sm:ml-2"
        >
          Here&apos;s how you know
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
            aria-hidden="true"
          >
            <path d="M2 4.5 6 8.5l4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </button>
      </div>

      {open && (
        <div
          id="gov-banner-detail"
          className="border-t border-gov-base-light bg-white"
        >
          <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:grid-cols-2 sm:px-6">
            <div className="flex gap-4">
              <svg viewBox="0 0 64 64" className="h-12 w-12 shrink-0" aria-hidden="true">
                <circle cx="32" cy="32" r="28" fill="#005ea2" />
                <path
                  d="M32 14a18 18 0 1 0 0 36 18 18 0 0 0 0-36zm0 5.2 3.9 8 8.8 1.3-6.4 6.2 1.5 8.7L32 39.3l-7.8 4.1 1.5-8.7-6.4-6.2 8.8-1.3 3.9-8z"
                  fill="#fff"
                />
              </svg>
              <div>
                <h3 className="m-0 font-serif text-base font-bold text-gov-navy">
                  Official websites use .gov
                </h3>
                <p className="mt-1 text-[0.82rem] text-gov-base">
                  A <strong className="text-gov-ink">.gov</strong> website belongs to an official
                  government organization in the United States.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <svg viewBox="0 0 64 64" className="h-12 w-12 shrink-0" aria-hidden="true">
                <rect x="14" y="26" width="36" height="26" rx="3" fill="#005ea2" />
                <path
                  d="M22 26v-6a10 10 0 0 1 20 0v6"
                  fill="none"
                  stroke="#005ea2"
                  strokeWidth="4"
                />
                <circle cx="32" cy="39" r="4" fill="#ffbe2e" />
              </svg>
              <div>
                <h3 className="m-0 font-serif text-base font-bold text-gov-navy">
                  Secure .gov websites use HTTPS
                </h3>
                <p className="mt-1 text-[0.82rem] text-gov-base">
                  A <strong className="text-gov-ink">lock</strong> or{" "}
                  <strong className="text-gov-ink">https://</strong> means you&apos;ve safely
                  connected to the .gov website. Share sensitive information only on official,
                  secure websites.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
