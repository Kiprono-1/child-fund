# Post-login verification flow and guardian dashboard

After a working auth system was wired in a prior pass, this change builds the guardian-facing experience on top of it: a post-login routing layer that directs guardians to the right page based on their application status, a dedicated dashboard page, a reference-number banner on `/verify`, and a "My Dashboard" link in the header. It also hardens the duplicate-email error path that was surfacing as a 500. The approach is server-side auth everywhere, client-side smart routing on the auth form, and a fully server-rendered dashboard that never passes Drizzle row types to client components.

Watch for: **(confirmed)** `getApplicationDetail` in `dashboard/page.tsx` does not auth-check the reference number against the guardian's account — any guardian who somehow has an application's reference number exposed via a data-structure quirk could access another child's deposit data through the dashboard. The current code path avoids this in practice (references come from the guardian's own `getApplicationsByGuardianId` result), but the absence of a `guardian_account_id` check inside `getApplicationDetail` itself is worth noting. **(confirmed)** The duplicate-email fix in `signup/route.ts` is covered three ways (`code === '23505'`, cause traversal, string fallback), but the fix in `service.ts` only checks `code` directly and `errStr` as a final fallback — the cause-traversal path lives in the route, not the service. This is fine for the Neon driver path actually observed in the logs, but the two layers use slightly different strategies.

**Verdict**: APPROVED

---

## High-level view

`getApplicationsByGuardianId` filters by `guardian_account_id` via Drizzle's typesafe `eq`, and `linkApplicationToGuardian` guards against overwrite with an `IS NULL` pre-check. Both call `ensureSeedData()` first, which is the required single-flight init pattern. The service layer is correct.

The `/api/guardian/applications` route checks session before issuing any query and serializes `Date` objects before returning JSON. It can only return data for the authenticated guardian's own applications — cross-guardian leakage is not possible at this endpoint.

The dashboard auth gate is a server-side `redirect('/login')` before any data is fetched. The `getApplicationDetail` call on line 44 receives a reference number taken from the guardian's own `getApplicationsByGuardianId` result, so in the normal flow it cannot return another guardian's data. However, `getApplicationDetail` itself accepts any reference number and returns full deposit data — no guardian-id cross-check happens inside that function. This is structurally sound under the current call path but would become a risk if `getApplicationDetail` were ever called in a context where the reference source is not already trust-bounded.

All money aggregates in the dashboard compute from integer-cent columns. `formatUSD` is applied at render time. No float arithmetic was introduced. Dates from Drizzle are serialized to ISO strings before JSX renders them, avoiding React's "objects are not valid React children" error that would otherwise crash the page.

The `RegistrationWizard` does not send `guardianAccountId` in its POST body — it does not need to. The `/api/applications` route reads `getSessionGuardian()` server-side and injects `guardian?.guardianId` into the payload, which is the architecturally correct way to associate the session owner. A client component should never be trusted to supply its own account id.

The post-login redirect logic in `AuthForm` handles five status branches. The routing for `submitted` and `under_review` pre-populates the `/status` URL with `ref` and `last`, which is a good user-experience touch. The fallback for all other statuses (empty array, fetch failure, unknown status) is `/apply`, which is safe.

The duplicate-email error was previously surfacing as a 500 because Neon wraps the pg `23505` error in a `cause` property. The fix adds string-fallback detection in both `service.ts` and `signup/route.ts`, using three detection strategies at the route layer. The `service.ts` fix added the string fallback but not the cause-traversal, while the route's inner catch does full cause-traversal. Given that `createGuardianAccount` now catches and returns `{ ok: false, duplicate: true }` before throwing, the route's inner catch is a redundant safety net that should never fire in the normal path — both layers together provide solid coverage.

---

<details>
<summary>Issues (2)</summary>

1. **`getApplicationDetail` not auth-scoped** — The function accepts any reference number and returns full deposits, documents, and events. In `dashboard/page.tsx` the reference is taken from the guardian's own query so the risk is not immediately exploitable, but the function has no guardian-id guard. If it is ever called from a route that accepts a user-supplied reference number (e.g., a future `/api/guardian/detail/[ref]` endpoint), it would return another guardian's data. Add an optional `guardianAccountId` check parameter to `getApplicationDetail` and pass it from the dashboard. **(confirmed)**

2. **`verified` and `rejected` statuses absent from routing table in `AuthForm`** — The post-login routing handles `approved`, `funded`, `verification_required`, `submitted`, `under_review`, and falls back to `/apply` for anything else. The `ApplicationStatus` type also includes `rejected`. A rejected application will fall through to `/apply`, silently sending the guardian to start a new registration without ever seeing the rejection. Consider routing `rejected` to `/status` so the guardian sees the case history. **(likely)** — `rejected` is defined in the type and seeded but never set by `advanceApplication`, so in the current codebase this branch is unreachable. Still worth handling defensively.

</details>

<details>
<summary>Details</summary>

### Service-layer additions

`getApplicationsByGuardianId` selects a minimal column set and orders by `submittedAt DESC`. The seed rows have `guardian_account_id = NULL`, so they are invisible to every guardian query by design — demo data does not surface on any guardian dashboard.

`linkApplicationToGuardian` pre-checks that `currentOwner` is `null` before updating, preventing a second guardian from claiming an already-owned application. It is wired but not called from any route in this iteration, held in reserve for a future "claim this application" flow.

### Auth gate and cross-guardian isolation

`dashboard/page.tsx` is a server component with `force-dynamic`. The gate is:

```
getSessionGuardian() → null → redirect('/login')
getApplicationsByGuardianId(guardian.guardianId) → empty → redirect('/apply')
getApplicationDetail(appRows[0].referenceNumber)   ← no guardian id check here
```

The third call cannot leak data today because `appRows[0].referenceNumber` came from a query already filtered by `guardian_account_id`. If that function signature ever changes to accept a user-supplied reference, the isolation guarantee breaks silently.

### Duplicate-email error path

The third dev-server log in the original user messages shows a raw `NeonDbError` reaching the outer catch as a 500. The fix adds three detection strategies at the route layer: direct `code === '23505'`, cause traversal, and `errStr` string search. In `service.ts`, `createGuardianAccount` now catches `code` directly plus the `errStr` fallback, but the cause traversal is not present in the service (it is only in the route's redundant inner catch). This is fine — the service's catch and the route's inner catch together form a multi-layer fence, and the `duplicate` sentinel path short-circuits before any throw reaches the route's outer catch.

### Money handling

All balance aggregates (`balanceCents`, `scheduledCents`, `federalCents`, `stateCents`, `parentCents`) reduce over integer `amountCents` columns with integer addition only. `formatUSD` is called at every render site. The fourth `StatTile` groups `stateCents + parentCents` with a single integer addition — no float introduced anywhere.

### Date serialization in the dashboard

`serializedDeps` maps each deposit's `postedAt`, `scheduledFor`, and `createdAt` through `instanceof Date ? toISOString() : value`, and the same pattern applies to `recentEvents`. All Date instances stay server-side; JSX receives plain strings.

</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `src/lib/service.ts` | Added `getApplicationsByGuardianId`, `linkApplicationToGuardian`; added string-fallback 23505 detection in `createGuardianAccount` |
| `src/app/api/guardian/applications/route.ts` | New file — auth-gated GET endpoint returning the guardian's applications |
| `src/components/AuthForm.tsx` | Replaced hard `router.push('/apply')` with five-branch status-based routing via `/api/guardian/applications` |
| `src/app/dashboard/page.tsx` | New file — server component dashboard with balance tiles, deposit ledger, quick actions, recent events |
| `src/app/api/auth/me/route.ts` | Now returns `id` field on the guardian object via `getGuardianAccountById` |
| `src/app/verify/page.tsx` | Added server-side session check and reference-number banner for logged-in guardians |
| `src/components/SiteHeader.tsx` | Added "My Dashboard" link in both desktop and mobile menus when `me !== null` |
| `src/app/api/auth/signup/route.ts` | Added cause-traversal and string-fallback 23505 detection; now returns 409 with field-level email error |
| `src/components/RegistrationWizard.tsx` | Added `router.push('/dashboard')` after successful submit; confirmation screen also links to `/dashboard` |

Full diff is available in the project workspace at `c:\Users\kipro\Downloads\child-trust-fund-platform (1)`.

</details>
