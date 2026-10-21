# Admin portal UX overhaul — mobile responsiveness, deposit editing, dashboard redesign

The two commits under review (`a24b234`, `685dc07`) overhaul the admin portal to make it usable on mobile and to satisfy the workflow requirement that the admin can manually record deposits without navigating away. The key changes are: extracting the sidebar + hamburger into a new `AdminShell` client component; adding a permanently-visible "Record a New Deposit" form at the top of `DepositsPanel`; redesigning deposit rows into mobile cards; upgrading the dashboard stat tiles to `text-3xl` with hover lift; and introducing mobile card views on both the applications list and the dashboard's recent-applications section.

Watch for: **confirmed** — the `update()` function in `ApplicationEditForm` casts every field value through `value || null`, which silently nullifies required string fields when the user types a single space or clears a field. **confirmed** — the hamburger button in `AdminShell` has no visible icon label and only an `aria-label`; the three `<span>` bars render with no `aria-hidden="true"`, so screen readers will announce them as unlabeled elements inside the already-labeled button.

**Verdict**: NEEDS_CHANGES

---

## High-level view

The layout refactor moves the entire sidebar from a static server component into `AdminShell`, a `"use client"` component that manages `sidebarOpen` state. On desktop (`md:`) the sidebar is `static` with `translate-x-0`; on mobile it is `fixed` with `translate-x-full` until the hamburger is tapped. A semi-transparent overlay (`admin-sidebar-overlay`) sits at z-39 and dismisses the drawer on tap. Main content is in a flex sibling that always receives focus and is never obscured when the sidebar is closed.

`DepositsPanel` now renders the "Record a New Deposit" form unconditionally at the top — there is no `showAddForm` toggle state. The form is visually distinguished with a green `admin-deposit-add-card` border and header strip. Below it, five balance tiles summarise posted amounts by type. Below those, a `sm:hidden` block renders deposits as stacked cards on mobile and a `hidden sm:block` wrapping div shows the table on larger screens. Both the mobile cards and the desktop table carry `✏️ Edit` and `🗑️ Delete` buttons with explicit emoji labels and red background on destructive actions.

The dashboard stat tiles use `font-serif text-3xl font-bold`, a 2-column grid on mobile (`grid-cols-2`), and an `admin-stat-tile` CSS class that applies a hover lift via `transform: translateY(-2px)` and a box-shadow transition. All six tiles are confirmed to have the correct grid class.

The applications list page adds a `sm:hidden` card section that renders child name, guardian name, state, tier badge, balance, and a full-width "Open" button for each row. The existing desktop table is unchanged.

The detail page (`[reference]/page.tsx`) keeps the outer grid at `grid-cols-1` with `lg:grid-cols-3`, so on mobile everything stacks to a single column. A deposit callout banner links to `#deposit-ledger` and sits above the grid.

---

<details>
<summary>Issues (3)</summary>

1. **Nullifying required fields on clear** — `ApplicationEditForm.update()` calls `setFields((prev) => ({ ...prev, [key]: value || null }))`, which coerces any falsy string (empty, single space) to `null` for fields typed as `string` (e.g. `parentFullName`, `childFirstName`). The API will receive `null` for required string columns and may produce a database error or silently store null. Change the expression to `value` (no `|| null`) and guard nullable fields explicitly.

2. **Screen-reader noise inside hamburger button** — The three `<span>` bar elements inside the hamburger `<button>` have no `aria-hidden="true"`. The button itself has `aria-label="Open navigation menu"`, but the spans will still be visited by some screen readers as anonymous inline elements. Add `aria-hidden="true"` to each span.

3. **Missing key prop bug carried over as a commit — verify it is actually fixed** — Commit `ffea694` claims to fix the missing-key prop in `AdminInquiriesTable`. In the current code the `key` is on `<Fragment key={row.id}>`, which is correct. However the error stack trace in the original report points to the same component, so confirm the fix deployed and the browser console is clean. No code change needed, but manual smoke-test is warranted.

</details>

---

<details>
<summary>Details</summary>

### Sidebar and mobile layout

The old layout was a server component with a static `<aside>` — no way to hide or toggle it on narrow viewports. The refactor correctly moves the drawer into a client component so `useState` can drive the `translate-x` transition.

The sidebar has `aria-label="Admin navigation"`, which is correct. The hamburger button has `aria-expanded={sidebarOpen}` wired to state and `aria-label="Open navigation menu"` — the label does not update to "Close" when open, but this is a minor UX gap rather than a blocking accessibility failure. The three child `<span>` elements are presentational icon bars that should carry `aria-hidden="true"` to prevent screen readers from enumerating them inside the already-labeled control. This is confirmed absent in the current code.

The overlay div uses `aria-hidden="true"` and `onClick={() => setSidebarOpen(false)}`, so tap-to-dismiss works correctly. The `z-40` sidebar sits above the `z-39` overlay. There is no `Escape` key handler to close the drawer; keyboard-only users who open the menu must Tab through the nav links to reach the close button path indirectly. This is a usability gap but not a blocking a11y failure for this prototype.

### "Record a New Deposit" form placement and visibility

The add-form state is initialized at the top of the component with `useState<AdminDepositInput>(DEFAULT_ADD)` and is rendered unconditionally — no toggle, no hidden class. The `admin-deposit-add-card` CSS class in `globals.css` gives it a visible green 2px border and a filled header strip, making it the most visually prominent element in the panel. This directly satisfies the original request ("i cant see where to add a new row").

Client-side validation runs before the fetch: empty description, non-positive amount, and missing type/status all surface an inline error banner inside the card. The "Clear form" button resets `addFields` to `DEFAULT_ADD` without a page reload.

### Edit and Delete button labeling

In the desktop table read-row: `"✏️ Edit"` renders as a `usa-button--outline-dark` and `"🗑️ Delete"` renders with inline `backgroundColor: var(--color-gov-red)`. In the mobile card view the same emoji labels are present, with `flex-1` to make each button span half the card width. The destructive button's red background is applied via inline style (not a CSS class), which is consistent with how the codebase handles one-off color tokens.

Desktop edit-row inputs use `aria-label` attributes (`aria-label="Type"`, `aria-label="Amount"`, etc.) added in the fixup commit `685dc07`. Mobile edit-form inputs use proper `<label htmlFor>` pairs. Both paths have accessible labeling.

### ApplicationEditForm null-coercion bug

`update()` does `setFields((prev) => ({ ...prev, [key]: value || null }))`. For nullable fields like `parentAddressLine2` and `childMiddleName` this is intentional — the caller can pass an empty string to clear them. But the same function is used for required fields (`parentFullName`, `parentEmail`, `childFirstName`, `childLastName`). Clearing those fields sends `null` to the API, which will fail at the database layer or pass bad data to Drizzle's update. The fix is to use `value` without the `|| null` coercion and handle nullable fields in the `update` call-sites or by checking the key.



</details>

---

<details>
<summary>File map</summary>

| File | What changed |
|---|---|
| `src/app/admin/(protected)/layout.tsx` | Stripped inline sidebar; now delegates to `AdminShell` |
| `src/components/admin/AdminShell.tsx` | New client component: hamburger, overlay, collapsible sidebar, mobile top bar |
| `src/components/admin/DepositsPanel.tsx` | Always-visible add form at top; balance tile grid; mobile card view; emoji-labeled edit/delete buttons; aria-labels on desktop inputs |
| `src/app/admin/(protected)/page.tsx` | Stat tiles upgraded to `text-3xl` with hover class; 2-col mobile / 3-col desktop grid; mobile card list for recent applications |
| `src/app/admin/(protected)/applications/page.tsx` | Added `sm:hidden` mobile card section with child name, guardian, balance, Open button |
| `src/app/admin/(protected)/applications/[reference]/page.tsx` | Added deposit callout banner; grid set to `grid-cols-1 lg:grid-cols-3` |
| `src/app/globals.css` | Added `admin-sidebar-overlay`, `admin-deposit-add-card`, `admin-balance-tile`, `admin-stat-tile` classes |
| `src/components/admin/ApplicationEditForm.tsx` | Minor: success/error div wording unchanged; null-coercion pattern pre-exists and is not fixed |
| `src/components/admin/ApplicationStatusPanel.tsx` | Minor: button width classes adjusted to `w-full sm:w-auto` |

Full diff: `git diff ffea694 HEAD`

</details>
