# Admin portal enhancement: dashboard stats, deposit CRUD, and applications list

The change adds a live admin dashboard, a full deposit CRUD panel, an extended applications list with Balance and Tier columns, and five new service functions (`adminGetDashboardStats`, `adminGetDepositsByApplication`, `adminAddDeposit`, `adminUpdateDeposit`, `adminDeleteDeposit`) with two new API route files. Every admin API route carries a `getAdminSession()` guard. The dashboard assembles six stat tiles, tier-breakdown progress bars, pipeline distribution, and deposit-type totals from a set of parallel DB queries.

Watch for: (1) **confirmed** — `source` is `NOT NULL` in the schema DDL but `adminAddDeposit` hard-codes `source: "admin"`, truncating the 120-char column to 5 chars — not a crash, but semantically lossy; (2) **confirmed** — `adminGetDepositsByApplication` is exported but never called by any reviewed file; (3) **confirmed** — two unsafe `as unknown as string` casts in `DepositsPanel` that will never be hit at runtime but are technically unsound; (4) **possible** — `adminUpdateDeposit` calls `result.rowCount` on the Drizzle update result, which may be `undefined` on some drivers, so the `!== 0` guard could silently pass a no-op update.

**Verdict**: NEEDS_CHANGES

---

## High-level view

All seven admin API routes (stats, applications list, application detail, application PUT, deposits POST, deposits PUT/DELETE, inquiries, newsletter, status override) call `getAdminSession()` as their first statement and return 401 on failure — **confirmed** by reading every route file. The deposit add/edit/delete routes are no exception.

The five new service functions use Drizzle ORM query-builder syntax consistently with the rest of `service.ts`. GROUP BY aggregates in `adminGetDashboardStats` and `adminGetApplicationBalances` are correct: each `groupBy()` call groups by exactly the column projected in `select()`, and every money value is cast from the `bigint` Postgres returns with `::bigint` and then wrapped in `Number()` at the call site. All `amountCents` fields carry integer cents throughout; the only dollar conversion happens in `DepositsPanel` display inputs.

The `source` column on the `deposits` table is declared `NOT NULL` with `length: 120` in the Drizzle schema. `adminAddDeposit` satisfies the constraint by supplying `source: "admin"`, but the value loses the institution context that every other deposit path provides. This is a semantic gap, not a crash.

`adminGetDepositsByApplication` is a fully correct Drizzle query, but it is dead code in this diff — no route or component calls it. The deposit listing on the detail page comes from `adminGetApplicationDetail`, which already fetches all deposits.

The `DepositsPanel` client component serializes `Date` objects to ISO strings on the server before passing them as props (confirmed in the detail page). The two `as unknown as string` casts inside the `submitAdd` handler guard a branch that will never execute because the API always returns ISO strings. The casts are harmless at runtime but should be typed correctly.

`adminUpdateDeposit` relies on `result.rowCount` to distinguish a hit from a miss. The `pg` driver returns `rowCount` reliably, but several community reports note it can be `null` on some Drizzle/driver combinations. The fallback `?? 0` already handles `null`, so the guard `(result.rowCount ?? 0) === 0` is correct in practice. Worth a note but not a blocker.

The dashboard's six stat tiles, tier-breakdown progress bars, pipeline status distribution, and deposit-type table are all present and match the spec. The applications list includes Balance (via `adminGetApplicationBalances`) and Tier columns. `DepositsPanel` supports add, inline edit, and delete with a confirmation banner before the DELETE call.

---

<details>
<summary>Issues (4)</summary>

1. **Source field information loss** — `adminAddDeposit` hard-codes `source: "admin"` rather than accepting a source string in `AdminDepositInput`. The column is NOT NULL and accepts up to 120 characters; every non-admin deposit path records the institution name. Add `source?: string` to `AdminDepositInput` and default it to `"admin"` if omitted, then surface a source input in `DepositsPanel`.

2. **Dead export `adminGetDepositsByApplication`** — the function is exported but is not called by any route, page, or component in this diff. The deposit listing reachable from the admin UI comes from `adminGetApplicationDetail`. Either wire it into a route that would benefit from it or remove it.

3. **Unsafe double cast in `DepositsPanel.submitAdd`** — `dep.scheduledFor as unknown as string` and `dep.postedAt as unknown as string` inside the add-deposit success handler. The values are already ISO strings from the API, so the `typeof === "string"` branch is always taken and the cast branch is dead. Remove the dead branch and narrow the type at the API boundary instead.

4. **`adminGetApplicationBalances` uses `inArray` with an unsanitised caller-supplied array** — the array contents are application IDs from a prior Drizzle query, so they are safe integers, but the function signature accepts `number[]` with no guard against an empty array. A zero-length array is already short-circuited at the top of the function, so this is not a bug today, but the SQL generated by `inArray(col, [])` on some versions of Drizzle produces invalid SQL. The early return protects it; keep the guard and add a comment explaining why it is required.

</details>

---

<details>
<summary>Details</summary>

### `source: "admin"` truncates deposit provenance

The `deposits` schema defines `source: varchar("source", { length: 120 }).notNull()`. Every path through `advanceApplication` and `addGuardianDeposit` populates `source` with the institution name (`"U.S. Department of the Treasury"`, `state?.agency`, `${custodianBank} ••••${accountLast4}`). `adminAddDeposit` collapses this to the five-character string `"admin"`. An admin depositing a federal supplement on behalf of Treasury will record `"admin"` instead. The fix is one field addition to `AdminDepositInput` and the `DepositsPanel` form.

### Dead `adminGetDepositsByApplication`

The function correctly queries and orders by `scheduledFor, createdAt`, which is a reasonable ordering for a deposit list. But `adminGetApplicationDetail` already fetches the same rows sorted by `postedAt DESC, createdAt DESC`. Nothing in the codebase calls `adminGetDepositsByApplication`, making it exported dead code that will confuse future authors about which function is authoritative.

### `as unknown as string` casts in `DepositsPanel`

In `submitAdd`:

```ts
: new Date(dep.scheduledFor as unknown as string).toISOString()
```

The API returns `{ deposit: DepositRow }` where `DepositRow` from the `returning()` call carries Drizzle-inferred types (`Date | null` for timestamp columns). The server serializes those dates to ISO strings before the JSON response is sent; the client receives a plain string. The local `DepositRow` type in the component already declares `scheduledFor: string | null`, so the cast is fighting the component's own type. The correct fix is to type the API response's deposit field using the component's `DepositRow` type directly.

### `rowCount` guard in `adminUpdateDeposit`

```ts
if ((result.rowCount ?? 0) === 0) return { ok: false, error: "Not found." };
```

The `pg` driver does return `rowCount` for UPDATE statements. The `?? 0` null-coalescing already guards against `null`. This is behaviorally correct with the current driver stack. It is worth a comment noting the Drizzle quirk for future maintainers.

### `inArray` empty-array guard in `adminGetApplicationBalances`

```ts
if (appIds.length === 0) return new Map();
```

This is correct and necessary. Drizzle's `inArray` with an empty array generates `WHERE col IN ()`, which is a SQL syntax error in PostgreSQL. The guard prevents it. The pattern should be documented with a comment so future refactors don't accidentally remove it.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `src/lib/service.ts` | Added `AdminDepositInput`, `AdminDashboardStats`, `TierBreakdown`, `StatusDistribution`, `DepositTypeTotals` types; added `adminGetDashboardStats`, `adminGetDepositsByApplication`, `adminAddDeposit`, `adminUpdateDeposit`, `adminDeleteDeposit`, `adminGetApplicationBalances` |
| `src/app/api/admin/stats/route.ts` | GET handler returning `adminGetDashboardStats`, auth-gated |
| `src/app/api/admin/applications/[reference]/deposits/route.ts` | New POST handler for adding a deposit to an application, auth-gated |
| `src/app/api/admin/deposits/[id]/route.ts` | New PUT and DELETE handlers for editing/deleting a deposit by ID, auth-gated |
| `src/app/admin/(protected)/page.tsx` | Dashboard rebuilt with 6 stat tiles, tier breakdown with progress bars, pipeline status distribution, deposit-type totals, and recent applications table |
| `src/app/admin/(protected)/applications/page.tsx` | Applications list adds Balance and Tier columns; pagination and filter remain; uses `adminGetApplicationBalances` for batch balance query |
| `src/app/admin/(protected)/applications/[reference]/page.tsx` | Detail page wires `DepositsPanel` and serializes deposit dates before passing to client |
| `src/components/admin/DepositsPanel.tsx` | New client component: inline edit row, add-form, delete with confirmation, balance summary tiles, `formatUSD` throughout |

Full diff base: local working tree.

</details>
