"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/applications", label: "Applications", exact: false },
  { href: "/admin/inquiries", label: "Inquiries", exact: false },
  { href: "/admin/newsletter", label: "Newsletter", exact: false },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay md:hidden"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "fixed inset-y-0 left-0 z-40 flex w-56 shrink-0 flex-col bg-gov-navy text-white",
          "transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          "md:static md:translate-x-0",
        ].join(" ")}
        aria-label="Admin navigation"
      >
        <div className="border-b border-white/20 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gov-accent">
            CTF Admin
          </p>
          <p className="mt-0.5 text-xs text-white/60">ChildTrustFund.gov</p>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {NAV_LINKS.map(({ href, label, exact }) => (
              <li key={href}>
                <Link
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={[
                    "flex items-center gap-2 rounded px-3 py-2 text-sm font-medium",
                    isActive(href, exact)
                      ? "bg-white/20 text-white"
                      : "text-white/90 hover:bg-white/10",
                  ].join(" ")}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-white/20 px-4 py-4">
          <form method="POST" action="/api/admin/auth/logout">
            <button
              type="submit"
              className="w-full rounded px-3 py-2 text-left text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 border-b border-gov-base-light bg-gov-navy px-4 py-3 md:hidden">
          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
            className="flex flex-col gap-1.5 p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gov-accent"
          >
            <span aria-hidden="true" className="block h-0.5 w-6 bg-white" />
            <span aria-hidden="true" className="block h-0.5 w-6 bg-white" />
            <span aria-hidden="true" className="block h-0.5 w-6 bg-white" />
          </button>
          <span className="text-sm font-semibold uppercase tracking-widest text-gov-accent">
            CTF Admin
          </span>
        </div>

        <main className="flex-1 overflow-auto bg-gov-base-lightest">{children}</main>
      </div>
    </div>
  );
}
