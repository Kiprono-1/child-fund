"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import GovBanner from "./GovBanner";

type NavItem = {
  label: string;
  href: string;
  children?: { label: string; href: string; desc?: string }[];
};

const NAV_LOGGED_OUT: NavItem[] = [
  {
    label: "About the Program",
    href: "/about",
    children: [
      { label: "About the Trump Account", href: "/about", desc: "Statute, mission and governance" },
      { label: "How It Works", href: "/how-it-works", desc: "From birth certificate to funded account" },
      { label: "Eligibility & Benefits", href: "/eligibility", desc: "Who qualifies and for how much" },
      { label: "State Participation", href: "/states", desc: "State match rates for all 50 states" },
      { label: "Program Data", href: "/program-data", desc: "Live enrollment and funding statistics" },
    ],
  },
  { label: "Register a Child", href: "/signup" },
  { label: "Verify Identity", href: "/verify" },
  { label: "Track Application", href: "/status" },
  {
    label: "Resources",
    href: "/resources",
    children: [
      { label: "Financial Education", href: "/resources", desc: "Guides for parents and kids" },
      { label: "Savings Calculator", href: "/resources#calculator", desc: "Project the account at age 18" },
      { label: "Forms & Publications", href: "/resources#forms", desc: "Downloadable PDF forms" },
      { label: "Frequently Asked Questions", href: "/faq", desc: "Answers to common questions" },
    ],
  },
  { label: "Contact Us", href: "/contact" },
];

const NAV_LOGGED_IN: NavItem[] = [
  {
    label: "About the Program",
    href: "/about",
    children: [
      { label: "About the Trump Account", href: "/about", desc: "Statute, mission and governance" },
      { label: "How It Works", href: "/how-it-works", desc: "From birth certificate to funded account" },
      { label: "Eligibility & Benefits", href: "/eligibility", desc: "Who qualifies and for how much" },
      { label: "State Participation", href: "/states", desc: "State match rates for all 50 states" },
      { label: "Program Data", href: "/program-data", desc: "Live enrollment and funding statistics" },
    ],
  },
  { label: "My Dashboard", href: "/dashboard" },
  { label: "Verify Identity", href: "/verify" },
  { label: "Track Application", href: "/status" },
  { label: "Make a Deposit", href: "/deposit" },
  {
    label: "Resources",
    href: "/resources",
    children: [
      { label: "Financial Education", href: "/resources", desc: "Guides for parents and kids" },
      { label: "Savings Calculator", href: "/resources#calculator", desc: "Project the account at age 18" },
      { label: "Forms & Publications", href: "/resources#forms", desc: "Downloadable PDF forms" },
      { label: "Frequently Asked Questions", href: "/faq", desc: "Answers to common questions" },
    ],
  },
  { label: "Contact Us", href: "/contact" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileSub, setMobileSub] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [me, setMe] = useState<{ email: string; fullName: string } | null>(null);
  const [navReady, setNavReady] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
    setMobileSub(null);
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) {
          const guardian =
            (d as { guardian?: { email: string; fullName: string } } | null)?.guardian ?? null;
          setMe(guardian);
          setNavReady(true);
        }
      })
      .catch(() => { setNavReady(true); });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore network errors */
    }
    setMe(null);
    router.push("/login");
  }

  const enter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenMenu(label);
  };
  const leave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenMenu(null), 140);
  };

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 shadow-sm">
      <GovBanner />

      {/* Agency identification bar */}
      <div className="bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-3" aria-label="Trump.Account.gov home">
            <img
              src="/img/gov-seal.png"
              alt="Seal of the United States Department of the Treasury"
              width={54}
              height={54}
              className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14"
            />
            <span className="flex flex-col leading-none">
              <span className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-gov-base">
                U.S. Department of the Treasury
              </span>
              <span className="mt-1 font-serif text-xl font-bold text-gov-navy sm:text-2xl">
                Trump.Account<span className="text-gov-primary">.gov</span>
              </span>
              <span className="mt-1 hidden text-[0.7rem] uppercase tracking-[0.1em] text-gov-primary-dark sm:block">
                Trump Account Administration · Washington, D.C.
              </span>
            </span>
          </Link>

          <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 items-stretch lg:flex">
            <label htmlFor="site-search" className="sr-only">
              Search Trump.Account.gov
            </label>
            <input
              id="site-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Trump.Account.gov"
              className="usa-input rounded-r-none border-r-0 text-sm"
            />
            <button
              type="submit"
              aria-label="Search"
              className="flex items-center rounded-r bg-gov-primary px-3 text-white hover:bg-gov-primary-dark"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
                <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="m13 13 4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-expanded={mobileOpen}
            aria-label="Toggle navigation menu"
            className="ml-auto flex items-center gap-2 rounded border border-gov-base-light px-3 py-2 text-sm font-bold text-gov-navy lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              {mobileOpen ? (
                <path d="m4 4 12 12M16 4 4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
            Menu
          </button>
        </div>
      </div>

      {/* Primary navigation */}
      <nav
        className="hidden bg-gov-navy lg:block"
        aria-label="Primary navigation"
        onMouseLeave={leave}
      >
        <div className="mx-auto flex max-w-7xl items-stretch px-4 sm:px-6">
          <ul className="flex items-stretch">
            {(me ? NAV_LOGGED_IN : NAV_LOGGED_OUT).map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const hasKids = Boolean(item.children?.length);
              const isOpen = openMenu === item.label;
              return (
                <li
                  key={item.label}
                  className="relative"
                  onMouseEnter={() => hasKids && enter(item.label)}
                >
                  <Link
                    href={item.href}
                    onClick={() => hasKids && enter(item.label)}
                    aria-expanded={hasKids ? isOpen : undefined}
                    className={`flex h-full items-center gap-1.5 border-b-4 px-4 py-3 text-[0.86rem] font-bold tracking-wide transition-colors ${
                      active
                        ? "border-gov-accent bg-gov-primary-darker text-white"
                        : "border-transparent text-gov-primary-lighter hover:border-gov-accent hover:bg-gov-primary-darker hover:text-white"
                    }`}
                  >
                    {item.label}
                    {hasKids && (
                      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                        <path d="M1 3.5 5 7.5 9 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      </svg>
                    )}
                  </Link>

                  {hasKids && isOpen && (
                    <div className="absolute left-0 top-full z-50 w-[22rem] border-t-4 border-gov-accent bg-white shadow-xl">
                      <ul className="py-2">
                        {item.children!.map((c) => (
                          <li key={c.href + c.label}>
                            <Link
                              href={c.href}
                              className="block border-l-4 border-transparent px-4 py-2.5 hover:border-gov-primary hover:bg-gov-primary-lightest"
                            >
                              <span className="block text-sm font-bold text-gov-navy">{c.label}</span>
                              {c.desc && (
                                <span className="mt-0.5 block text-xs text-gov-base">{c.desc}</span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex items-center gap-3 py-2 pl-6">
            {me ? (
              <>
                <span className="hidden text-[0.8rem] text-gov-primary-lighter xl:inline">
                  {me.fullName || me.email}
                </span>
                <Link
                  href="/dashboard"
                  className="usa-button usa-button--accent !py-2 text-[0.8rem]"
                >
                  My Dashboard
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="text-[0.8rem] font-bold text-gov-primary-lighter hover:text-white hover:underline"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-[0.8rem] font-bold text-gov-primary-lighter hover:text-white hover:underline"
                >
                  Sign in
                </Link>
                {navReady && (
                  <Link href="/signup" className="usa-button usa-button--accent !py-2 text-[0.8rem]">
                    Register a child now
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile navigation */}
      {mobileOpen && (
        <div className="border-t border-gov-base-light bg-white lg:hidden">
          <form onSubmit={submitSearch} className="flex items-stretch gap-2 border-b border-gov-base-light px-4 py-3">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Trump.Account.gov"
              aria-label="Search Trump.Account.gov"
              className="usa-input text-sm"
            />
            <button type="submit" className="usa-button usa-button--primary !px-4 text-sm">
              Search
            </button>
          </form>
          <ul className="divide-y divide-gov-base-light">
            {(me ? NAV_LOGGED_IN : NAV_LOGGED_OUT).map((item) => {
              const hasKids = Boolean(item.children?.length);
              const expanded = mobileSub === item.label;
              return (
                <li key={item.label}>
                  <div className="flex items-stretch">
                    <Link
                      href={item.href}
                      className="flex-1 px-4 py-3 text-sm font-bold text-gov-navy"
                    >
                      {item.label}
                    </Link>
                    {hasKids && (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-label={`Expand ${item.label} menu`}
                        onClick={() => setMobileSub(expanded ? null : item.label)}
                        className="flex w-14 items-center justify-center border-l border-gov-base-light text-gov-primary"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          className={expanded ? "rotate-180" : ""}
                          aria-hidden="true"
                        >
                          <path d="M2 5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {hasKids && expanded && (
                    <ul className="bg-gov-base-lightest py-1">
                      {item.children!.map((c) => (
                        <li key={c.href + c.label}>
                          <Link
                            href={c.href}
                            className="block border-l-4 border-gov-primary-light px-5 py-2 text-sm text-gov-primary-dark"
                          >
                            {c.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <div className="space-y-2 px-4 py-4">
            {me ? (
              <div className="space-y-2">
                <p className="text-sm text-gov-base">
                  Signed in as <strong className="text-gov-navy">{me.fullName || me.email}</strong>
                </p>
                <Link href="/dashboard" className="usa-button usa-button--primary w-full text-center">
                  My Dashboard
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="w-full rounded border border-gov-base-light py-2 text-center text-sm font-bold text-gov-primary hover:bg-gov-base-lightest"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block py-2 text-center text-sm font-bold text-gov-primary"
                >
                  Sign in
                </Link>
                <Link href="/signup" className="usa-button usa-button--primary w-full text-center">
                  Register a child now
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
