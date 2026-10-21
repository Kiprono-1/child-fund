# Implementation Plan — Post-login Verification Flow & Guardian Dashboard

## Codebase findings

| File | Relevant state |
|---|---|
| `src/lib/auth.ts` | `getSessionGuardian()` returns `{ guardianId, email }` or `null`. Cookie name: `ctf_session`. |
| `src/lib/service.ts` | `createGuardianAccount` already catches pg error 23505 and returns `{ ok: false, duplicate: true }`. `getApplicationsByGuardianId` and `linkApplicationToGuardian` do **not** exist yet. |
| `src/app/api/auth/signup/route.ts` | Already has a double-catch for 23505 but `errors` is keyed to `email` — the UI gets field-level errors. The `AuthForm` checks `data.errors` before `data.error`, so this **will** render if the response status is 409. The bug: the outer `catch` re-throws to the final `catch (err)` which returns 500. Fixed by the existing inner try/catch — but the test scenario in the user messages shows that `NeonDbError` is thrown as a **cause** property, not a direct code on the error. The signup route's inner catch already handles `causeCode === '23505'`. This is effectively already fixed, but we should verify and also ensure `SESSION_SECRET` is set in `.env`. |
| `src/app/api/auth/login/route.ts` | Thin, correct. No changes needed. |
| `src/app/api/applications/route.ts` | Already reads `getSessionGuardian()` and passes `guardianAccountId` into `createApplication`. So **linking is already wired** — applications created while logged in already get `guardian_account_id` set. |
| `src/components/AuthForm.tsx` | Always does `router.push("/apply")` on success — needs to call a new `/api/guardian/applications` first to decide the destination. |
| `src/components/SiteHeader.tsx` | `me` state already fetched. "My Dashboard" link needed when `me !== null`. |
| `src/components/RegistrationWizard.tsx` | Confirmation screen renders inline; task says to redirect to `/dashboard` after submit instead. |
| `src/app/verify/page.tsx` | Fully static. Needs a server-side session check to show a pre-filled reference banner for logged-in guardians. |
| `src/db/schema.ts` | `guardianAccountId` column already defined with FK to `guardian_accounts`. |

---

## Plan

- [ ] 1. Verify/fix the `SESSION_SECRET` missing env and the duplicate-email 500 error.

  The user logs show `SESSION_SECRET is not set` causing a 500 on signup. The `.env` file needs
  `SESSION_SECRET=<random string>`. The signup route already has the correct duplicate-email
  handling logic, but confirm it surfaces as a 409 with `{ ok: false, errors: { email: "…" } }`.
  No code changes needed for the duplicate-email fix — the service layer already returns
  `{ ok: false, duplicate: true }` and the signup route maps that to 409 with a field error.
  The session-secret issue is an environment concern, but add a clear startup check comment.

  Actually: the user's third log shows the error now IS the NeonDbError duplicate-key (not the
  missing secret), so `SESSION_SECRET` was added between messages 1 and 3. The duplicate-email
  error IS already caught in `route.ts` via the inner try/catch (both `code === '23505'` and
  `causeCode === '23505'` are handled). The real issue is that **the Neon driver wraps the error
  differently** — check whether the existing catch covers it. Because the user says "it now throws
  a 500", add a broader fallback: inspect the serialized error string for '23505' as a last resort.

  Files to modify:
  - `src/app/api/auth/signup/route.ts` — add a string-based '23505' fallback in the inner catch
    to handle any NeonDbError nesting depth.

  Verify: `npm run typecheck` passes (no new type errors).

- [ ] 2. Add `getApplicationsByGuardianId` to `src/lib/service.ts`.

  New exported async function. Calls `ensureSeedData()` first (the single-flight init pattern
  every DB accessor must follow). Returns an array of applications where
  `guardian_account_id = guardianAccountId`, ordered by `submitted_at DESC`. Return only the
  columns needed for routing and the dashboard: `referenceNumber`, `status`, `childFirstName`,
  `childLastName`, `childDob`, `parentState`, `submittedAt`.

  Rationale: keeping the query minimal avoids sending sensitive fields over the wire to the client
  through the API endpoint; the full detail is already available via `getApplicationDetail`.

  Files to modify:
  - `src/lib/service.ts` — add the function after `getGuardianAccountById`.

  Verify: `npm run typecheck` — no errors.

- [ ] 3. Add `linkApplicationToGuardian` to `src/lib/service.ts`.

  New exported async function that accepts `(reference: string, guardianAccountId: number)`.
  Updates `applications.guardian_account_id` where `reference_number = reference` and
  `guardian_account_id IS NULL` (do not overwrite an existing owner). Returns
  `{ ok: true } | { ok: false, error: string }`.

  This function covers the edge case where a guardian submitted an application before logging in,
  then logs in later. The `/apply` page can call it post-submit if the user is already authenticated.

  Files to modify:
  - `src/lib/service.ts` — add after `getApplicationsByGuardianId`.

  Verify: `npm run typecheck` — no errors.

- [ ] 4. Add `GET /api/guardian/applications` route.

  New file at `src/app/api/guardian/applications/route.ts`.
  - `export const dynamic = "force-dynamic"`
  - Calls `getSessionGuardian()`. Returns 401 `{ ok: false, error: "Not authenticated." }` if null.
  - Calls `getApplicationsByGuardianId(guardian.guardianId)`.
  - Returns `{ ok: true, applications: [...] }`.

  This is the thin route pattern: parse → call service → shape response.

  Files to create:
  - `src/app/api/guardian/applications/route.ts`

  Verify: `npm run typecheck` — no errors.

- [ ] 5. Update `AuthForm.tsx` — smart post-login redirect.

  After a successful login or signup response, before navigating, fetch
  `GET /api/guardian/applications`. Determine the destination:

  - Fetch throws or returns non-ok → fall back to `/apply` (safe default).
  - `applications` array is empty → `/apply`.
  - First application's `status` is `approved` or `funded` → `/dashboard`.
  - First application's `status` is `submitted`, `under_review`, or `verification_required` →
    `/verify` (the task says `/verify` or `/status`; use `/verify` for
    `verification_required` and `/status` for `submitted` / `under_review` to match the
    natural next action for each state).

  Decision: `verification_required` → `/verify`; `submitted` | `under_review` → `/status`;
  `approved` | `funded` → `/dashboard`. Unknown statuses fall back to `/apply`.

  Files to modify:
  - `src/components/AuthForm.tsx`

  Verify: `npm run typecheck` — no errors.

- [ ] 6. Update `RegistrationWizard.tsx` — redirect to `/dashboard` after submit.

  Currently the `submit()` function calls `setResult(...)` which renders a confirmation screen
  inline. Change: after a successful API response, also call `router.push('/dashboard')`.
  Keep `setResult` so users who somehow land back on `/apply` don't see a blank wizard, but add
  the redirect as the primary post-submit action.

  Rationale: the task says "redirect to /dashboard instead of showing just a reference number".
  The cleanest approach is to redirect immediately; the confirmation info will be visible on the
  dashboard. However, to avoid losing the reference number in case of a redirect timing issue,
  also keep the `setResult` state — it will be visible for the brief moment before navigation.

  Files to modify:
  - `src/components/RegistrationWizard.tsx`

  Verify: `npm run typecheck` — no errors.

- [ ] 7. Build the guardian dashboard page at `src/app/dashboard/page.tsx`.

  Server component, `force-dynamic`. Auth guard first:
  - `await getSessionGuardian()` → `null` → `redirect('/login')`.
  - `await getApplicationsByGuardianId(guardian.guardianId)` → empty → `redirect('/apply')`.
  - Take the first application (most recently submitted).
  - Call `getApplicationDetail(application.referenceNumber)` to get deposits, events, and balances.

  Layout (server-rendered, no client component needed):
  - `PageHero` with breadcrumb `Home › My Dashboard`, eyebrow "Guardian account", title
    "Your Child Trust Fund account" + child's name.
  - **Account summary row**: four `StatTile` components showing:
    - Current balance (posted deposits total), formatted with `formatUSD`.
    - Scheduled / pending deposits.
    - Federal deposits (seed + supplements combined).
    - Guardian contributions total.
  - **StatusBadge** + reference number + cohort tier label.
  - **Deposit ledger table** (`usa-table`) — columns: Date, Type, Description, Amount, Status.
    Date from `postedAt ?? scheduledFor ?? createdAt`. Type label from a local map
    (`federal_seed` → "Federal seed", etc.). Amount formatted with `formatUSD`. Status as
    a coloured pill (`usa-tag`).
  - **Quick actions card** — three `<Link>` buttons:
    - "Make a contribution" → `/deposit?ref=<reference>`
    - "Upload documents" → `/status?ref=<reference>&last=<childLastName>`
    - "View full case" → `/status?ref=<reference>&last=<childLastName>`
  - **Recent events** — last 5 events from the audit trail, in a simple `<ul>`.
  - If the guardian has multiple applications (multiple children), show a child-switcher:
    a `<ul>` of reference links at the top with child name + status badge.

  Use existing CSS classes: `usa-card`, `usa-table`, `usa-tag`, `StatusBadge`, `StatTile`,
  `PageHero`, `SectionHeading`, `Callout`, `Icon`. Do not create new component files for
  this page — compose it from the existing primitives.

  Import `formatUSD` from `@/lib/program`. Import `getSessionGuardian` from `@/lib/auth`.
  Import `getApplicationsByGuardianId`, `getApplicationDetail` from `@/lib/service`.

  Files to create:
  - `src/app/dashboard/page.tsx`

  Verify: `npm run typecheck` — no errors.

- [ ] 8. Update `src/app/verify/page.tsx` — show pre-filled reference for logged-in guardians.

  The page is currently entirely static. Add a server-side block at the top of the page
  component that:
  - Calls `getSessionGuardian()`.
  - If a session exists, calls `getApplicationsByGuardianId(guardian.guardianId)`.
  - If there is at least one application, renders a `Callout` (tone "success") at the top of the
    page body showing: "Your application reference is **CTF-XXXX-XXXXXX**. After you verify,
    you can track progress on your dashboard." with a Link to `/dashboard`.
  - If no session, renders nothing extra (the page stays as-is for unauthenticated visitors).

  This satisfies "logged-in guardians see their reference number pre-filled or displayed".
  The "proceed to /status" action is already covered by the existing "Upload documents now"
  CTA which links to `/status`.

  Files to modify:
  - `src/app/verify/page.tsx`

  Verify: `npm run typecheck` — no errors.

- [ ] 9. Update `SiteHeader.tsx` — add "My Dashboard" nav link for authenticated users.

  In the desktop nav `<div className="ml-auto ...">` block, when `me !== null`, add a
  "My Dashboard" link between the "Signed in as…" span and the "Sign out" button.
  In the mobile nav footer block, add the same link. Use the `usa-button--outline` style to
  distinguish it from the "Register a child now" accent button.

  Files to modify:
  - `src/components/SiteHeader.tsx`

  Verify: `npm run typecheck` — no errors.

- [ ] 10. Add the dashboard page to site navigation and search index.

  - `SiteHeader.tsx` — the "My Dashboard" link added in step 9 is per-user, not part of the
    static `NAV` array, so no change to `NAV` is needed.
  - `src/app/search/page.tsx` — add the dashboard to the `PAGES` array so site search can
    surface it. Since the dashboard is auth-gated, mark its description accordingly.
  - `SiteFooter.tsx` — no change needed (dashboard is user-specific, not a public page).

  Files to modify:
  - `src/app/search/page.tsx`

  Verify: `npm run typecheck` — no errors.

- [ ] 11. Run full typecheck and build.

  Run `npm run typecheck` and `npm run build` in that order. Fix any type errors before
  considering the work done.

  Verify:
  - `npm run typecheck` — exits 0.
  - `npm run build` — exits 0 (no build-time errors).

---

## Notes and assumptions

1. **`SESSION_SECRET` env var**: The first user log shows it missing. This is a deployment
   concern, not a code defect. The code already throws at `getSecret()` and the signup route's
   outer catch returns a 500. Add a note in `.env.example` if it is not already there. The plan
   does not add code to auto-generate a secret — that would require writing to the filesystem
   at runtime, which is outside scope.

2. **Multiple children per guardian**: `getApplicationsByGuardianId` returns an array. The
   dashboard shows a switcher if `applications.length > 1`; otherwise it shows the single child
   directly without extra chrome.

3. **Demo seed data**: The 120 seeded children have `guardian_account_id = NULL`. The dashboard
   query filters by `guardian_account_id`, so demo rows will never appear on any guardian's
   dashboard. This is the correct behaviour per the constraint.

4. **`linkApplicationToGuardian`** is implemented but not called automatically. It is available
   for future use (e.g., a "claim this application" flow), but is not wired into any route in
   this plan because the `/api/applications` POST already sets `guardian_account_id` at creation
   time when a session exists.

5. **`/verify` page is a server component** — `getSessionGuardian()` reads Next.js `cookies()`
   which is valid in server components. The extra query adds ~1 DB round-trip on page load,
   which is acceptable for a page that already has no DB queries.

6. **Deposit type labels** used in the dashboard table:
   - `federal_seed` → "Federal seed deposit"
   - `state_match` → "State match"
   - `federal_supplement` → "Federal birthday supplement"
   - `parent_contribution` → "Guardian contribution"
   - `earnings` → "Earnings"

7. **Money formatting**: `formatUSD` from `src/lib/program.ts` is used for all displayed amounts.
   Raw amounts in DB are integer cents; divide by 100 is handled inside `formatUSD`.
