# Implementation Plan — Admin Portal

## Context from codebase exploration

- **Auth pattern** (`src/lib/auth.ts`): guardian session uses `createSessionToken` / `readSessionToken` (HMAC-SHA-256, `base64url` data + sig, expiry in payload). Same pattern will be reused for admin. Cookie name is `ctf_session`; admin cookie will be `ctf_admin_session`. `getSecret()` reads `SESSION_SECRET`.
- **Service pattern** (`src/lib/service.ts`): all DB work goes through `ensureSeedData()` first (single-flight init). New admin service functions follow the same structure. `logEvent` is a private helper — admin status-change will call a new exported `adminSetApplicationStatus` that uses the same pattern.
- **Route handler signature** (Next.js 16 App Router): `params` is a **Promise** — always `await ctx.params` before using. Set `export const dynamic = "force-dynamic"` on every admin page and route.
- **Money**: always stored as integer cents; display via `formatUSD` from `src/lib/program.ts`.
- **Schema** (`src/db/schema.ts`): `inquiries` already has a `handled boolean` column. All 6 tables are confirmed. `statusEvents` is the audit table (`application_events` in DDL, `statusEvents` Drizzle alias). `ApplicationStatus` union includes `"rejected"`.
- **CSS**: Tailwind v4 — tokens via `--color-gov-*` CSS vars, utility classes like `bg-gov-navy`, `text-gov-primary`. Reusable classes: `.usa-button`, `.usa-input`, `.usa-label`, `.usa-card`, `.usa-table`, `.usa-tag`, `.usa-hint`. No `tailwind.config.js`; all in `src/app/globals.css`.
- **Admin layout**: must NOT use `SiteHeader` / `SiteFooter` / `GovBanner`. Root `src/app/layout.tsx` wraps everything with those components, so `src/app/admin/layout.tsx` must render its own `<html><body>` structure (it is a **nested layout** but the root layout already emits `<html>`/`<body>` — so the admin layout is a **segment layout** that replaces the inner content, NOT a new root). The root layout's header/footer are injected for all routes — to suppress them for `/admin/*`, the correct approach is to move the public site header/footer into a **group layout** `src/app/(public)/layout.tsx` so they don't affect the `/admin` segment. This is the key architectural decision.

## TypeScript pitfalls to avoid

1. **`params` is a Promise in Next.js 16**: every route handler and page with a dynamic segment must `await ctx.params` or `await props.params` before destructuring. Forgetting this causes a TS error and a runtime `undefined` reference.
2. **Date serialization**: Drizzle returns `Date` objects; pages/components that accept them as props must either receive ISO strings or have their prop types widened. Pass ISO strings (`.toISOString()`) into client components, not raw `Date` objects.
3. **`sql<number>` casts**: Postgres `bigint` aggregates come back as `string` from `node-postgres`; always wrap in `Number(...)` as the existing service functions already do.
4. **`cookies()` is async in Next.js 15+**: the existing code already `await`s `cookies()` — admin helpers must do the same.
5. **`export const dynamic = "force-dynamic"`** must appear in every admin page file — omitting it causes stale static renders of auth-protected pages.
6. **Client components and `Date` props**: never pass a `Date` from a server component into a `"use client"` component — serialize to string first.
7. **`Response.json` vs `NextResponse.json`**: the existing routes use the native `Response.json()` (available in Node 18+). Stick with that; do not import `NextResponse` unless there is a specific reason.
8. **Admin layout isolation**: the root layout at `src/app/layout.tsx` renders `<SiteHeader>` and `<SiteFooter>` for every route. If `/admin` is added as a direct child, those will appear on admin pages. Fix: wrap all public pages in a route group `(public)` with its own layout that includes `SiteHeader`/`SiteFooter`, leaving `admin` outside the group so it only gets the root `<html>`/`<body>` shell.

---

## Implementation steps

- [ ] 1. **Restructure public-site layout into a route group so `/admin` is isolated.**

  The root `src/app/layout.tsx` currently renders `<SiteHeader>` and `<SiteFooter>` around all content. Move those components into a new group layout `src/app/(public)/layout.tsx`, and physically move every existing public page directory into `src/app/(public)/`. The root layout becomes a bare `<html><body>` shell (fonts + CSS only). The `(public)` group layout adds the header/footer. The `admin` directory sits at `src/app/admin/` alongside `(public)`, untouched by the public header/footer.

  **Files to create:**
  - `src/app/(public)/layout.tsx` — copies current root layout body, keeps `SiteHeader`/`SiteFooter`/`GovBanner`, skip link, etc.

  **Files to modify:**
  - `src/app/layout.tsx` — strip `SiteHeader`/`SiteFooter`; keep only `<html lang="en">`, font class injection, global CSS import, and `<body>` wrapper with `{children}`.

  **Files to move** (directory-level moves): every existing public page folder moves inside `src/app/(public)/`. The following directories/files move:
  - `src/app/about/` → `src/app/(public)/about/`
  - `src/app/apply/` → `src/app/(public)/apply/`
  - `src/app/contact/` → `src/app/(public)/contact/`
  - `src/app/dashboard/` → `src/app/(public)/dashboard/`
  - `src/app/deposit/` → `src/app/(public)/deposit/`
  - `src/app/eligibility/` → `src/app/(public)/eligibility/`
  - `src/app/faq/` → `src/app/(public)/faq/`
  - `src/app/how-it-works/` → `src/app/(public)/how-it-works/`
  - `src/app/login/` → `src/app/(public)/login/`
  - `src/app/program-data/` → `src/app/(public)/program-data/`
  - `src/app/resources/` → `src/app/(public)/resources/`
  - `src/app/search/` → `src/app/(public)/search/`
  - `src/app/signup/` → `src/app/(public)/signup/`
  - `src/app/states/` → `src/app/(public)/states/`
  - `src/app/status/` → `src/app/(public)/status/`
  - `src/app/verify/` → `src/app/(public)/verify/`
  - `src/app/page.tsx` → `src/app/(public)/page.tsx` (the home page)

  After moving, all existing page imports and `@/` aliases remain valid since they are not relative paths. The `api/` directory stays at `src/app/api/` (never inside a route group).

  **Verify:** `npm run typecheck && npm run build` — public pages still render, no broken imports.

---

- [ ] 2. **Add admin env vars to `.env.example` and extend `src/lib/auth.ts` with admin session helpers.**

  Add to `.env.example`:
  ```
  # Admin portal credentials (plain comparison — prototype only)
  ADMIN_EMAIL=admin@example.gov
  ADMIN_PASSWORD=changeme
  ```
  `SESSION_SECRET` already present; the same secret is reused for the admin token (document this in a comment).

  Add to `src/lib/auth.ts`:
  ```ts
  export const ADMIN_SESSION_COOKIE = "ctf_admin_session";

  type AdminSessionPayload = { role: "admin"; exp: number };

  export function createAdminSessionToken(
    secret: string,
    maxAgeSeconds = 60 * 60 * 8, // 8-hour admin sessions
  ): string

  export function readAdminSessionToken(
    token: string,
    secret: string,
  ): AdminSessionPayload | null   // returns null on bad sig or expired

  export async function getAdminSession(): Promise<boolean>
  // reads ctf_admin_session cookie, returns true iff valid + unexpired
  ```

  Implementation mirrors the existing `createSessionToken`/`readSessionToken` pattern exactly (HMAC-SHA-256, base64url encode JSON payload, append `.sig`). `getAdminSession` follows `getSessionGuardian` — `await cookies()`, get the cookie value, call `readAdminSessionToken`, swallow missing-secret errors with `return false`.

  **Files to modify:** `src/lib/auth.ts`, `.env.example`

  **Verify:** `npm run typecheck` — no new type errors.

---

- [ ] 3. **Add admin service functions to `src/lib/service.ts`.**

  All functions call `await ensureSeedData()` first and use the existing `db` instance and Drizzle query pattern.

  ### 3a — Stats
  ```ts
  export async function adminGetStats(): Promise<{
    totalApplications: number;
    pendingReview: number;        // submitted + under_review + verification_required
    fundedAccounts: number;
    totalPostedCents: number;     // sum(amount_cents) where status='posted'
  }>
  ```
  Single query joining `applications` + `deposits` with conditional aggregates (same pattern as `getProgramStats`).

  ### 3b — Applications list (paginated)
  ```ts
  export async function adminGetAllApplications(opts: {
    page: number;          // 1-indexed
    pageSize?: number;     // default 20
    status?: string;       // filter — undefined means all
    search?: string;       // matches referenceNumber ILIKE or parentFullName ILIKE
  }): Promise<{
    rows: {
      referenceNumber: string;
      childFirstName: string;
      childLastName: string;
      parentFullName: string;
      parentState: string;
      status: string;
      submittedAt: Date;
    }[];
    total: number;
    page: number;
    pageSize: number;
  }>
  ```
  Use Drizzle `sql` for `count(*)`, `.where(and(...))` with optional `eq(applications.status, opts.status)` and `sql\`${applications.referenceNumber} ilike ${'%'+search+'%'} or ${applications.parentFullName} ilike ${'%'+search+'%'}\``. Offset = `(page-1) * pageSize`.

  ### 3c — Application detail (admin, no lastName gate)
  ```ts
  export async function adminGetApplicationDetail(
    reference: string,
  ): Promise<ApplicationDetail | null>
  ```
  Reuse the `getApplicationDetail` internals but omit the lastName check. Return the same `ApplicationDetail` type.

  ### 3d — Update application fields
  ```ts
  export async function adminUpdateApplication(
    reference: string,
    fields: Partial<{
      parentFullName: string;
      parentEmail: string;
      parentPhone: string;
      parentDob: string;
      parentAddressLine1: string;
      parentAddressLine2: string | null;
      parentCity: string;
      parentState: string;
      parentZip: string;
      childFirstName: string;
      childMiddleName: string | null;
      childLastName: string;
      childDob: string;
      childGender: string | null;
      accountType: string;
      custodianBank: string;
      verificationMethod: string;
      verificationStatus: string;
      participationTier: string;
    }>,
  ): Promise<{ ok: true } | { ok: false; error: string }>
  ```
  `db.update(applications).set({ ...fields, updatedAt: new Date() }).where(eq(...))`. Log an `admin_edit` event.

  ### 3e — Set status
  ```ts
  export async function adminSetApplicationStatus(
    reference: string,
    status: ApplicationStatus,
    notes: string,
    actor = "admin",
  ): Promise<{ ok: true; status: ApplicationStatus } | { ok: false; error: string }>
  ```
  Update `applications.status`, set `statusMessage = notes`, `updatedAt = now`. Log a `status_override` event with detail = notes, actor = actor.

  ### 3f — Inquiries
  ```ts
  export async function adminGetAllInquiries(opts: {
    handled?: boolean;   // undefined = all, true = handled only, false = unhandled only
  }): Promise<(typeof inquiries.$inferSelect)[]>

  export async function adminMarkInquiryHandled(
    id: number,
  ): Promise<{ ok: true } | { ok: false; error: string }>
  ```
  `adminMarkInquiryHandled`: `db.update(inquiries).set({ handled: true }).where(eq(inquiries.id, id))`. Return `{ ok: false, error: "Not found." }` if `rowCount` is 0.

  ### 3g — Newsletter
  ```ts
  export async function adminGetNewsletterSignups(): Promise<
    (typeof newsletterSignups.$inferSelect)[]
  >
  ```
  Simple `db.select().from(newsletterSignups).orderBy(desc(newsletterSignups.createdAt))`.

  **Files to modify:** `src/lib/service.ts`

  **Verify:** `npm run typecheck` — all new functions type-check cleanly.

---

- [ ] 4. **Create the admin API routes.**

  All routes must:
  - Import `getAdminSession` from `@/lib/auth`.
  - Start with `const isAdmin = await getAdminSession(); if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });`
  - Set `export const dynamic = "force-dynamic"`.
  - Keep logic thin (parse → call service → respond).

  ### Route files to create:

  **`src/app/api/admin/stats/route.ts`** — `GET`: call `adminGetStats()`, return `{ ok: true, ...stats }`.

  **`src/app/api/admin/applications/route.ts`** — `GET`: parse `page` (default 1), `status`, `search` from `url.searchParams`; call `adminGetAllApplications`; return paginated result.

  **`src/app/api/admin/applications/[reference]/route.ts`** — two handlers:
  - `GET`: call `adminGetApplicationDetail(reference)`, 404 if null.
  - `PUT`: parse body, call `adminUpdateApplication(reference, fields)`. Body shape: the `Partial<{...}>` fields from step 3d.

  Ctx type (reuse exactly):
  ```ts
  type Ctx = { params: Promise<{ reference: string }> };
  ```

  **`src/app/api/admin/applications/[reference]/status/route.ts`** — `POST`: parse `{ status, notes }` from body; validate `status` is a known `ApplicationStatus` value; call `adminSetApplicationStatus`.

  **`src/app/api/admin/inquiries/route.ts`** — `GET`: parse `handled` query param (`"true"` / `"false"` / absent); call `adminGetAllInquiries`; return array.

  **`src/app/api/admin/inquiries/[id]/handle/route.ts`** — `POST`: parse `id` as `Number`; call `adminMarkInquiryHandled(id)`.

  Ctx type:
  ```ts
  type Ctx = { params: Promise<{ id: string }> };
  ```

  **`src/app/api/admin/newsletter/route.ts`** — `GET`: call `adminGetNewsletterSignups()`; return array with total count.

  **Also create the login/logout API routes:**

  **`src/app/api/admin/auth/login/route.ts`** — `POST`:
  ```ts
  // body: { email: string; password: string }
  // compare against process.env.ADMIN_EMAIL and process.env.ADMIN_PASSWORD (plain string)
  // on match: createAdminSessionToken(getSecret()), set ctf_admin_session cookie, return { ok: true }
  // on mismatch: return { ok: false, error: "Invalid credentials." } status 401
  ```
  Cookie options: same as `sessionCookieOptions()` but 8-hour maxAge.

  **`src/app/api/admin/auth/logout/route.ts`** — `POST`: clear `ctf_admin_session` cookie (maxAge 0), return `{ ok: true }`.

  **Files to create:** all 8 route files listed above.

  **Verify:** `npm run typecheck && npm run build` — no TS errors in route files.

---

- [ ] 5. **Create the admin layout (`src/app/admin/layout.tsx`).**

  This is a **server component** (no `"use client"`). It does NOT include `SiteHeader`, `SiteFooter`, or `GovBanner`.

  Structure:
  ```
  <div class="flex min-h-screen">
    <aside>  ← Sidebar nav (server-rendered links)
      Logo / wordmark: "CTF Admin"
      Nav links:
        /admin              → Dashboard
        /admin/applications → Applications
        /admin/inquiries    → Inquiries / Inbox
        /admin/newsletter   → Newsletter Signups
      "Sign out" form (POST to /api/admin/auth/logout then redirect to /admin/login)
    </aside>
    <main class="flex-1 overflow-auto">
      {children}
    </main>
  </div>
  ```

  **Auth guard**: the layout itself calls `getAdminSession()`. If `false`, it redirects to `/admin/login` using Next.js `redirect('/admin/login')`. This protects the entire `/admin/*` segment. The login page is excluded from this layout by placing it outside the layout's scope — see step 6.

  **Design tokens to use**: `bg-gov-navy` for sidebar, `text-white`, `bg-gov-primary` for active links, `bg-gov-base-lighter` for the main content area.

  **Note**: the sign-out link must be a `<form method="POST" action="/api/admin/auth/logout">` with a submit button, because POST is required to clear the cookie (mirrors the public `/api/auth/logout` pattern).

  **Files to create:** `src/app/admin/layout.tsx`

  **Verify:** `npm run typecheck` — layout compiles.

---

- [ ] 6. **Create the admin login page (`src/app/admin/login/page.tsx`) and its supporting client component.**

  The login page must be **outside the admin layout's auth guard**. Achieve this by giving it its own layout or by checking: since Next.js applies `admin/layout.tsx` to all children of `admin/`, the login page IS a child. Handle this by having the layout check: `if (pathname === '/admin/login') render children directly without the sidebar`. But that requires `usePathname` which makes it a client component. Simpler: restructure — put the protected pages under a sub-group `src/app/admin/(protected)/layout.tsx` with the auth guard, and put `login/` and the logout API at `src/app/admin/login/` and `src/app/api/admin/auth/`. The bare `src/app/admin/layout.tsx` becomes a neutral shell (no auth check, just fonts/CSS). The `(protected)` group layout does the `getAdminSession()` redirect.

  Revised admin file tree:
  ```
  src/app/admin/
    layout.tsx              ← neutral shell, no auth check
    login/
      page.tsx              ← public login form
    (protected)/
      layout.tsx            ← auth guard: redirect to /admin/login if !isAdmin
      page.tsx              ← dashboard
      applications/
        page.tsx
        [reference]/
          page.tsx
      inquiries/
        page.tsx
      newsletter/
        page.tsx
  ```

  **`src/app/admin/layout.tsx`** — minimal shell: wraps children in the font variables (reuse `className` from root layout), no header/footer.

  **`src/app/admin/(protected)/layout.tsx`** — server component, calls `getAdminSession()`, redirects to `/admin/login` if false, otherwise renders sidebar + `{children}`.

  **`src/app/admin/login/page.tsx`** — thin server component, renders `<AdminLoginForm />`.

  **`src/components/AdminLoginForm.tsx`** — `"use client"` component:
  - Email + password fields using `.usa-input`, `.usa-label` classes.
  - On submit: `fetch('/api/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })`.
  - On success: `router.push('/admin')`.
  - On error: show inline error message.
  - No redirect to public pages — this is purely admin.

  **Files to create:** `src/app/admin/layout.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/(protected)/layout.tsx`, `src/components/AdminLoginForm.tsx`

  **Verify:** `npm run typecheck` — login page and layout compile without errors.

---

- [ ] 7. **Create the admin dashboard page (`src/app/admin/(protected)/page.tsx`).**

  Server component. `export const dynamic = "force-dynamic"`.

  - Calls `adminGetStats()` to get the 4 summary stats.
  - Calls `adminGetAllApplications({ page: 1, pageSize: 10 })` for the recent-applications table.
  - Renders stat tiles using the `<StatTile>` primitive from `src/components/ui.tsx`.
  - Renders a `<table className="usa-table">` of the 10 most-recent applications with columns: Reference, Child Name, Guardian, Status, Submitted.
  - Status column uses `<StatusBadge>` from `src/components/ui.tsx`.
  - Each row has a link to `/admin/applications/[reference]`.

  **Files to create:** `src/app/admin/(protected)/page.tsx`

  **Verify:** `npm run build` — page compiles; navigate to `/admin` (after login) to see stat tiles and table.

---

- [ ] 8. **Create the applications list page (`src/app/admin/(protected)/applications/page.tsx`) and its client filter component.**

  The page is a server component that reads `searchParams` (must `await searchParams` in Next.js 16):
  ```ts
  export default async function Page({
    searchParams,
  }: {
    searchParams: Promise<{ page?: string; status?: string; search?: string }>;
  }) {
    const { page, status, search } = await searchParams;
    ...
  }
  ```

  - Calls `adminGetAllApplications({ page: Number(page ?? 1), status, search })`.
  - Renders a `<table className="usa-table">` with columns: Reference, Child Full Name, Guardian, State, Status, Submitted, Actions.
  - "Actions" column: link `Edit / Review` to `/admin/applications/[reference]`.
  - Pagination: prev/next links that adjust `?page=N` in the URL.
  - Filter + search: rendered as a `<AdminApplicationsFilter>` client component that manages controlled inputs and pushes `?status=...&search=...&page=1` to the router on change.

  **`src/components/AdminApplicationsFilter.tsx`** — `"use client"`:
  - Status `<select>` (all / submitted / under_review / verification_required / approved / funded).
  - Search `<input type="search">` with debounce (300ms using `setTimeout`).
  - On change: `router.push` with updated query string using `useRouter` and `useSearchParams`.

  **Files to create:** `src/app/admin/(protected)/applications/page.tsx`, `src/components/AdminApplicationsFilter.tsx`

  **Verify:** `npm run typecheck` — no errors; page renders paginated table.

---

- [ ] 9. **Create the application detail/edit page (`src/app/admin/(protected)/applications/[reference]/page.tsx`) and its client form components.**

  Server component. Reads `params` (awaited):
  ```ts
  type Props = { params: Promise<{ reference: string }> };
  export default async function Page({ params }: Props) {
    const { reference } = await params;
    const detail = await adminGetApplicationDetail(reference);
    if (!detail) notFound();
    ...
  }
  ```

  Pass serialized data (ISO strings for dates, number for cents) to client components.

  **Sub-components to create (all `"use client"`):**

  **`src/components/admin/ApplicationEditForm.tsx`**:
  - Editable fields: all guardian info, child info, account info, verification status, participation tier.
  - "Save changes" button POSTs to `PUT /api/admin/applications/[reference]`.
  - Inline success/error message.
  - Uses `.usa-input`, `.usa-label`, `.usa-button--primary` classes.

  **`src/components/admin/ApplicationStatusPanel.tsx`**:
  - Shows current status with `<StatusBadge>`.
  - "Approve & advance" button: calls `POST /api/applications/[reference]` with `{ action: "advance" }` (the existing public endpoint). On success, refresh page with `router.refresh()`.
  - "Set status directly" form: `<select>` for status, `<textarea>` for notes, submit button calls `POST /api/admin/applications/[reference]/status`.
  - Both actions refresh the page after success using `router.refresh()`.

  **The server page** assembles these into sections:
  1. Page header (reference number + back link).
  2. `<ApplicationStatusPanel>` with current status props.
  3. `<ApplicationEditForm>` with serialized application fields.
  4. Deposit ledger table (server-rendered `<table className="usa-table">`).
  5. Verification documents table (server-rendered).
  6. Application events / audit trail (server-rendered list).

  **Files to create:**
  - `src/app/admin/(protected)/applications/[reference]/page.tsx`
  - `src/components/admin/ApplicationEditForm.tsx`
  - `src/components/admin/ApplicationStatusPanel.tsx`

  **Verify:** `npm run typecheck` — no errors; edit form submits and status panel can advance the pipeline.

---

- [ ] 10. **Create the inquiries inbox page (`src/app/admin/(protected)/inquiries/page.tsx`) and its client components.**

  Server component reads `searchParams` for `handled` filter.

  Calls `adminGetAllInquiries({ handled: searchParams.handled === 'true' ? true : searchParams.handled === 'false' ? false : undefined })`.

  Renders a table: Submitted, Topic, Name, Email, State, Reference, Preview (first 80 chars of message), Handled status.

  **`src/components/admin/InquiryRow.tsx`** — `"use client"`:
  - Renders a `<tr>` that is clickable to expand the full message (toggled by local state).
  - Contains a "Mark as handled" button (hidden if already handled) that POSTs to `/api/admin/inquiries/[id]/handle` and calls a passed `onHandled` callback or `router.refresh()`.

  Since individual row refresh is complex with server components, use a simpler pattern: render the table in a `<AdminInquiriesTable>` client component that receives the initial rows as a serialized prop and handles local state for expansion + marking handled, calling `router.refresh()` after mark-as-handled to re-fetch from server.

  **`src/components/admin/AdminInquiriesTable.tsx`** — `"use client"`:
  - Props: `rows` (serialized inquiry rows, `createdAt` as ISO string).
  - Local state: which row is expanded.
  - "Mark as handled" calls `fetch('/api/admin/inquiries/[id]/handle', { method: 'POST' })` then `router.refresh()`.

  Filter tabs (All / Unhandled) are rendered as plain server-side links with `?handled=false` / no param.

  **Files to create:**
  - `src/app/admin/(protected)/inquiries/page.tsx`
  - `src/components/admin/AdminInquiriesTable.tsx`

  **Verify:** `npm run typecheck` — no errors; mark-as-handled button updates the row.

---

- [ ] 11. **Create the newsletter signups page (`src/app/admin/(protected)/newsletter/page.tsx`).**

  Pure server component. Calls `adminGetNewsletterSignups()`. Renders a stat showing total count and a `<table className="usa-table">` with columns: Email, State, Signed Up.

  No client component needed — this page is read-only.

  **Files to create:** `src/app/admin/(protected)/newsletter/page.tsx`

  **Verify:** `npm run typecheck` — page compiles; table renders signup count.

---

- [ ] 12. **Final integration verification.**

  Run the full check suite and smoke-test the admin flow:

  ```bash
  npm run typecheck
  npm run build
  ```

  Manual smoke-test sequence:
  1. Visit `/admin` — should redirect to `/admin/login`.
  2. Submit wrong credentials — should show error.
  3. Submit correct credentials (`ADMIN_EMAIL` / `ADMIN_PASSWORD` from `.env`) — should redirect to `/admin` dashboard showing stat tiles and recent applications table.
  4. Click an application row → detail page loads with edit form and status panel.
  5. Click "Approve & advance" on a non-funded application — status should update and page refresh.
  6. Use "Set status directly" with notes — verify a new event appears in the audit trail.
  7. Edit a guardian field, save — verify the change persists on reload.
  8. Navigate to Inquiries — unhandled filter is default; mark one as handled; it disappears from unhandled view.
  9. Navigate to Newsletter — table shows signup rows.
  10. Click sign-out — redirects to `/admin/login`, subsequent `/admin` visit redirects back to login.

  **Verify:** `npm run build` succeeds with no TypeScript or Next.js errors.

---

## File inventory (new/modified)

| Action | Path |
|--------|------|
| MODIFY | `src/app/layout.tsx` |
| CREATE | `src/app/(public)/layout.tsx` |
| MOVE   | `src/app/page.tsx` → `src/app/(public)/page.tsx` |
| MOVE   | `src/app/about/` → `src/app/(public)/about/` |
| MOVE   | `src/app/apply/` → `src/app/(public)/apply/` |
| MOVE   | `src/app/contact/` → `src/app/(public)/contact/` |
| MOVE   | `src/app/dashboard/` → `src/app/(public)/dashboard/` |
| MOVE   | `src/app/deposit/` → `src/app/(public)/deposit/` |
| MOVE   | `src/app/eligibility/` → `src/app/(public)/eligibility/` |
| MOVE   | `src/app/faq/` → `src/app/(public)/faq/` |
| MOVE   | `src/app/how-it-works/` → `src/app/(public)/how-it-works/` |
| MOVE   | `src/app/login/` → `src/app/(public)/login/` |
| MOVE   | `src/app/program-data/` → `src/app/(public)/program-data/` |
| MOVE   | `src/app/resources/` → `src/app/(public)/resources/` |
| MOVE   | `src/app/search/` → `src/app/(public)/search/` |
| MOVE   | `src/app/signup/` → `src/app/(public)/signup/` |
| MOVE   | `src/app/states/` → `src/app/(public)/states/` |
| MOVE   | `src/app/status/` → `src/app/(public)/status/` |
| MOVE   | `src/app/verify/` → `src/app/(public)/verify/` |
| MODIFY | `src/lib/auth.ts` |
| MODIFY | `.env.example` |
| MODIFY | `src/lib/service.ts` |
| CREATE | `src/app/api/admin/stats/route.ts` |
| CREATE | `src/app/api/admin/applications/route.ts` |
| CREATE | `src/app/api/admin/applications/[reference]/route.ts` |
| CREATE | `src/app/api/admin/applications/[reference]/status/route.ts` |
| CREATE | `src/app/api/admin/inquiries/route.ts` |
| CREATE | `src/app/api/admin/inquiries/[id]/handle/route.ts` |
| CREATE | `src/app/api/admin/newsletter/route.ts` |
| CREATE | `src/app/api/admin/auth/login/route.ts` |
| CREATE | `src/app/api/admin/auth/logout/route.ts` |
| CREATE | `src/app/admin/layout.tsx` |
| CREATE | `src/app/admin/login/page.tsx` |
| CREATE | `src/app/admin/(protected)/layout.tsx` |
| CREATE | `src/app/admin/(protected)/page.tsx` |
| CREATE | `src/app/admin/(protected)/applications/page.tsx` |
| CREATE | `src/app/admin/(protected)/applications/[reference]/page.tsx` |
| CREATE | `src/app/admin/(protected)/inquiries/page.tsx` |
| CREATE | `src/app/admin/(protected)/newsletter/page.tsx` |
| CREATE | `src/components/AdminLoginForm.tsx` |
| CREATE | `src/components/AdminApplicationsFilter.tsx` |
| CREATE | `src/components/admin/ApplicationEditForm.tsx` |
| CREATE | `src/components/admin/ApplicationStatusPanel.tsx` |
| CREATE | `src/components/admin/AdminInquiriesTable.tsx` |
