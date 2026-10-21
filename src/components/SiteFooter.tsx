"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ContactInfo = { contactPhone: string; contactEmail: string; helplineHours: string };

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "The Program",
    links: [
      { label: "About the Child Trust Fund", href: "/about" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Eligibility & Benefits", href: "/eligibility" },
      { label: "State Participation & Match Rates", href: "/states" },
      { label: "Program Data & Statistics", href: "/program-data" },
      { label: "Newsroom", href: "/about#newsroom" },
    ],
  },
  {
    title: "For Parents & Guardians",
    links: [
      { label: "Register a Child", href: "/apply" },
      { label: "Verify Your Identity", href: "/verify" },
      { label: "Track Your Application", href: "/status" },
      { label: "Make a Deposit", href: "/deposit" },
      { label: "Savings Calculator", href: "/resources#calculator" },
      { label: "Frequently Asked Questions", href: "/faq" },
    ],
  },
  {
    title: "Government Resources",
    links: [
      { label: "USA.gov", href: "https://www.usa.gov" },
      { label: "TreasuryDirect", href: "https://www.treasurydirect.gov" },
      { label: "Investor.gov", href: "https://www.investor.gov" },
      { label: "Social Security Administration", href: "https://www.ssa.gov" },
      { label: "Consumer Financial Protection Bureau", href: "https://www.consumerfinance.gov" },
      { label: "Login.gov", href: "https://www.login.gov" },
    ],
  },
];

const LEGAL_LINKS = [
  "FOIA",
  "Privacy Policy",
  "Accessibility Statement",
  "No FEAR Act Data",
  "Plain Writing Act",
  "Office of Inspector General",
  "Budget & Performance",
  "Vulnerability Disclosure Policy",
  "Information Quality",
];

export default function SiteFooter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState<ContactInfo>({
    contactPhone: "1-800-555-0199",
    contactEmail: "support@childtrustfund.gov",
    helplineHours: "Monday–Friday, 8:00 a.m. – 8:00 p.m. Eastern",
  });

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d: { ok: boolean; settings?: ContactInfo } | null) => {
        if (d?.ok && d.settings) setContact(d.settings);
      })
      .catch(() => {});
  }, []);

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, state }),
      });
      const data = await res.json();
      setMsg(
        data.ok
          ? { ok: true, text: "You are subscribed to the CTF Guardian Bulletin." }
          : { ok: false, text: data.error ?? "Could not subscribe. Please try again." },
      );
      if (data.ok) {
        setEmail("");
        setState("");
      }
    } catch {
      setMsg({ ok: false, text: "Network error. Please try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <footer className="mt-auto bg-gov-navy-deep text-gov-primary-lighter">
      <div className="h-1.5 w-full bg-gradient-to-r from-gov-red via-white to-gov-primary" />

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_2fr]">
          <div>
            <div className="flex items-start gap-4">
              <img
                src="/img/ctf-seal.png"
                alt="Seal of the Child Trust Fund Administration"
                width={84}
                height={84}
                className="h-20 w-20 rounded-full bg-white object-contain p-1"
              />
              <div>
                <p className="font-serif text-lg font-bold text-white">
                  U.S. Child Trust Fund Administration
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gov-primary-light">
                  A program of the U.S. Department of the Treasury, administered in partnership
                  with the treasury offices of the 50 states, the District of Columbia and the
                  U.S. territories.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded border border-white/15 bg-white/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-gov-accent">
                Guardian Bulletin
              </p>
              <p className="mt-1 text-xs text-gov-primary-lighter">
                Deposit dates, state match changes and enrollment deadlines — once a month, no
                marketing.
              </p>
              <form onSubmit={subscribe} className="mt-3 flex flex-col gap-2">
                <label htmlFor="footer-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="footer-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="usa-input !border-white/30 !bg-white text-sm"
                />
                <div className="flex gap-2">
                  <label htmlFor="footer-state" className="sr-only">
                    State
                  </label>
                  <input
                    id="footer-state"
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                    placeholder="ST"
                    className="usa-input w-16 text-center text-sm uppercase"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="usa-button usa-button--accent flex-1 !py-2 text-sm"
                  >
                    {busy ? "Subscribing…" : "Subscribe"}
                  </button>
                </div>
                {msg && (
                  <p
                    role="status"
                    className={`text-xs font-semibold ${
                      msg.ok ? "text-gov-green-light" : "text-[#f2938c]"
                    }`}
                  >
                    {msg.text}
                  </p>
                )}
              </form>
            </div>

            <div className="mt-6 space-y-1 text-sm">
              <p className="font-bold text-white">CTF Guardian Help Line</p>
              <p>
                <a href={`tel:${contact.contactPhone.replace(/\D/g, "")}`} className="text-gov-accent hover:underline">
                  {contact.contactPhone}
                </a>
              </p>
              <p className="text-xs text-gov-primary-light">{contact.helplineHours} · TTY: dial 711 · Se habla español</p>
              <p>
                <a href={`mailto:${contact.contactEmail}`} className="text-gov-accent hover:underline text-xs">
                  {contact.contactEmail}
                </a>
              </p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            {COLUMNS.map((col) => (
              <nav key={col.title} aria-label={col.title}>
                <h2 className="m-0 border-b border-white/20 pb-2 font-serif text-sm font-bold uppercase tracking-wider text-white">
                  {col.title}
                </h2>
                <ul className="mt-3 space-y-2">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <Link
                        href={l.href}
                        className="text-[0.82rem] text-gov-primary-lighter transition-colors hover:text-gov-accent hover:underline"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-12 border-t border-white/15 pt-6">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <li key={l}>
                <Link
                  href="/about#governance"
                  className="text-[0.74rem] text-gov-primary-light hover:text-white hover:underline"
                >
                  {l}
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-6">
            <img
              src="/img/gov-seal.png"
              alt="Seal of the United States Department of the Treasury"
              width={64}
              height={64}
              className="h-16 w-16 rounded-full bg-white object-contain p-1"
            />
            <div className="text-[0.74rem] leading-relaxed text-gov-primary-light">
              <p className="m-0">
                ChildTrustFund.gov is an official website of the United States government.
              </p>
              <p className="m-0">
                Federal deposits are held in custodial accounts at approved member banks and are
                FDIC-insured to the fullest extent permitted by law. Program authority: Child
                Trust Fund Act of 2024, 31 U.S.C. § 5141 et seq.
              </p>
            </div>
          </div>

        </div>
      </div>
    </footer>
  );
}
