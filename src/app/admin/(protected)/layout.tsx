import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import Link from "next/link";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const ok = await getAdminSession();
  if (!ok) redirect("/admin/login");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-56 shrink-0 flex-col bg-gov-navy text-white">
        <div className="border-b border-white/20 px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-gov-accent">
            CTF Admin
          </p>
          <p className="mt-0.5 text-xs text-white/60">ChildTrustFund.gov</p>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            <li>
              <Link
                href="/admin"
                className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                href="/admin/applications"
                className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
              >
                Applications
              </Link>
            </li>
            <li>
              <Link
                href="/admin/inquiries"
                className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
              >
                Inquiries
              </Link>
            </li>
            <li>
              <Link
                href="/admin/newsletter"
                className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
              >
                Newsletter
              </Link>
            </li>
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

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-gov-base-lightest">
        {children}
      </main>
    </div>
  );
}
