# Implementation Plan — Admin Portal Enhancement

## Codebase findings

- `src/lib/service.ts` already exports `adminGetStats()` (returns `AdminStats`), `adminGetAllApplications()`, `adminGetApplicationDetail()`.
- `deposits` table has: `id`, `applicationId`, `depositType`, `amountCents`, `status`, `description`, `source`, `scheduledFor`, `postedAt`, `createdAt`. The `source` column exists; spec says no `source` required on add-form — default to empty string or admin.
- `guardianAccounts` table exists in schema and in the DB via `ensureSchema()`.
- `applications.participationTier` stores values `"automatic"`, `"standard"`, or `"legacy"`. The seeder uses `tierForDob()` from `program.ts` which maps `standard` to the `"standard"` internal key (not `"guardian_funded"` — the task brief calls it `guardian_funded` but the DB stores `standard`; plan uses DB reality: `automatic | standard | legacy`).
- `StatusBadge` and `StatTile` are in `src/components/ui.tsx`. `StatTile` accepts `tone: "navy" | "gold" | "white"` — the colored-border variant must be CSS-only in the new component.
- Auth gate: `getAdminSession()` from `src/lib/auth.ts` returns `boolean`; pages use `requireAdminSession()` from `src/app/admin/_adminAuth.ts`.
- Existing admin API routes live under `src/app/api/admin/`.
- No `src/components/admin/` directory currently exists in source (only compiled artifacts). All three existing admin components (`ApplicationEditForm`, `ApplicationStatusPanel`, `ApplicationsFilter`) are `.tsx` client components.
- `formatUSD(cents)` is exported from `src/lib/program.ts`.

---

## Step 1 — Extend `adminGetStats` into `adminGetDashboardStats` in `src/lib/service.ts`

**What to do:** Add four new service functions and one new return type at the bottom of the admin section of `src/lib/service.ts`.

Do NOT remove `adminGetStats` — it is still called by the existing `/api/admin/stats` route which we will update in step 3. Add the new functions alongside it.

### New types to add

```ts
export type TierBreakdown = { tier: string; count: number; pct: number }[];
export type StatusDistribution = { status: string; count: number }[];
export type DepositTypeTotals = { depositType: string; totalCents: number }[];

export type AdminDashboardStats = AdminStats & {
  approvedAccounts: number;
  totalGuardianAccounts: number;
  tierBreakdown: TierBreakdown;
  statusDistribution: StatusDistribution;
  depositTypeTotals: DepositTypeTotals;
};
```

### `adminGetDashboardStats()` — full signature

```ts
export async function adminGetDashboardStats(): Promise<AdminDashboardStats>
```

Implementation:

1. Reuse the same two queries already in `adminGetStats` (applications count row + deposits money row) but add `approvedAccounts` to the applications query:
   ```ts
   approvedAccounts: sql<number>`sum(case when ${applications.status} = 'approved' then 1 else 0 end)::int`
   ```

2. Add a `guardianAccounts` count query:
   ```ts
   const [gaRow] = await db.select({ total: sql<number>`count(*)::int` }).from(guardianAccounts);
   ```

3. Tier breakdown query (GROUP BY `participation_tier`):
   ```ts
   const tierRows = await db
     .select({
       tier: applications.participationTier,
       cnt: sql<number>`count(*)::int`,
     })
     .from(applications)
     .groupBy(applications.participationTier)
     .orderBy(desc(sql`count(*)`));
   ```
   Then compute `pct` client-side from `totalApplications`.

4. Status distribution query (GROUP BY `status`):
   ```ts
   const statusRows = await db
     .select({
       status: applications.status,
       cnt: sql<number>`count(*)::int`,
     })
     .from(applications)
     .groupBy(applications.status)
     .orderBy(desc(sql`count(*)`));
   ```

5. Deposit type totals query (posted only, GROUP BY `deposit_type`):
   ```ts
   const depositTypeRows = await db
     .select({
       depositType: deposits.depositType,
       totalCents: sql<number>`sum(${deposits.amountCents})::bigint`,
     })
     .from(deposits)
     .where(eq(deposits.status, "posted"))
     .groupBy(deposits.depositType)
     .orderBy(desc(sql`sum(${deposits.amountCents})`));
   ```

6. Run all five queries with `Promise.all` (queries 1-5 above).

7. Return the merged object mapping all `Number(...)` casts.

### `adminGetDepositsByApplication(applicationId: number)` — full signature

```ts
export async function adminGetDepositsByApplication(
  applicationId: number,
): Promise<DepositRow[]>
```

Implementation: straight `db.select().from(deposits).where(eq(deposits.applicationId, applicationId)).orderBy(deposits.scheduledFor, deposits.createdAt)`.

### `adminAddDeposit` — full signature

```ts
export type AdminDepositInput = {
  depositType: DepositType;          // one of the 5 enum values from schema
  amountCents: number;               // already converted integer cents
  description: string;
  status: DepositStatus;             // "scheduled" | "processing" | "posted" | "returned"
  scheduledFor: string | null;       // ISO date string or null
};

export async function adminAddDeposit(
  applicationId: number,
  fields: AdminDepositInput,
): Promise<DepositRow>
```

Implementation: `db.insert(deposits).values({ applicationId, ...fields, source: "admin", scheduledFor: fields.scheduledFor ? new Date(fields.scheduledFor) : null, postedAt: fields.status === "posted" ? new Date() : null }).returning()`.

Return the inserted row (first element of the returning array).

### `adminUpdateDeposit` — full signature

```ts
export async function adminUpdateDeposit(
  id: number,
  fields: Partial<AdminDepositInput>,
): Promise<{ ok: true } | { ok: false; error: string }>
```

Implementation: update `deposits` where `eq(deposits.id, id)`. Build the update set object, converting `scheduledFor` to `Date | null`, and setting `postedAt` to `new Date()` when `fields.status === "posted"` and the deposit is not yet posted (fetch current row first). Return `{ ok: true }` on success, `{ ok: false, error: "Not found." }` if `rowCount === 0`.

### `adminDeleteDeposit` — full signature

```ts
export async function adminDeleteDeposit(
  id: number,
): Promise<{ ok: true } | { ok: false; error: string }>
```

Implementation: `db.delete(deposits).where(eq(deposits.id, id))`. Return `{ ok: false, error: "Not found." }` if `rowCount === 0`.

**Files:** `src/lib/service.ts`

**Verify:** `npm run typecheck` — no new type errors.

---

## Step 2 — New API routes for deposit CRUD

### 2a. `POST /api/admin/applications/[reference]/deposits`

Create `src/app/api/admin/applications/[reference]/deposits/route.ts`.

```ts
import { getAdminSession } from "@/lib/auth";
import { adminGetApplicationDetail, adminAddDeposit } from "@/lib/service";
import type { AdminDepositInput } from "@/lib/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ reference: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const { reference } = await ctx.params;
  try {
    const body = (await req.json()) as AdminDepositInput;
    // Validate required fields
    if (!body.depositType || !body.amountCents || !body.description || !body.status) {
      return Response.json({ ok: false, error: "Missing required fields." }, { status: 422 });
    }
    if (!Number.isFinite(body.amountCents) || body.amountCents <= 0) {
      return Response.json({ ok: false, error: "Amount must be a positive number." }, { status: 422 });
    }
    // Resolve application id from reference
    const detail = await adminGetApplicationDetail(reference);
    if (!detail) return Response.json({ ok: false, error: "Application not found." }, { status: 404 });
    const deposit = await adminAddDeposit(detail.application.id, body);
    return Response.json({ ok: true, deposit }, { status: 201 });
  } catch (err) {
    console.error("Admin add deposit error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
```

### 2b. `PUT /api/admin/deposits/[id]`

Create `src/app/api/admin/deposits/[id]/route.ts`.

```ts
import { getAdminSession } from "@/lib/auth";
import { adminUpdateDeposit } from "@/lib/service";
import type { AdminDepositInput } from "@/lib/service";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return Response.json({ ok: false, error: "Invalid id." }, { status: 400 });

  try {
    const fields = (await req.json()) as Partial<AdminDepositInput>;
    const result = await adminUpdateDeposit(numId, fields);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Admin update deposit error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
```

### 2c. `DELETE /api/admin/deposits/[id]`

Add `DELETE` handler to `src/app/api/admin/deposits/[id]/route.ts` (same file as 2b):

```ts
export async function DELETE(_req: Request, ctx: Ctx) {
  const isAdmin = await getAdminSession();
  if (!isAdmin) return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) return Response.json({ ok: false, error: "Invalid id." }, { status: 400 });

  try {
    const result = await adminDeleteDeposit(numId);
    if (!result.ok) return Response.json({ ok: false, error: result.error }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Admin delete deposit error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
```

**Files to create:**
- `src/app/api/admin/applications/[reference]/deposits/route.ts`
- `src/app/api/admin/deposits/[id]/route.ts`

**Verify:** `npm run typecheck` — no errors.

---

## Step 3 — Update `GET /api/admin/stats` to call `adminGetDashboardStats`

**What to do:** Replace `adminGetStats` with `adminGetDashboardStats` in the stats route.

**File:** `src/app/api/admin/stats/route.ts`

Change the import from `adminGetStats` to `adminGetDashboardStats` and the call inside the GET handler:

```ts
import { getAdminSession } from "@/lib/auth";
import { adminGetDashboardStats } from "@/lib/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const isAdmin = await getAdminSession();
  if (!isAdmin) {
    return Response.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  try {
    const stats = await adminGetDashboardStats();
    return Response.json({ ok: true, stats });
  } catch (err) {
    console.error("Admin stats error:", err);
    return Response.json({ ok: false, error: "Internal server error." }, { status: 500 });
  }
}
```

**Verify:** `npm run typecheck` — no errors.

---

## Step 4 — Create `src/components/admin/DepositsPanel.tsx`

This is the largest new client component. It is a `"use client"` component that manages deposit CRUD inline.

**Props:**

```ts
type DepositRow = {
  id: number;
  depositType: string;
  amountCents: number;
  status: string;
  description: string;
  scheduledFor: string | null;  // ISO string or null (Date objects not passed to client)
  postedAt: string | null;
};

type Props = {
  reference: string;           // application reference number (for POST URL)
  initialDeposits: DepositRow[];
};
```

**State:** `deposits: DepositRow[]` (starts from `initialDeposits`), `editingId: number | null`, `editFields: Partial<AdminDepositInput>`, `adding: boolean`, `addFields: AdminDepositInput`, `confirmDeleteId: number | null`, `saving: boolean`, `error: string`.

**Balance summary section** (computed from `deposits` state filtered to `status === "posted"`):
- Federal Total = sum of `depositType` in `["federal_seed", "federal_supplement"]`
- State Total = sum of `depositType === "state_match"`
- Contributions = sum of `depositType === "parent_contribution"`
- Earnings = sum of `depositType === "earnings"`
- Grand Total = sum of all posted deposits

Render as a `<dl>` grid with 5 `<div>` items, each showing label + `formatUSD(cents)`.

**Table columns:** Type, Description, Amount, Status, Scheduled for, Posted at, Actions

Actions column per row:
- Edit button → shows inline edit row (replace the `<tr>` with edit inputs)
- Delete button → sets `confirmDeleteId` (shows a confirmation banner/row)

**Add deposit form** (shown below the table when `adding === true`; toggled by "Add deposit" button above table):
- `deposit_type`: `<select>` with options: `federal_seed`, `state_match`, `federal_supplement`, `parent_contribution`, `earnings` — display as human-readable labels
- `amount`: `<input type="number" step="0.01" min="0.01">` — dollar value, converted ×100 on submit
- `description`: `<input type="text">`
- `status`: `<select>` with options: `scheduled`, `processing`, `posted`, `returned`
- `scheduled_for`: `<input type="date">`
- Submit + Cancel buttons

**Edit row** (inline, replaces the `<tr>` of the deposit being edited):
- Same fields as add form pre-populated with existing values
- `PUT /api/admin/deposits/${id}` with `Partial<AdminDepositInput>`
- On success: update the deposit in `deposits` state, set `editingId = null`, call `router.refresh()`

**Delete flow:**
- First click sets `confirmDeleteId = id`
- A small confirm banner appears: "Delete this deposit? This cannot be undone." + Confirm/Cancel buttons
- On confirm: `DELETE /api/admin/deposits/${id}`, on success: remove from `deposits` state, call `router.refresh()`

**Add flow:**
- `POST /api/admin/applications/${reference}/deposits` with `AdminDepositInput` (amount in cents)
- On success: append returned deposit to `deposits` state, hide form, call `router.refresh()`

**Important:** All `Date` fields must be handled as strings when passing to/from the API and storing in state. The component receives serialized ISO strings (or null) from the server page.

**Deposit type display labels mapping:**
```ts
const TYPE_LABELS: Record<string, string> = {
  federal_seed: "Federal Seed",
  state_match: "State Match",
  federal_supplement: "Federal Supplement",
  parent_contribution: "Guardian Contribution",
  earnings: "Earnings",
};
```

**Status badge colors (using existing token classes):**
- `posted` → `bg-gov-green text-white`
- `scheduled` → `bg-gov-primary-lighter text-gov-primary-darker`
- `processing` → `bg-[#fef0c8] text-[#7a5b00]`
- `returned` → `bg-[#f4e3db] text-gov-red-dark`

**Files:** `src/components/admin/DepositsPanel.tsx`

**Verify:** `npm run typecheck` — no errors.

---

## Step 5 — Update the application detail page to embed `DepositsPanel`

**What to do:** Replace the read-only "Deposit Ledger" section in the detail page with `<DepositsPanel>`. The server page already fetches `deposits` from `adminGetApplicationDetail`. Serialize the deposit rows before passing to the client component (convert `Date | null` to `string | null`).

**File:** `src/app/admin/(protected)/applications/[reference]/page.tsx`

Changes:
1. Import `DepositsPanel` from `@/components/admin/DepositsPanel`.
2. Remove the existing read-only deposit ledger `<div className="usa-card mt-6">` block (lines rendering the static deposit table).
3. Add a serialization step before the return:

```ts
const serializedDeposits = deposits.map((d) => ({
  id: d.id,
  depositType: d.depositType,
  amountCents: d.amountCents,
  status: d.status,
  description: d.description,
  scheduledFor: d.scheduledFor ? d.scheduledFor.toISOString() : null,
  postedAt: d.postedAt ? d.postedAt.toISOString() : null,
}));
```

4. Add `<DepositsPanel reference={app.referenceNumber} initialDeposits={serializedDeposits} />` inside the existing `<div className="p-6">`, after the right-column grid and before the Documents card.

**Verify:** `npm run build` — no type or build errors.

---

## Step 6 — Create `adminGetDashboardStats`-based dashboard page

**What to do:** Rewrite `src/app/admin/(protected)/page.tsx` to use `adminGetDashboardStats` and render all new sections.

**File:** `src/app/admin/(protected)/page.tsx`

**Full structure:**

### Section 1 — 6 stat tiles

Replace the 4-tile grid with a 6-tile grid (`sm:grid-cols-2 lg:grid-cols-3` then wrap to `lg:grid-cols-6` at XL, or just use a 2-column on mobile / 3-column from md). Use white cards with a colored left border (4px solid). Do NOT use the existing `StatTile` component for this section; build inline `<div>` cards to allow the colored left-border accent style without changing `ui.tsx`.

Six tiles:

| Tile | Value | Border color class |
|------|-------|--------------------|
| Total Applications | `stats.totalApplications` | `border-l-gov-navy` → use inline style `borderLeft: "4px solid var(--color-gov-navy)"` |
| Pending Review | `stats.pendingReview` | `borderLeft: "4px solid var(--color-gov-accent)"` |
| Approved | `stats.approvedAccounts` | `borderLeft: "4px solid var(--color-gov-primary)"` |
| Funded | `stats.fundedAccounts` | `borderLeft: "4px solid var(--color-gov-green)"` |
| Total Posted Deposits | `formatUSD(stats.totalPostedCents)` | `borderLeft: "4px solid var(--color-gov-primary-dark)"` |
| Total Users | `stats.totalGuardianAccounts` | `borderLeft: "4px solid var(--color-gov-base)"` |

Each tile card structure:
```jsx
<div className="usa-card p-5" style={{ borderLeft: "4px solid var(--color-gov-navy)" }}>
  <p className="font-serif text-2xl font-bold text-gov-navy tabular-nums">{value}</p>
  <p className="mt-1 text-xs font-bold uppercase tracking-wider text-gov-base">{label}</p>
</div>
```

### Section 2 — Tier breakdown

Render `stats.tierBreakdown` as a list of bars. For each tier:

```jsx
<div key={tier.tier} className="space-y-1">
  <div className="flex justify-between text-sm">
    <span className="font-medium text-gov-navy capitalize">
      {tier.tier === "automatic" ? "Automatic Enrollment" : tier.tier === "standard" ? "Guardian-Funded" : "Legacy"}
    </span>
    <span className="text-gov-base">{tier.count.toLocaleString()} ({tier.pct.toFixed(1)}%)</span>
  </div>
  <div className="h-2 w-full rounded bg-gov-base-light overflow-hidden">
    <div className="h-full rounded bg-gov-primary" style={{ width: `${tier.pct}%` }} />
  </div>
</div>
```

Wrap all three in a `<div className="usa-card p-5 mt-6 space-y-4">` with a `<h2>` heading.

Bar colors per tier: automatic → `bg-gov-navy`, standard → `bg-gov-primary`, legacy → `bg-gov-base`.

### Section 3 — Pipeline status distribution

Render `stats.statusDistribution` as a compact table or a list of `<div>` rows, showing status badge + count. Use `StatusBadge` from `@/components/ui`.

```jsx
<div className="usa-card p-5 mt-6">
  <h2 className="font-serif text-lg font-semibold text-gov-navy mb-4">Pipeline Status</h2>
  <div className="space-y-2">
    {stats.statusDistribution.map((s) => (
      <div key={s.status} className="flex items-center justify-between text-sm">
        <StatusBadge status={s.status} />
        <span className="font-semibold tabular-nums text-gov-navy">{s.count.toLocaleString()}</span>
      </div>
    ))}
  </div>
</div>
```

### Section 4 — Deposit type breakdown

Render `stats.depositTypeTotals` as a table with columns: Type, Total Posted.

```jsx
<div className="usa-card mt-6 overflow-x-auto">
  <table className="usa-table w-full">
    <caption>Deposit Type Breakdown (Posted)</caption>
    <thead><tr><th>Type</th><th>Total Posted</th></tr></thead>
    <tbody>
      {stats.depositTypeTotals.map((d) => (
        <tr key={d.depositType}>
          <td>{TYPE_LABELS[d.depositType] ?? d.depositType}</td>
          <td className="font-semibold">{formatUSD(d.totalCents)}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

Define `TYPE_LABELS` inline in the file (same mapping as DepositsPanel).

Sections 2–4 can be arranged in a responsive grid: `<div className="mt-6 grid gap-6 lg:grid-cols-3">` with each section in its own column.

### Section 5 — Recent applications table (last 10)

Keep the existing recent-apps table but add a Tier badge column. Fetch with `adminGetAllApplications({ page: 1 })` and take first 10 rows. For the Tier badge, add a helper `TierBadge` inline component in this file (not exported, just used here):

```tsx
function TierBadge({ tier }: { tier: string }) {
  const styles = tier === "automatic"
    ? "bg-gov-primary-lighter text-gov-primary-darker"
    : tier === "standard"
    ? "bg-[#ddf9c7] text-gov-green-dark"
    : "bg-gov-base-light text-gov-navy";
  return <span className={`usa-tag ${styles}`}>{tier}</span>;
}
```

Table columns: Reference (link), Child Name, Guardian, State, Tier, Status, Submitted.

**Imports for this file:** `requireAdminSession`, `adminGetDashboardStats`, `adminGetAllApplications`, `StatusBadge` from `@/components/ui`, `formatUSD` from `@/lib/program`, `Link` from `next/link`.

**Verify:** `npm run build` — clean build.

---

## Step 7 — Applications list: add Balance column and Tier badge

**What to do:** Add two new columns to the applications list table.

**File:** `src/app/admin/(protected)/applications/page.tsx`

1. The `adminGetAllApplications` function returns full `ApplicationRow[]` (it selects `*` from applications). The `ApplicationRow` type does not include a pre-computed balance. To get per-application balances, two options exist:
   - **Option A (chosen):** Add a `adminGetApplicationBalances(ids: number[]): Promise<Map<number, number>>` to `service.ts` — a single `GROUP BY` query for posted deposit sums for a given set of app IDs. This avoids N+1.
   - Option B: Compute balance on the page via N+1 queries — rejected.

   Add `adminGetApplicationBalances` to `src/lib/service.ts`:
   ```ts
   export async function adminGetApplicationBalances(
     appIds: number[],
   ): Promise<Map<number, number>> {
     if (appIds.length === 0) return new Map();
     const rows = await db
       .select({
         applicationId: deposits.applicationId,
         totalCents: sql<number>`sum(${deposits.amountCents})::bigint`,
       })
       .from(deposits)
       .where(and(
         inArray(deposits.applicationId, appIds),
         eq(deposits.status, "posted"),
       ))
       .groupBy(deposits.applicationId);
     return new Map(rows.map((r) => [r.applicationId, Number(r.totalCents)]));
   }
   ```
   Import `inArray` from `drizzle-orm` (already available via the drizzle import).

2. In `page.tsx`, after fetching `rows`, call:
   ```ts
   const balanceMap = await adminGetApplicationBalances(rows.map((r) => r.id));
   ```

3. Add `import { formatUSD } from "@/lib/program"` to the page.

4. Add a `TierBadge` function (same as defined in step 6) or import from a shared location — keep it inline in this file.

5. Update the `<thead>` to add `<th>Tier</th>` after State, and `<th>Balance</th>` after Status (before Submitted).

6. Update each `<tr>` to add:
   - After State `<td>`: `<td><TierBadge tier={row.participationTier} /></td>`
   - After Status `<td>`: `<td className="font-semibold tabular-nums text-sm">{formatUSD(balanceMap.get(row.id) ?? 0)}</td>`

7. Update the `colSpan={7}` on the empty-state `<td>` to `colSpan={9}`.

**Files:** `src/lib/service.ts` (add `adminGetApplicationBalances`), `src/app/admin/(protected)/applications/page.tsx`

**Verify:** `npm run typecheck && npm run build` — clean.

---

## Step 8 — Final build and typecheck verification

**What to do:** Run the full build to confirm no regressions across all files touched.

**Verify:** `npm run typecheck && npm run build` — exits with code 0, no TypeScript errors, no missing exports.

---

## File creation/modification summary (ordered by dependency)

| Order | File | Action |
|-------|------|--------|
| 1 | `src/lib/service.ts` | Add `AdminDepositInput`, `AdminDashboardStats`, `adminGetDashboardStats`, `adminGetDepositsByApplication`, `adminAddDeposit`, `adminUpdateDeposit`, `adminDeleteDeposit`, `adminGetApplicationBalances` |
| 2 | `src/app/api/admin/applications/[reference]/deposits/route.ts` | Create (POST) |
| 3 | `src/app/api/admin/deposits/[id]/route.ts` | Create (PUT + DELETE) |
| 4 | `src/app/api/admin/stats/route.ts` | Update import + call |
| 5 | `src/components/admin/DepositsPanel.tsx` | Create (client component) |
| 6 | `src/app/admin/(protected)/applications/[reference]/page.tsx` | Replace static ledger with `<DepositsPanel>` |
| 7 | `src/app/admin/(protected)/page.tsx` | Full redesign with 6 tiles + 3 breakdowns + updated recent table |
| 8 | `src/app/admin/(protected)/applications/page.tsx` | Add Tier + Balance columns |

## Key decisions

- **`standard` vs `guardian_funded`:** The DB and `program.ts` use `"standard"` as the tier value for guardian-funded accounts. Labels shown in UI say "Guardian-Funded" but filter/compare against `"standard"`. No migration needed.
- **Balance in applications list:** Single batched `GROUP BY` query (`adminGetApplicationBalances`) rather than N individual queries or a JOIN on the paginated list. Keeps service layer clean and avoids over-fetching full deposit rows.
- **DepositsPanel state:** Client-side optimistic state update after add/edit/delete plus `router.refresh()` to re-sync server data. No SWR or external library needed.
- **Date serialization:** Server components convert `Date` objects to ISO strings before passing to `DepositsPanel` to satisfy Next.js strict client-component boundary.
- **`inArray` import:** Already in `drizzle-orm`; add to the existing destructured import at the top of `service.ts`.
- **`source` field on admin-created deposits:** Default to `"admin"` string constant — the field is NOT NULL in schema so a value is required.
