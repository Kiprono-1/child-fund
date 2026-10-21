# Admin Portal

The change adds a complete admin portal behind `/admin`, including session auth,
eight API route groups, seven service functions, a (protected) layout with
sidebar, and five admin pages. The approach uses a route-group restructure
(`(public)` / `admin`) to isolate the admin segment from the public site
header/footer, and an HMAC-SHA-256 signed cookie (`ctf_admin_session`) sharing
the same `SESSION_SECRET` as the guardian session. Watch for: the `(protected)`
layout already calls `getAdminSession` and redirects on failure, yet every
protected page also calls `requireAdminSession` — this double-check is redundant
and causes two cookie reads per request but is not a security hole. The
`adminGetAllApplications` return type exposes the full `ApplicationRow` (includes
SSN-last-4, routing number, account digits) rather than a projection, which is
intentional for an admin view but worth documenting.

**Verdict**: APPROVED

---

## High-level view

The route-group layout split is implemented correctly. The root `layout.tsx` is
stripped to a bare `<html><body>` shell; `(public)/layout.tsx` carries
`SiteHeader`/`SiteFooter`/`GovBanner`; the `admin/` segment sits outside the
public group entirely. No public chrome reaches `/admin/*`.

Every admin API route calls `getAdminSession()` as its first act and returns
`{ ok: false, error: "Unauthorized." }` with HTTP 401 on failure. The `(protected)`
layout adds a second redirect-based guard at the page boundary. Plain credential
comparison in the login route is explicitly called out in the plan as intentional
for this prototype.

All seven service functions plan-required are present. `adminGetAllApplications`
returns a `pages` field in addition to `rows` and `total`, which the applications
list page correctly destructures. The `adminGetStats` function splits the money
aggregate into a second query because `deposits` and `applications` live in
separate tables.

The admin pages use only existing `usa-*`/`gov-*` CSS classes. No new CSS
dependencies are introduced. All five pages (`page.tsx`, `applications/page.tsx`,
`applications/[reference]/page.tsx`, `inquiries/page.tsx`, `newsletter/page.tsx`)
carry `export const dynamic = "force-dynamic"`.

---

<details>
<summary>Issues (3)</summary>

1. **Double auth check per protected page** — `(protected)/layout.tsx` already calls `getAdminSession()` and redirects; each page also calls `requireAdminSession()` which calls `getAdminSession()` a second time, costing an extra cookie read and HMAC verification per request. Remove `requireAdminSession()` calls from the individual pages since the layout guard is authoritative.

2. **`adminGetAllApplications` returns full `ApplicationRow` to server pages that render it into JSX served to the browser** — the full row includes `parentSsnLast4`, `childSsnLast4`, `routingNumber`, `accountLast4`. These fields are server-rendered and not sent to the client as JSON, so there is no immediate exposure, but the detail page serializes `initialFields` and passes it to `ApplicationEditForm` (a client component). The `initialFields` object does not include SSN/routing fields, so the client boundary is safe. Confirmed: no sensitive fields leak to the browser.

3. **`AdminInquiriesTable` silently ignores a failed mark-as-handled response** — the `markHandled` function in `AdminInquiriesTable.tsx` calls `fetch(…)` but does not check `res.ok` or parse the response body. If the server returns a 404 or 500, `router.refresh()` is still called, giving the admin no indication that the action failed. Add a check: `const data = await res.json(); if (!data.ok) { /* show error */ return; }`.

</details>

---

<details>
<summary>Details</summary>

### Auth cookie signing and session verification

`createAdminSessionToken` follows the same HMAC-SHA-256 + base64url pattern as the
guardian token. The admin token payload is `{ admin: true, exp }` rather than
containing a user ID, which is appropriate for a single-admin prototype.
`readAdminSessionToken` uses `timingSafeEqual` for sig comparison, matching the
guardian implementation. Cookie options are `httpOnly: true, sameSite: "lax",
secure: production-only`, consistent with the guardian cookie. The 8-hour `maxAge`
is hardcoded in both the token creation and the cookie set call in the login route.

`getAdminSession` swallows all errors (including missing-secret) and returns
`false`, consistent with the guardian helper's degradation behavior.

### Double session check in protected pages

`(protected)/layout.tsx` calls `getAdminSession()` first and redirects to
`/admin/login` if false. Each of the five protected pages then also calls
`await requireAdminSession()` which performs a second `getAdminSession()` call —
another cookie read and HMAC verification. The double check is not a security
gap (the layout guard always fires first in App Router), but it is wasteful and
the per-page check can be dropped entirely.

### API route auth pattern

All eight route groups carry `export const dynamic = "force-dynamic"` and begin
with the `getAdminSession` → 401 guard. The logout route does **not** gate on
session — intentional, since clearing a cookie on an expired or invalid session
is safe and expected. Dynamic `[reference]` and `[id]` routes use `type Ctx = { params: Promise<… }` and `await ctx.params` before accessing fields — correct for
Next.js 16.

The applications `PUT` handler calls `Parameters<typeof adminUpdateApplication>[1]`
for its `fields` type, which is a clean way to keep the type in sync with the
service signature without duplicating it.

### Service functions

All seven plan-required functions are present and follow the `ensureSeedData()`
first pattern. The `adminGetStats` money aggregate uses `::bigint` cast
(Postgres `sum` returns `bigint`) and wraps the result in `Number(…)`, matching
the existing pattern in `getProgramStats`. `adminSetApplicationStatus` accepts the
full `ApplicationStatus` union from `schema.ts`, and the status route validates
against a locally defined `VALID_STATUSES` array rather than programmatically
deriving it — these two sources can drift if the schema adds a new status value
in the future. Confirmed they currently match.

`adminMarkInquiryHandled` checks `result.rowCount ?? 0 === 0` to detect a
missing row. `node-postgres` returns `rowCount` as a number on `UPDATE`
statements so this is correct.

### Date serialization boundary

The applications list and dashboard pages pass `row.submittedAt` (a `Date`
object) directly into server-rendered JSX (`new Date(row.submittedAt).toLocaleDateString(…)`).
No `Date` objects are passed as props to client components here. The inquiries
page serializes `createdAt` to ISO string before passing to `AdminInquiriesTable`.
The detail page passes only string fields in `initialFields` to `ApplicationEditForm`.
The boundary is clean.

### AdminInquiriesTable error handling gap

`markHandled` fires the fetch and calls `router.refresh()` unconditionally in the
`finally` block. A server 404 (inquiry already handled elsewhere) or 500 silently
triggers a page refresh with no error message to the admin. This is a UX gap
rather than a security issue — confirmed by reading the component source
(lines 23-32 of `AdminInquiriesTable.tsx`).

### CSS and layout isolation

No `SiteHeader`, `SiteFooter`, or `GovBanner` imports exist anywhere under
`src/app/admin/`. All admin UI uses `usa-*`/`gov-*` utility classes from
`globals.css` (`usa-card`, `usa-table`, `usa-button`, `usa-input`, `usa-label`,
`usa-tag`, `bg-gov-navy`, `text-gov-primary`, etc.). No new CSS files or
dependencies are introduced.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|------|--------|
| `src/app/layout.tsx` | Stripped to bare `<html><body>` shell |
| `src/app/(public)/layout.tsx` | Created — carries SiteHeader/SiteFooter/GovBanner |
| `src/lib/auth.ts` | Added `ADMIN_SESSION_COOKIE`, `createAdminSessionToken`, `readAdminSessionToken`, `getAdminSession` |
| `src/lib/service.ts` | Added all 8 admin service functions (`adminGetStats` + 7 plan-required) |
| `src/app/admin/layout.tsx` | Neutral shell, no auth check |
| `src/app/admin/login/page.tsx` | Public login page, redirects to `/admin` if already authed |
| `src/app/admin/(protected)/layout.tsx` | Auth guard + sidebar nav |
| `src/app/admin/(protected)/page.tsx` | Dashboard with stat tiles + recent applications table |
| `src/app/admin/(protected)/applications/page.tsx` | Paginated applications list with filter |
| `src/app/admin/(protected)/applications/[reference]/page.tsx` | Full detail/edit/status page |
| `src/app/admin/(protected)/inquiries/page.tsx` | Inquiries inbox with filter tabs |
| `src/app/admin/(protected)/newsletter/page.tsx` | Newsletter signups read-only table |
| `src/app/admin/_adminAuth.ts` | Helper wrapping `getAdminSession` + redirect |
| `src/app/api/admin/stats/route.ts` | GET — admin stats |
| `src/app/api/admin/applications/route.ts` | GET — paginated applications list |
| `src/app/api/admin/applications/[reference]/route.ts` | GET detail / PUT update |
| `src/app/api/admin/applications/[reference]/status/route.ts` | POST — direct status override |
| `src/app/api/admin/inquiries/route.ts` | GET — inquiries list |
| `src/app/api/admin/inquiries/[id]/handle/route.ts` | POST — mark handled |
| `src/app/api/admin/newsletter/route.ts` | GET — newsletter signups |
| `src/app/api/admin/auth/login/route.ts` | POST — plain credential check, issues cookie |
| `src/app/api/admin/auth/logout/route.ts` | POST — clears cookie |
| `src/components/AdminLoginForm.tsx` | Client login form |
| `src/components/admin/ApplicationsFilter.tsx` | Client filter/search for applications list |
| `src/components/admin/ApplicationEditForm.tsx` | Client edit form for application fields |
| `src/components/admin/ApplicationStatusPanel.tsx` | Client status advance + direct override |
| `src/components/admin/AdminInquiriesTable.tsx` | Client expandable inquiries table |

Full diff: `git diff main` from project root.

</details>
