# Admin UX Overhaul — Implementation Plan

**Goal:** Make the admin portal mobile-friendly and improve deposit editing clarity.  
**Scope:** Admin components and pages only — no public-facing pages, API routes, or service layer changes.  
**Verification commands:** `npm run typecheck` then `npm run build` (run from repo root after every item).

---

## Files to change (ordered by dependency)

| # | File | Nature of change |
|---|------|-----------------|
| 1 | `src/app/globals.css` | Add admin-specific utility classes |
| 2 | `src/app/admin/(protected)/layout.tsx` | Hamburger + slide-in sidebar |
| 3 | `src/app/admin/(protected)/page.tsx` | Stat tiles: larger numbers, hover, 2-col mobile |
| 4 | `src/app/admin/(protected)/applications/page.tsx` | Mobile card view for application rows |
| 5 | `src/app/admin/(protected)/applications/[reference]/page.tsx` | Deposit callout banner, single-col mobile grid, full-width buttons |
| 6 | `src/components/admin/DepositsPanel.tsx` | Prominent add-form card, larger edit/delete buttons, card view on mobile, colored balance tiles |

Item 1 is a prerequisite for Items 2–6 because new CSS classes defined there are referenced in later files. Items 3–6 are independent of each other and can be done in any order after Item 2.

---

## Item 1 — `src/app/globals.css`

**What to do:** Add four new plain-CSS utility classes to the existing USWDS-flavoured section. Do NOT touch `@theme`, fonts, or existing classes.

**Exact additions** (append after `.gov-rule { … }` and before `@media print`):

```css
/* Admin sidebar overlay (mobile) */
.admin-sidebar-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 39;
}

/* Admin deposit-add card — prominent green header strip */
.admin-deposit-add-card {
  border: 2px solid var(--color-gov-green);
  border-radius: 0.35rem;
  overflow: hidden;
}
.admin-deposit-add-card__header {
  background: var(--color-gov-green);
  color: #ffffff;
  padding: 0.85rem 1.1rem;
  font-weight: 700;
  font-size: 1rem;
}
.admin-deposit-add-card__body {
  padding: 1.1rem;
  background: #ffffff;
}

/* Balance summary tile with colored top border */
.admin-balance-tile {
  background: #ffffff;
  border: 1px solid var(--color-gov-base-light);
  border-radius: 0.35rem;
  padding: 1rem 1.1rem;
}

/* Stat tile hover lift */
.admin-stat-tile {
  transition: box-shadow 0.18s ease, transform 0.18s ease;
  cursor: default;
}
.admin-stat-tile:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}
```

**Files:** `src/app/globals.css`  
**Verify:** `npm run typecheck` — no errors (CSS changes don't affect TS). Visually confirm classes exist.

---

## Item 2 — `src/app/admin/(protected)/layout.tsx`

**What to do:** Convert this Server Component into a thin shell that renders a new `AdminShell` client component. `AdminShell` owns the hamburger toggle and sidebar open/close state. The session check (`getAdminSession`) stays in the Server Component; only the interactive shell moves to the client.

**Design decisions:**
- Keep the Server Component for auth check (can't use hooks there); pass `children` to a `"use client"` component.
- Sidebar slides in on mobile with `transform: translateX(-100%)` / `translateX(0)` using Tailwind's `translate-x-*` and a `transition-transform` class — no new packages, no JS animation libraries.
- An overlay div (`.admin-sidebar-overlay`) sits behind the open sidebar on mobile and closes it on click.
- On `md` and up (`md:translate-x-0`, `md:static`) the sidebar is always visible and the main area fills the rest with `md:flex`.
- The hamburger button is `md:hidden` so it only appears on small screens.

**Exact rewrite of `layout.tsx`:**

```tsx
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const ok = await getAdminSession();
  if (!ok) redirect("/admin/login");

  return <AdminShell>{children}</AdminShell>;
}
```

**Create new file `src/components/admin/AdminShell.tsx`:**

```tsx
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
            <span className="block h-0.5 w-6 bg-white" />
            <span className="block h-0.5 w-6 bg-white" />
            <span className="block h-0.5 w-6 bg-white" />
          </button>
          <span className="text-sm font-semibold text-gov-accent tracking-widest uppercase">
            CTF Admin
          </span>
        </div>

        <main className="flex-1 overflow-auto bg-gov-base-lightest">{children}</main>
      </div>
    </div>
  );
}
```

**Files:** `src/app/admin/(protected)/layout.tsx` (rewrite), `src/components/admin/AdminShell.tsx` (new)  
**Verify:** `npm run typecheck && npm run build` — both pass.

---

## Item 3 — `src/app/admin/(protected)/page.tsx`

**What to do:** Two targeted changes to the stat tiles grid and the recent-applications table.

### 3a — Stat tiles
- Change the grid from `grid-cols-1 … sm:grid-cols-2 lg:grid-cols-3` to `grid-cols-2 … lg:grid-cols-3` (2 columns on mobile, not 1).
- On every stat tile `<div>`, add the class `admin-stat-tile` alongside `usa-card p-5`.
- Change the number `<p>` from `text-2xl` to `text-3xl` on every tile (there are 6 tiles).

### 3b — Recent applications table (mobile)
- Wrap the existing `<div className="overflow-x-auto">` + `<table>` in a `hidden sm:block` wrapper.
- Immediately before that wrapper, add a mobile card list (`sm:hidden`) that renders each row as a stacked card showing: Reference (link), Child Name, Status badge, Submitted date.

**Exact diff — stat tiles grid line** (find and replace):
```
// OLD
className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
// NEW
className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3"
```

**Exact diff — each stat tile** (add `admin-stat-tile` class):
```
// OLD (example for first tile)
className="usa-card p-5"
// NEW
className="usa-card p-5 admin-stat-tile"
```
Apply this to all 6 stat tile `<div>` elements.

**Exact diff — number font size** (apply to all 6 tiles):
```
// OLD
className="font-serif text-2xl font-bold text-gov-navy tabular-nums"
// NEW
className="font-serif text-3xl font-bold text-gov-navy tabular-nums"
```

**Mobile card list to add before the `overflow-x-auto` div inside the Recent Applications section:**
```tsx
{/* Mobile list — hidden on sm+ */}
<div className="space-y-3 sm:hidden">
  {recent.map((row) => (
    <div key={row.referenceNumber} className="usa-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/admin/applications/${row.referenceNumber}`}
          className="font-mono text-sm font-bold text-gov-primary hover:underline"
        >
          {row.referenceNumber}
        </Link>
        <StatusBadge status={row.status} />
      </div>
      <p className="mt-1 text-sm font-medium text-gov-navy">
        {row.childFirstName} {row.childLastName}
      </p>
      <p className="mt-0.5 text-xs text-gov-base">
        {row.parentFullName} · {row.parentState}
      </p>
      <p className="mt-1 text-xs text-gov-base">
        Submitted {new Date(row.submittedAt).toLocaleDateString("en-US")}
      </p>
    </div>
  ))}
  {recent.length === 0 && (
    <p className="py-4 text-center text-sm text-gov-base">No applications yet.</p>
  )}
</div>
{/* Desktop table — hidden on mobile */}
<div className="hidden overflow-x-auto sm:block">
  {/* existing <table>…</table> */}
</div>
```

**Files:** `src/app/admin/(protected)/page.tsx`  
**Verify:** `npm run typecheck && npm run build` — both pass.

---

## Item 4 — `src/app/admin/(protected)/applications/page.tsx`

**What to do:** Add a mobile card list for applications that mirrors the desktop table data. Keep the desktop table unchanged.

**Strategy:** Wrap the existing `<div className="usa-card mt-6 overflow-x-auto">` + table in `<div className="hidden sm:block …">`. Before it, add a `sm:hidden` card list. Each card shows: reference (mono link), child name + guardian, state+tier, status badge, balance, submitted date, and an "Open" button linking to the detail page. The `TierBadge` component is already defined in the file and can be reused in the mobile view.

**Mobile card block to insert before the existing `usa-card mt-6 overflow-x-auto` div:**

```tsx
{/* Mobile card list */}
<div className="mt-6 space-y-3 sm:hidden">
  {rows.map((row) => (
    <div key={row.referenceNumber} className="usa-card p-4">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/admin/applications/${row.referenceNumber}`}
          className="font-mono text-sm font-bold text-gov-primary hover:underline"
        >
          {row.referenceNumber}
        </Link>
        <StatusBadge status={row.status} />
      </div>
      <p className="mt-1 text-sm font-semibold text-gov-navy">
        {row.childFirstName} {row.childLastName}
      </p>
      <p className="mt-0.5 text-xs text-gov-base">
        Guardian: {row.parentFullName}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gov-base">
        <span>{row.parentState}</span>
        <span>·</span>
        <TierBadge tier={row.participationTier} />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold tabular-nums text-gov-navy">
          {formatUSD(balanceMap.get(row.id) ?? 0)}
        </span>
        <span className="text-xs text-gov-base">
          {new Date(row.submittedAt).toLocaleDateString("en-US")}
        </span>
      </div>
      <Link
        href={`/admin/applications/${row.referenceNumber}`}
        className="usa-button usa-button--primary mt-3 w-full text-sm"
      >
        Open
      </Link>
    </div>
  ))}
  {rows.length === 0 && (
    <p className="py-8 text-center text-sm text-gov-base">
      No applications match your filters.
    </p>
  )}
</div>

{/* Desktop table */}
<div className="usa-card mt-6 hidden overflow-x-auto sm:block">
  {/* existing table — unchanged */}
</div>
```

Note: the `usa-button--outline` class currently has `color: #ffffff` (white text on transparent). For the "Open" button on a white card background, use `usa-button--primary` instead (already used for other CTAs in the admin).

**Files:** `src/app/admin/(protected)/applications/page.tsx`  
**Verify:** `npm run typecheck && npm run build` — both pass.

---

## Item 5 — `src/app/admin/(protected)/applications/[reference]/page.tsx`

**What to do:** Three changes.

### 5a — Deposit callout banner
Insert a prominent banner after the header `<div>` and before the 3-column grid. It is a server-rendered JSX block (no client component needed). It should include an anchor link to `#deposit-ledger`.

```tsx
{/* Deposit callout banner */}
<div className="mb-6 flex items-center gap-3 rounded border-l-4 border-gov-green bg-[#f0faf1] px-4 py-3">
  <span className="text-2xl" aria-hidden="true">💰</span>
  <div className="flex-1">
    <p className="text-sm font-bold text-gov-green-dark">Deposit Ledger</p>
    <p className="text-xs text-gov-base">
      View and edit all deposits for this account below.
    </p>
  </div>
  <a href="#deposit-ledger" className="usa-button usa-button--outline-dark text-sm shrink-0">
    Go to Ledger ↓
  </a>
</div>
```

### 5b — Single-column mobile grid
Change `<div className="grid gap-6 lg:grid-cols-3">` to keep the right-column summary stacking below on mobile:
```
// OLD
className="grid gap-6 lg:grid-cols-3"
// NEW  
className="grid gap-6 lg:grid-cols-3"   ← no change needed; it already defaults to 1-col
```
The current grid is already single-column on mobile (no `sm:grid-cols-*` applied). This item is already satisfied — no change required for the grid itself. ✓

### 5c — Full-width buttons on mobile
The `ApplicationStatusPanel` and `ApplicationEditForm` components each have a submit/action button. To avoid touching component internals unnecessarily, add a wrapper class on the detail page that makes buttons full-width at mobile width via a utility wrapper:

On the `<div className="usa-card">` containing `<ApplicationStatusPanel>`, add a `[&_.usa-button]:w-full [&_.usa-button]:sm:w-auto` Tailwind class to cascade button width on mobile. However, Tailwind v4 arbitrary variant syntax with `&_` may not be available; instead, the correct approach is to pass a prop or wrap each button inside those components.

**Decision:** Since `ApplicationStatusPanel` and `ApplicationEditForm` are already client components, add `w-full sm:w-auto` to each existing `usa-button` in both files. This is the safest approach that passes typecheck and build.

In `ApplicationStatusPanel.tsx`:
- The "Approve & advance" button: add `w-full sm:w-auto` to its className.
- The "Apply override" button: add `w-full sm:w-auto` to its className.

In `ApplicationEditForm.tsx`:
- The "Save changes" submit button: add `w-full sm:w-auto` to its className.

**Also:** Add the `id="deposit-ledger"` anchor target on the `DepositsPanel` wrapper in this page. Change:
```tsx
<DepositsPanel reference={app.referenceNumber} initialDeposits={serializedDeposits} />
```
to:
```tsx
<div id="deposit-ledger">
  <DepositsPanel reference={app.referenceNumber} initialDeposits={serializedDeposits} />
</div>
```

**Files:**  
- `src/app/admin/(protected)/applications/[reference]/page.tsx`  
- `src/components/admin/ApplicationStatusPanel.tsx`  
- `src/components/admin/ApplicationEditForm.tsx`

**Verify:** `npm run typecheck && npm run build` — both pass.

---

## Item 6 — `src/components/admin/DepositsPanel.tsx`

This is the most substantial change. Four sub-tasks.

### 6a — Move "Add New Deposit" to the top as a prominent always-visible card

**Current behavior:** A toggle button reveals the add form. The button is at the bottom-right, after the balance summary.

**New behavior:** Replace the toggle button entirely. The add form card is always rendered at the very top of the component (before the balance summary), using the `.admin-deposit-add-card` CSS classes from Item 1. The card header reads "📋 Record a New Deposit". The body contains the form fields (same as the current `adding && (...)` block). The form is always visible — remove the `adding` state variable and its toggle button. The "Cancel" button inside the form clears the fields (resets to `DEFAULT_ADD`) and shows a confirmation message, but does not hide the form.

**State change:** Remove `const [adding, setAdding] = useState(false)`. The form is always mounted. The "Save deposit" button is the primary action. A "Clear form" button resets fields to `DEFAULT_ADD`.

### 6b — Balance summary tiles with colored top borders

Replace the current `<dl>` grid inside `rounded border border-gov-base-light bg-gov-base-lightest p-4` with five `.admin-balance-tile` cards in a responsive grid. Each tile gets a colored `border-top` via inline style. Move the `<dl>` to after the add-deposit card.

Color mapping:
- Federal → `var(--color-gov-primary)` (blue)
- State Match → `var(--color-gov-green)` (green)
- Contributions → `var(--color-gov-accent)` (amber)
- Earnings → `var(--color-gov-warm)` (orange)
- Grand Total → `var(--color-gov-navy)` (navy)

Each tile markup:
```tsx
<div className="admin-balance-tile" style={{ borderTop: "4px solid var(--color-gov-primary)" }}>
  <dt className="text-xs font-bold uppercase tracking-wider text-gov-base">Federal</dt>
  <dd className="mt-1 font-serif text-xl font-bold text-gov-navy">{formatUSD(federalTotal)}</dd>
</div>
```

Grid: `grid grid-cols-2 gap-3 sm:grid-cols-5` (same as before but using the new tile classes).

### 6c — Larger edit/delete buttons with emoji labels

In the read row (the non-editing `<tr>`), change the action buttons:

```tsx
// OLD edit button
<button type="button" className="usa-button usa-button--outline text-xs" onClick={() => startEdit(d)}>
  Edit
</button>
// NEW edit button
<button type="button" className="usa-button usa-button--outline-dark text-sm px-3 py-1.5" onClick={() => startEdit(d)}>
  ✏️ Edit
</button>

// OLD delete button
<button type="button" className="text-xs text-gov-red hover:underline" onClick={...}>
  Delete
</button>
// NEW delete button
<button type="button"
  className="usa-button text-sm px-3 py-1.5 bg-gov-red text-white border-transparent hover:bg-gov-red-dark"
  onClick={() => { setConfirmDeleteId(d.id); setError(""); }}>
  🗑️ Delete
</button>
```

Note: `usa-button--outline` has `color: #ffffff` (designed for dark backgrounds). Use `usa-button--outline-dark` (already defined in globals.css) for the edit button on light table rows.

### 6d — Mobile card view instead of wide table

Wrap the existing `<div className="overflow-x-auto"><table>…</table></div>` in `<div className="hidden sm:block">`. Before it, add a mobile card list (`sm:hidden`) that renders each deposit as a stacked card.

Each mobile deposit card:
```tsx
<div key={d.id} className="usa-card p-4">
  <div className="flex items-start justify-between gap-2">
    <div>
      <p className="text-sm font-semibold text-gov-navy">{TYPE_LABELS[d.depositType] ?? d.depositType}</p>
      <p className="text-xs text-gov-base">{d.description}</p>
    </div>
    <span className={`usa-tag text-xs ${statusClass(d.status)}`}>{d.status}</span>
  </div>
  <p className="mt-2 font-serif text-xl font-bold text-gov-navy">{formatUSD(d.amountCents)}</p>
  <p className="mt-1 text-xs text-gov-base">
    {d.source} {d.scheduledFor ? `· Scheduled ${new Date(d.scheduledFor).toLocaleDateString("en-US")}` : ""}
    {d.postedAt ? `· Posted ${new Date(d.postedAt).toLocaleDateString("en-US")}` : ""}
  </p>
  <div className="mt-3 flex gap-2">
    <button type="button"
      className="usa-button usa-button--outline-dark text-sm flex-1"
      onClick={() => startEdit(d)}>
      ✏️ Edit
    </button>
    <button type="button"
      className="usa-button text-sm flex-1 bg-gov-red text-white border-transparent hover:bg-gov-red-dark"
      onClick={() => { setConfirmDeleteId(d.id); setError(""); }}>
      🗑️ Delete
    </button>
  </div>
</div>
```

For the edit state on mobile: when `editingId === d.id`, render the edit form as a full-width card instead of table cells. The simplest approach is to render the mobile edit state inline within the card list using the same `editFields` / `saveEdit` / `cancelEdit` logic.

### 6e — Amounts larger and bold in the desktop table

In the read row amount cell:
```tsx
// OLD
<td className="font-semibold">{formatUSD(d.amountCents)}</td>
// NEW
<td className="font-serif text-base font-bold text-gov-navy tabular-nums">{formatUSD(d.amountCents)}</td>
```

### Summary of state changes in DepositsPanel

Remove: `adding`, `setAdding` state variables.  
The add form card is always rendered at the top. Its "Clear form" button calls `setAddFields(DEFAULT_ADD)`.  
All other state (`editingId`, `editFields`, `confirmDeleteId`, `saving`, `error`) remains unchanged.

**Files:** `src/components/admin/DepositsPanel.tsx`  
**Verify:** `npm run typecheck && npm run build` — both pass.

---

## Order of execution

```
1. globals.css          (new CSS classes — no TS involved)
2. AdminShell.tsx       (new file) + layout.tsx (rewrite)
3. page.tsx (dashboard) (stat tile classes + mobile table)
4. applications/page.tsx (mobile card list)
5. [reference]/page.tsx + ApplicationStatusPanel.tsx + ApplicationEditForm.tsx
6. DepositsPanel.tsx    (largest change, depends on CSS from step 1)
```

Final verification after all items:
```bash
npm run typecheck   # must exit 0
npm run build       # must exit 0 with no type errors
```

---

## Key constraints reminder for implementer

- All Tailwind classes must use tokens already in `@theme`: `gov-navy`, `gov-primary`, `gov-green`, `gov-red`, `gov-accent`, `gov-base`, `gov-base-light`, `gov-base-lightest`, `gov-warm`, etc.
- `usa-button--outline` is white-text-on-transparent — only use it on dark backgrounds. Use `usa-button--outline-dark` on white/light card backgrounds.
- No icon library imports — emoji only.
- Do not change `src/lib/`, `src/db/`, `src/app/api/`, or any public-facing page.
- `usa-button` class already provides padding; avoid doubling padding with extra `px-*` unless the default (`0.75rem 1.35rem`) is too large. For compact buttons in table cells, `text-sm` is sufficient to shrink them; add `!py-1 !px-2` only if needed to fit within table cells.
- Money is displayed only from pre-computed `amountCents` values — no new math.
