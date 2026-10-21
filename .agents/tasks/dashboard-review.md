# Guardian dashboard — `src/app/(public)/dashboard/page.tsx`

The dashboard is a new server-component page that lets a logged-in guardian see their child's trust-fund balance, deposit history, pipeline status, and account details. Authentication gate, multi-child switching, Date serialisation, and responsive layout are all present. The page calls two service functions and builds all aggregates server-side before rendering.

**Watch for:** (1) `STATUS_META` is imported but never used — confirmed dead import. (2) `getApplicationDetail` skips `ensureSeedData()`, which could race the cold-start schema bootstrap on a fresh database. (3) The verification status dot relies on colour alone to convey state. (4) `earnings` deposits land in neither the "Your Contributions" nor "Gov't Funding" tile, creating a silent balance discrepancy.

**Verdict**: NEEDS_CHANGES

---

## High-level view

Auth gating is correct — `getSessionGuardian()` runs first; the page redirects to `/login` on null and to `/apply` when the guardian has no applications. Both redirects are confirmed.

Multi-child switching delegates navigation to `DashboardChildSwitcher`, a `"use client"` component that pushes `?child=<referenceNumber>` into the URL. The parent page reads `searchParams` (correctly awaited via `await searchParams`), finds the matching row, and falls back to the first child, covering the missing-param case. Date objects from Drizzle rows are serialised to ISO strings before being passed to any JSX — no raw `Date` objects escape to the client.

The four balance tiles split deposits into posted vs pending and parent vs government correctly, except `earnings` deposits (a fifth `DepositType`) are counted in the posted total for the balance tile but are silently excluded from both the "Your Contributions" and "Gov't Funding" breakdown tiles. On a mature account with compounding earnings this will make the two sub-tiles sum to less than the main balance tile.

The pipeline stepper correctly maps five named statuses. Statuses outside that set (`rejected`) hit `findIndex` returning `-1`, which the `effectiveIndex` fallback clamps to `0` ("Submitted"), so a rejected application renders as if it is still at step 1 with no visible indication of rejection. The `StatusBadge` in the hero does show the raw status, but the stepper gives a misleading picture.

<details>
<summary>Issues (5)</summary>

1. **Unused import `STATUS_META`** — `STATUS_META` is imported from `@/lib/program` but never referenced in the page. Remove it to keep the import surface clean and avoid false signals to future readers.

2. **`earnings` deposit type orphaned from balance tiles** — `govDeps` only includes `federal_seed`, `state_match`, and `federal_supplement`. `earnings` is excluded, so the two breakdown tiles will not sum to the main balance on accounts that have earned any return. Either add `earnings` to `govDeps` (or a separate "Earnings" tile), or document the intentional exclusion.

3. **`getApplicationDetail` skips `ensureSeedData()`** — `getApplicationsByGuardianId` calls `await ensureSeedData()` before querying, but `getApplicationDetail` goes straight to `db.select()`. On a cold-start with an empty database, `getApplicationsByGuardianId` triggers schema creation and a redirect before `getApplicationDetail` is ever reached, so this is safe in practice. It is however fragile: any future code path that calls `getApplicationDetail` without first going through one of the seeded functions will hit a missing-table error. Add an `ensureSeedData()` call inside `getApplicationDetail` for defensive consistency.

4. **Rejected pipeline status renders as step 1** — `PIPELINE_STEPS` has no `rejected` entry. `findIndex` returns `-1`, `effectiveIndex` becomes `0`, and the stepper shows the account as "Submitted" with no visual difference from a brand-new application. A guardian whose account has been rejected sees a misleading pipeline. Add a `rejected` step or guard the render with a separate branch that shows a rejection callout instead of the stepper.

5. **Verification dot uses colour as sole state indicator** — The `verificationDotClass` assigns green, gold, or gray to a `<span aria-hidden="true">` dot, with the label text alongside. The label is separate text, not part of the dot element, so the combination is fine for sighted users. However, the dot itself carries `aria-hidden` with no role or other structure — the label text immediately after is the accessible name, which is correct. The real gap is contrast: the "not started" dot (`bg-gov-base-light`, `#dfe1e2`) on a white card background has a contrast ratio of approximately 1.3:1, which is below the WCAG 1.4.11 non-text contrast threshold of 3:1. Switch the neutral dot to `bg-gov-base` (`#71767a`) or use a border to meet contrast requirements.

</details>

<details>
<summary>Details</summary>

### `earnings` deposit type excluded from breakdown tiles

The balance aggregates split `postedDeps` into `parentDeps` (only `parent_contribution`) and `govDeps` (`federal_seed | state_match | federal_supplement`). `earnings` — the fifth `DepositType` in the schema — falls into neither bucket. The main "Current Balance" tile correctly sums all posted deposits including earnings, but the "Your Contributions" and "Gov't Funding" tiles together will undercount by the earnings total. The discrepancy is zero today for most demo accounts but will grow as `earnings`-type rows are added.

```
balanceCents  = sum(postedDeps)                    // includes earnings
parentCents   = sum(parentDeps)                    // only parent_contribution
govCents      = sum(govDeps)                       // only seed + match + supplement
// parentCents + govCents < balanceCents when earnings exist
```

### `getApplicationDetail` and schema bootstrapping

`getApplicationsByGuardianId` calls `ensureSeedData()` before any SQL, which triggers the single-flight DDL + seed on cold start. `getApplicationDetail` does not. The current call order in the dashboard (guard → `getApplicationsByGuardianId` first, redirect if empty, then `getApplicationDetail`) means `ensureSeedData` always runs before `getApplicationDetail` on this page. The issue is at the service layer: the function's contract does not guarantee schema existence, unlike every other public-facing service function. This becomes a real bug if `getApplicationDetail` is ever called from a new route that doesn't first go through a seeded function.

### Pipeline stepper and rejected status

```
PIPELINE_STEPS = [submitted, under_review, verification_required, approved, funded]
```

`rejected` is a valid `ApplicationStatus` in the schema but is not in the stepper array. The clamping behaviour (`effectiveIndex = 0` when `findIndex` returns `-1`) renders step 1 as active. The hero shows the raw `StatusBadge` which will display "rejected" (or however `StatusBadge` renders it), but the stepper contradicts it. A guardian reading the page would see "Submitted — Current" in the pipeline alongside a "rejected" badge in the hero.

### Server/client boundary

All `Date` fields are defensively converted before the `serializedDeps` array is built:

```ts
postedAt: d.postedAt instanceof Date ? d.postedAt.toISOString() : (d.postedAt ?? null),
```

`DashboardChildSwitcher` receives only `{ referenceNumber, childFirstName, childLastName, status, selected }` — all plain strings and a boolean. `CopyReferenceButton` receives a single string. No Drizzle row objects or `Date` values reach client components.

### Mobile grid at 375 px

The four balance tiles use `grid-cols-2` at the base breakpoint, upgrading to `lg:grid-cols-4`. At 375 px each tile is `(375 - 32px padding - 16px gap) / 2 ≈ 163 px` wide. The tile content — an emoji, a `font-serif text-3xl` amount, a label, and a hint — will reflow comfortably at that width with no overflow risk. The two-column body uses `lg:grid-cols-[1fr_340px]`; below `lg` it is a single column, so the 340 px sidebar column does not constrain the viewport.

The deposit table is hidden on mobile (`hidden md:block`) and replaced with a card list (`space-y-3 md:hidden`). Both render independently from the same `serializedDeps` array.

### Heading hierarchy

The page `<h1>` is the child's name in the hero. All card section titles use `<h2>`. There is no `<h3>` usage and no heading skips — the hierarchy is valid.

### TypeScript

No `any` escape hatches are present. The `getApplicationDetail` return type is `Promise<ApplicationDetail | null | { error: string }>`, and the page guards with `hasDetail = detail !== null && !("error" in detail)` before accessing any fields. The `app` variable is typed correctly as `ApplicationDetail["application"] | null`. No implicit `any` casts or type assertions found.

### Design compliance

CSS classes used: `admin-balance-tile`, `admin-stat-tile`, `usa-card`, `usa-table`, `usa-tag`, `usa-button`, `usa-button--primary`, `usa-button--outline-dark`, `Callout`. All are defined in `globals.css`. Colour tokens `bg-gov-navy`, `text-gov-primary`, `text-gov-accent`, `bg-gov-primary-lighter`, etc. are all defined in the `@theme` block. `font-serif` is applied to balance amounts and the page `<h1>`. `font-mono` is applied to the reference number in both the hero and the Account Info card.

### No new npm packages

Confirmed — no new entries in `package.json`.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `src/app/(public)/dashboard/page.tsx` | New server page — auth gate, balance aggregates, pipeline stepper, deposit table, account info sidebar |
| `src/components/DashboardChildSwitcher.tsx` | New client component — tab row for multi-child accounts |
| `src/components/CopyReferenceButton.tsx` | New client component — clipboard copy button for reference number |
| `src/components/AuthForm.tsx` | New client component — sign-up / sign-in form with post-auth redirect logic |
| `src/app/globals.css` | Added `.admin-balance-tile`, `.admin-stat-tile`, `.admin-deposit-add-card` CSS classes |

</details>
