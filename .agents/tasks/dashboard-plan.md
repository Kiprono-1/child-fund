# Guardian Dashboard Implementation Plan

## Codebase findings

The dashboard page already exists at `src/app/(public)/dashboard/page.tsx`. It is a server component with `force-dynamic`, session guard, multi-child awareness, balance aggregation, and a deposit ledger. However it uses generic `StatTile` (navy/white/gold skins) rather than the 4-tile card design with colored top borders, the hero is the standard `PageHero` widget rather than a navy gradient strip, there is no account-info card or tier description, the pipeline is absent, the quick-actions section is three cards in a row rather than a right-column sidebar, and there are no client components for the copy-reference button or child switcher tabs.

The `(public)` route group already has the `SiteHeader` / `SiteFooter` layout from `src/app/(public)/layout.tsx`. The page URL resolves to `/dashboard` (the `(public)` segment is invisible).

`getSessionGuardian` → `src/lib/auth.ts` — returns `{ guardianId, email } | null`.  
`getApplicationsByGuardianId(id)` → `src/lib/service.ts` — returns a list of lean rows (no `Date` serialisation needed — Drizzle returns them as `Date` objects so they must be serialised before passing to client components).  
`getApplicationDetail(reference)` → `src/lib/service.ts` — returns `ApplicationDetail | null | { error: string }`.  
`formatUSD(cents)` → `src/lib/program.ts` — formats integer cents as USD.  
`STATUS_META` → `src/lib/program.ts` — `{ label, tone, blurb }` keyed by status string.  
`tierForDob(dob)` → `src/lib/program.ts` — returns `TierInfo` including `.label` and `.summary`.  
`StatusBadge` → `src/components/ui.tsx` — renders a coloured `usa-tag`.  
`Callout` → `src/components/ui.tsx` — renders a left-border note box.  
`STATES` / `getState(code)` → `src/lib/states.ts` — jurisdiction data.

Existing CSS in `globals.css` relevant to this work:
- `.admin-balance-tile` — white card with padding; can be reused for the 4 balance tiles (top border is set inline via `style`).
- `.usa-card`, `.usa-table`, `.usa-button`, `.usa-button--primary`, `.usa-button--outline-dark`, `.usa-tag` — all available.
- Tailwind tokens: `bg-gov-navy`, `bg-gov-primary`, `text-gov-accent`, `text-gov-green`, `text-gov-green-dark`, `text-gov-primary-darker`, `text-gov-red-dark`, `bg-gov-base-lightest`, `bg-gov-primary-lightest`.

No new npm packages are needed. Build/test: `npm run typecheck && npm run build`.

---

## File list

| Action | Path |
|--------|------|
| **Replace** | `src/app/(public)/dashboard/page.tsx` |
| **Create** | `src/components/DashboardChildSwitcher.tsx` |
| **Create** | `src/components/CopyReferenceButton.tsx` |

No other files need modification. The `SiteHeader` already links to `/dashboard`. Navigation and footer require no changes.

---

## Component breakdown

### Server component — `src/app/(public)/dashboard/page.tsx`

Owns the full data-fetch lifecycle. Does all money arithmetic server-side. Serialises every `Date` to ISO string before handing to JSX or client components. Renders:

1. Custom hero section (replaces `PageHero`)
2. `DashboardChildSwitcher` (client, receives serialised list)
3. Verification `Callout` (conditional)
4. 4 balance tiles (static JSX — no client component needed)
5. Two-column body section: left = deposit table/cards; right = quick actions + account-info card
6. Pipeline step indicator (static JSX)

### Client component — `src/components/DashboardChildSwitcher.tsx`

Only rendered when `appRows.length > 1`. Receives a serialised array of `{ referenceNumber, childFirstName, childLastName, status, selected: boolean }`. Renders tab-style buttons. On click, updates the URL to `?child=REF` using `useRouter().push()` so the server re-fetches the selected child's detail. Mark `"use client"`.

### Client component — `src/components/CopyReferenceButton.tsx`

A small inline button that calls `navigator.clipboard.writeText(props.text)` and briefly shows "Copied!" feedback. Receives `text: string` as a prop. Mark `"use client"`.

---

## Data flow (server → client)

```
DashboardPage (server)
  │
  ├─ getSessionGuardian()           → { guardianId, email }
  ├─ getApplicationsByGuardianId()  → AppRow[]  (Drizzle rows, Date objects inside)
  │
  ├─ Determine selected ref from searchParams?child= (first row if absent)
  │
  ├─ getApplicationDetail(ref)      → ApplicationDetail | null | { error }
  │
  ├─ Serialise:
  │     apps[]    → { referenceNumber, childFirstName, childLastName, status }[]  (plain strings)
  │     deposits  → { id, depositType, amountCents, status, description,
  │                   postedAt: string|null, scheduledFor: string|null }[]
  │     application → { childFirstName, childLastName, childDob, referenceNumber,
  │                     parentFullName, parentState, participationTier,
  │                     childAccountNumber, verificationStatus }  (plain strings/booleans)
  │
  ├─ Compute balance aggregates (all in server component, pass formatted strings to JSX)
  │
  ├─► DashboardChildSwitcher  receives: apps[], selectedRef (strings only)
  └─► CopyReferenceButton     receives: text (string)
```

The `searchParams` pattern for child selection: `DashboardPage` receives `searchParams: Promise<{ child?: string }>` (Next 16 awaitable). If `searchParams.child` matches a reference owned by this guardian, use it; otherwise fall back to `appRows[0]`.

---

## Section-by-section CSS approach

### 1. Hero — full-width navy gradient

```html
<section class="bg-gov-navy text-white py-10 sm:py-14">
  <div class="mx-auto max-w-7xl px-4 sm:px-6">
    <breadcrumb in white/muted text />
    <h1 class="font-serif text-3xl sm:text-4xl font-bold text-white">Emma's Trust Fund</h1>
    <p class="font-mono text-gov-accent text-sm mt-1">CTF-2025-ABCDEF</p>
    <StatusBadge class applied via wrapper />
    <p class="text-gov-primary-lighter text-sm mt-2">tagline</p>
  </div>
</section>
```

The breadcrumb anchor colors need overriding to white in the navy context — wrap with a `[&_a]:text-white` or use Tailwind's arbitrary variant. `StatusBadge` renders fine as-is because its tone classes are self-contained.

### 2. Balance tiles — 2×2 → 4-col grid

Reuse the `.admin-balance-tile` CSS class (already in `globals.css`). Apply `style={{ borderTop: "4px solid var(--color-gov-green)" }}` etc. inline (same pattern used in `DepositsPanel.tsx`):

```html
<div class="grid grid-cols-2 gap-4 lg:grid-cols-4 mt-8 max-w-7xl mx-auto px-4 sm:px-6">
  <div class="admin-balance-tile" style="border-top:4px solid var(--color-gov-green)">…</div>
  <div class="admin-balance-tile" style="border-top:4px solid var(--color-gov-accent)">…</div>
  <div class="admin-balance-tile" style="border-top:4px solid var(--color-gov-primary)">…</div>
  <div class="admin-balance-tile" style="border-top:4px solid var(--color-gov-navy)">…</div>
</div>
```

Amount text: `font-serif text-3xl font-bold text-gov-navy tabular-nums`.  
Label: `text-xs font-bold uppercase tracking-wider text-gov-base mt-2`.  
Sub-label (count): `text-xs text-gov-base mt-0.5`.

### 3. Two-column body — `lg:grid-cols-[1fr_340px]`

```html
<section class="py-10 bg-gov-base-lightest">
  <div class="mx-auto max-w-7xl px-4 sm:px-6">
    <div class="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div><!-- deposit history --></div>
      <div class="space-y-6"><!-- quick actions + account info --></div>
    </div>
  </div>
</section>
```

**Deposit history (left):**  
- Desktop (`sm:block hidden`): `<table class="usa-table">` with columns Type | Description | Amount | Status | Date.  
- Mobile (`sm:hidden`): card list. Each card is a `div.usa-card p-4` with the amount large (`font-serif text-xl`), type as bold label, description as muted text, status as `usa-tag`.  
- Status color classes: `posted` → `bg-[#ddf9c7] text-gov-green-dark`; `scheduled`/`processing` → `bg-gov-primary-lighter text-gov-primary-darker`; `returned` → `bg-[#fdf3f2] text-gov-red-dark`.  
- Empty state: `<Callout tone="info">` + link to `/contact`.

**Quick actions (right, top):**  
Three stacked `Link` buttons inside a `usa-card p-5`:  
  - "Make a Contribution" → `usa-button usa-button--primary w-full`  
  - "View Full Case Details" → `usa-button usa-button--outline-dark w-full`  
  - "Contact Support" → `usa-button usa-button--outline-dark w-full`  

**Account info card (right, below actions):**  
`usa-card p-5 space-y-4`. Sections:  
  - Child: full name + DOB  
  - Reference: monospace span + `<CopyReferenceButton text={ref} />`  
  - Tier: `TierInfo.label` (bold) + `TierInfo.summary` (small muted text)  
  - Guardian: name, state (from `getState()`)  
  - Verification: `verificationStatus` displayed with a small coloured dot (green = verified, amber = in_progress/in_review, gray = awaiting/not_started)

### 4. Pipeline step indicator

Static JSX in its own `<section>` below the two-column body. Pipeline steps array:

```ts
const STEPS = [
  { key: "submitted",             label: "Submitted" },
  { key: "under_review",         label: "Under Review" },
  { key: "verification_required",label: "Verify Identity" },
  { key: "approved",             label: "Approved" },
  { key: "funded",               label: "Funded" },
];
```

Derive `currentIndex` from `application.status`. A step is "done" if its index < currentIndex, "active" if equal, "upcoming" if greater. Render as a horizontal `<ol>` with connecting lines between circles:

```html
<ol class="flex items-start gap-0">
  <li class="flex-1 flex flex-col items-center">
    <div class="h-8 w-8 rounded-full bg-gov-green flex items-center justify-center text-white">✓</div>
    <div class="h-0.5 w-full bg-gov-green" />  <!-- connector right -->
    <p class="text-xs mt-2 text-center font-bold text-gov-green-dark">Submitted</p>
  </li>
  ...
</ol>
```

On mobile (< `sm`), collapse to a vertical list with a left-border timeline (`border-l-2`) instead of horizontal circles.

---

## Edge cases

| Scenario | Handling |
|----------|----------|
| `getSessionGuardian()` returns null | `redirect("/login")` — already in place |
| `appRows.length === 0` | `redirect("/apply")` — already in place |
| `getApplicationDetail` returns null or `{ error }` | Show `<Callout tone="warning">` with a link to `/contact`; skip deposits/pipeline/account-info sections |
| No deposits yet | `<Callout tone="info">` in the ledger section; all 4 balance tiles show `$0.00` |
| Single child | Hide child switcher entirely (no render of `DashboardChildSwitcher`) |
| >1 child | Show `DashboardChildSwitcher`; `searchParams.child` selects which detail to load |
| `searchParams.child` set to a ref not owned by this guardian | Silently fall back to `appRows[0]` (the ownership check is inside `getApplicationDetail` with `guardianAccountId`) |
| `childAccountNumber` is null (not yet approved) | Omit account number line from account-info card |
| `verificationStatus` unexpected value | Default to gray dot |
| `participationTier` not in `tierForDob` output | Use raw string as label with no summary |
| Date serialisation | All `Date → .toISOString()` in the server component; format for display as `new Date(isoString).toLocaleDateString()` inside JSX (still server-rendered, safe) |

---

## Ordered implementation steps

- [ ] 1. Create `src/components/CopyReferenceButton.tsx`  
      A `"use client"` component. Props: `{ text: string }`. Renders a small `<button>` that calls `navigator.clipboard.writeText(text)`, sets a `copied` state for 2 s, then resets. Use `useState` and `setTimeout`. No external dependencies. Style with Tailwind: `text-xs font-mono text-gov-primary hover:underline cursor-pointer bg-transparent border-none px-0`.  
      Files: `src/components/CopyReferenceButton.tsx`  
      Verify: `npm run typecheck` — no errors.

- [ ] 2. Create `src/components/DashboardChildSwitcher.tsx`  
      A `"use client"` component. Props:  
      ```ts
      type ChildTab = { referenceNumber: string; childFirstName: string; childLastName: string; status: string; selected: boolean; }
      type Props = { children: ChildTab[] }
      ```  
      Uses `useRouter()` from `next/navigation`. On click calls `router.push(\`/dashboard?child=\${ref}\`)`. Renders a `<nav>` with `role="tablist"` and a button per child. Active tab: `bg-gov-primary text-white border-gov-primary`; inactive: `bg-white text-gov-navy border-gov-base-light hover:border-gov-primary`. Each button renders a `StatusBadge` (import from `@/components/ui`). Wrap in `"use client"`.  
      Files: `src/components/DashboardChildSwitcher.tsx`  
      Verify: `npm run typecheck` — no errors.

- [ ] 3. Rewrite `src/app/(public)/dashboard/page.tsx`  
      This is the main implementation step. Replace the entire file. Follow the data-flow and CSS approach above precisely.

      **Signature changes from existing file:**
      - Add `searchParams: Promise<{ child?: string }>` to function params and `await` it.
      - After resolving `appRows`, find `selectedRef = searchParams.child ?? appRows[0].referenceNumber`. Validate it belongs to this guardian (check `appRows.find(a => a.referenceNumber === selectedRef)` — if not found, fall back to `appRows[0]`).
      - Call `getApplicationDetail(selectedRef, undefined, guardian.guardianId)` (pass `guardianAccountId` as third arg to enforce ownership).
      - Import `tierForDob` from `@/lib/program` and call `tierForDob(appDetail?.childDob)` for tier label/summary.
      - Import `getState` from `@/lib/states` for guardian state name.

      **Hero section (replace `PageHero`):**
      ```tsx
      <section className="bg-gov-navy text-white py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Breadcrumb — white text */}
          <nav className="mb-4 text-[0.78rem]">
            <ol className="flex flex-wrap items-center gap-1.5 text-white/70">
              <li><a href="/" className="hover:text-white">Home</a></li>
              <li aria-hidden="true">›</li>
              <li className="text-white font-semibold">My Dashboard</li>
            </ol>
          </nav>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gov-accent mb-1">Guardian account</p>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white leading-tight">
            {childName}&apos;s Trust Fund
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <span className="font-mono text-gov-accent text-sm">{selectedApp.referenceNumber}</span>
            <StatusBadge status={selectedApp.status} />
          </div>
          <p className="mt-3 text-gov-primary-lighter text-sm max-w-xl">
            Every contribution grows tax-free until {selectedApp.childFirstName} turns 18.
          </p>
        </div>
      </section>
      ```

      **Balance tiles (4-tile grid, immediately after hero):**
      Section with `bg-white py-8`. Grid: `grid grid-cols-2 gap-4 lg:grid-cols-4`. Use `.admin-balance-tile` class (already in globals.css) with inline `style={{ borderTop: "4px solid <color>" }}`. Tile data:
      - Tile 1 (green border `var(--color-gov-green)`): icon `💰`, label "Current Balance", value `formatUSD(balanceCents)`, sub `${postedDeps.length} posted deposit${postedDeps.length !== 1 ? 's' : ''}`.
      - Tile 2 (amber border `var(--color-gov-accent)`): icon `⏳`, label "Pending", value `formatUSD(pendingCents)`, sub `${pendingDeps.length} pending`.
      - Tile 3 (blue border `var(--color-gov-primary)`): icon `🤝`, label "Your Contributions", value `formatUSD(parentCents)`, sub `${parentDeps.length} contribution${parentDeps.length !== 1 ? 's' : ''}`.
      - Tile 4 (navy border `var(--color-gov-navy)`): icon `🏛️`, label "Gov't Funding", value `formatUSD(govCents)`, sub `Federal + State match`.

      **Child switcher (conditional, between hero and tiles):**
      Only render if `appRows.length > 1`. Pass `appRows.map(a => ({ ...a, selected: a.referenceNumber === selectedRef }))` to `<DashboardChildSwitcher>`. Wrap in `<section className="border-b border-gov-base-light bg-white py-4">`.

      **Verification callout (conditional):**
      Show `<Callout tone="warning">` if `selectedApp.status === "submitted" || status === "under_review" || status === "verification_required"`.

      **Two-column body section (`bg-gov-base-lightest py-10`):**
      Grid: `grid gap-8 lg:grid-cols-[1fr_340px]`.
      - Left: heading "Deposit History" + table (desktop) / card list (mobile). See CSS approach above.
      - Right column: 
        - Quick-actions card (`usa-card p-5`): heading "Quick Actions" + 3 link buttons stacked with `space-y-3`. Links:
          - `/deposit?ref=${ref}` → "Make a Contribution" → `usa-button usa-button--primary w-full`
          - `/status?ref=${ref}&last=${lastName}` → "View Full Case" → `usa-button usa-button--outline-dark w-full`
          - `/contact` → "Contact Support" → `usa-button usa-button--outline-dark w-full`
        - Account-info card (`usa-card p-5 mt-4 space-y-4`): sections for child info, reference (with `<CopyReferenceButton>`), tier description, guardian info, verification status dot.

      **Pipeline section (`bg-white py-10`):**
      Horizontal on `sm+`, vertical on mobile. Use the STEPS array defined above. Derive `currentStepIndex` from `selectedApp.status`. Render connecting line between steps using `flex-1 h-0.5` divs positioned between circles. On mobile: `<ol className="sm:hidden border-l-2 border-gov-base-light pl-4 space-y-4">`.

      **Null/error guard after `getApplicationDetail`:**
      If `detail` is null or `'error' in detail`, render a `<Callout tone="warning">` with message and link to `/contact` instead of the detail sections. Still render the hero and balance tiles with zeroed amounts.

      Files: `src/app/(public)/dashboard/page.tsx`  
      Verify: `npm run typecheck && npm run build` — no type errors, no build errors.

---

## Summary of decisions

**Why keep `(public)/dashboard/page.tsx` (not `src/app/dashboard/page.tsx`)?**  
The route group `(public)` applies the public layout (SiteHeader + SiteFooter) and is the current location. Moving it would not change the URL but would require a redirect or a file move. The task spec says "page lives at `src/app/dashboard/page.tsx`" but the existing working file and all internal links point to `(public)/dashboard`. The plan keeps it in `(public)` to avoid breaking links — this is the more conservative choice. If the coder is explicitly instructed to move it, they should add a `redirect` at the old path.

**Why reuse `.admin-balance-tile`?**  
It already exists in `globals.css` and matches the desired white-card-with-colored-top-border pattern exactly. No new CSS class is needed.

**Why `searchParams` for child selection instead of a client-side state switcher?**  
The page is a server component. Client-side state cannot trigger server data re-fetches. Using a URL param (`?child=REF`) preserves shareability and allows the server to fetch only the selected child's data. The `DashboardChildSwitcher` client component just pushes the URL, the server handles the rest.

**Why `DashboardChildSwitcher` as a client component?**  
It needs `useRouter` to push the URL. All the data it renders (child names, statuses) is passed as plain string props — no Date objects or Drizzle rows cross the boundary.
