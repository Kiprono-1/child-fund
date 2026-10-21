# Findings — ChildTrustFund.gov (Next.js 16 / Drizzle / PostgreSQL)

Read-only investigation of the codebase. All claims are grounded in files actually read; file
paths are cited as `path` (line numbers where useful). No code was changed.

---

## 0. Summary

This is a single Next.js 16 App Router app backed by PostgreSQL via `pg` + Drizzle, styled with
Tailwind v4 (no config file; tokens in `@theme`). All business logic lives in `src/lib/*`; pages and
route handlers are thin. Money is integer cents throughout. A bootstrap in `service.ts`
(`ensureSchema()` + 120-row seed, single-flight) makes it self-initializing.

**Eight questions, quick answers** (details in §3):

1. Benefits: federal seed `$1,000.00` (auto cohort, born 2025–2028), birthday supplement `$150.00/yr`
   to age 6, no seed for guardian-funded (born 2015–2024), legacy for pre-2015. Defined in
   `src/lib/program.ts` (`FEDERAL_SEED_CENTS=100000`, `FEDERAL_SUPPLEMENT_CENTS=15000`,
   `AUTO_ENROLLMENT_YEARS=[2025,2026,2027,2028]`). $5,000/yr contribution limit
   (`ANNUAL_CONTRIBUTION_LIMIT_CENTS=500000`). Projection assumes 4.5%.
2. Pipeline: `submitted → under_review → approved → funded` (`STATUS_FLOW` in `service.ts`);
   `verification_required` is a hold state. `advanceApplication()` moves one step; reaching `funded`
   writes deposit rows. Deposit statuses: `scheduled | processing | posted | returned` (only
   `scheduled`/`posted` are ever written by app code).
3. API contract matches the documented contract (JSON `{ok,...}`, 422 field errors, 4xx/500
   messages, 403 on lastName mismatch). Minor deviations noted in §4.
4. Wizard: 6 steps (Guardian, Residence & State, Child, Trust Account, Verification, Review &
   Certify), drafts to `localStorage`, POSTs the full `FormState` (with `monthlyContribution` in
   dollars) to `/api/applications`, then optionally POSTs documents to `.../actions`.
5. Six tables: `applications`, `deposits`, `verification_documents`, `application_events`,
   `inquiries`, `newsletter_signups`. Money (cents): `deposits.amount_cents` and the four
   `*_amount`/`monthly_contribution` integers on `applications`.
6. `@theme` color tokens listed in §6; key classes: `.usa-button`, `.usa-input`, `.usa-label`,
   `.usa-hint`, `.usa-card`, `.usa-prose`, `.usa-tag`, `.usa-table`, `.gov-rule`, `.skip-link`.
7. NAV: 6 top-level items (About the Program [5 children], Register a Child, Verify Identity, Track
   Application, Make a Deposit, Resources [4 children], Contact Us). Prototype disclaimer: a
   bordered box near the bottom of `SiteFooter.tsx`.
8. Discrepancies: (a) state-match range shown as `$200–$550` on 3 pages but data/README say
   `$150–$550`; (b) home page "All 24 questions" vs 30 FAQs; (c) `drizzle.config.json` targets DB
   `app_db` while `.env`/runtime use `ctf_app`; (d) no cumulative annual contribution-limit
   enforcement; (e) `earnings`/`returned`/`processing` statuses defined but unused; (f) server-side
   validation looser than client (routing/account/SSN-last4 not required server-side). See §4/§7.

---

## 1. Core library (`src/lib/*`)

### 1.1 `program.ts` — benefit rules, tiers, quotes, formatters, constants

Constants (all cents):
- `FEDERAL_SEED_CENTS = 100000` ($1,000.00)
- `FEDERAL_SUPPLEMENT_CENTS = 15000` ($150.00/yr)
- `ANNUAL_CONTRIBUTION_LIMIT_CENTS = 500000` ($5,000.00/yr)
- `AUTO_ENROLLMENT_YEARS = [2025, 2026, 2027, 2028] as const`
- Projection rate `0.045` is hardcoded inside `quoteBenefits`.

Types/exports:
- `type ParticipationTier = "automatic" | "standard" | "legacy"`
- `type TierInfo = { tier, label, headline, autoEnrollment, federalSeedCents, federalSupplementCents, contributionAllowed, summary }`
- `parseDate(value?)`, `ageFromDob(dob?, now?)` — dob is `"YYYY-MM-DD"` string.
- `tierForDob(dob?) -> TierInfo` — logic: birth year in `AUTO_ENROLLMENT_YEARS` → `automatic`
  ($1,000 seed + $150/yr supplement); year ≥ 2015 (and not auto) → `standard` (no seed, guardian
  funds); else `legacy` (pre-2015, transfer desk). All three set `contributionAllowed: true`.
- `type BenefitQuote = { stateCode, state?, tier, stateMatchCents, openingDayTotalCents, firstYearTotalCents, projectionAt18Cents, guardianContributionCents }`
- `quoteBenefits({ dob?, stateCode?, guardianMonthlyCents? }) -> BenefitQuote` — state match only
  applies to the automatic cohort; `openingDay = seed + stateMatch + guardian*12`;
  `firstYear = openingDay + supplement`; projection compounds `firstYear` at 4.5%/yr for
  `max(0,18-age)` years, adding `(supplement + guardian*12)` for the first 5 iterations only.
- `formatUSD(cents, withCents=true)`, `formatDate`, `formatDateTime`.
- `STATUS_META` — maps status string → `{ label, tone, blurb }` for: `submitted, under_review,
  verification_required, approved, funded, rejected` (tones gray/blue/gold/green/red).
- `VERIFICATION_METHODS` (4): `login_gov`, `id_me`, `document_upload`, `in_person`.
- `ACCOUNT_TYPES` (3): `ctf_savings` (3.90% APY FDIC), `ctf_growth` (index, market risk, 0.05%
  expense cap), `ctf_treasury` (Series I + 5-yr notes).
- `RELATIONSHIPS` (6 options) and `DOCUMENT_TYPES` (6 accepted doc labels).

### 1.2 `states.ts` — 56 jurisdictions

`type StateInfo = { code, name, agency, stateMatchCents, contributionMatchPct (0–100),
contributionMatchCapCents, participating }`. `STATES: StateInfo[]` has 56 entries (50 states + DC
+ AS/GU/MP/PR/VI), all `participating: true`. `STATE_BY_CODE` lookup map; `getState(code?)` is
case-insensitive.

Ranges (verified): `stateMatchCents` $150–$550 (min 15000 = American Samoa/Guam/Northern Mariana
Islands; max 55000 = DC, Massachusetts, New York); `contributionMatchPct` 15–55 (min 15 = the three
territories above; max 55 = DC/MA/NY); caps $200–$600. Example high match: NY
`stateMatchCents:55000, contributionMatchPct:55, contributionMatchCapCents:60000`. Example low:
AS `15000 / 15% / 20000`.

### 1.3 `service.ts` — all DB access, pipeline, bootstrap, seed

Exports (signatures + tables touched):
- `newReference(d=new Date()) -> "CTF-YYYY-XXXXXX"` (6 chars from `REF_ALPHABET`, no ambiguous
  chars `0/O/I/1`).
- `validateApplication(input) -> { errors }` — required-field checks + format checks (email, SSN
  last4 = 4 digits, ZIP, routing = 9 digits, accountLast4 = 4 digits, valid state, signature
  matches full name). Note: `routingNumber`, `accountLast4`, `parentSsnLast4`, `childSsnLast4`,
  `childBirthState`, `monthlyContribution` are NOT in the required list (format-checked only if
  present).
- `createApplication(input: NewApplicationInput)` — validates, computes `quoteBenefits`, inserts
  into `applications`, logs 2–3 rows into `application_events`. Returns
  `{ok, reference, status, quote}` (201) or `{ok:false, errors}` (422). Initial status is
  `"verification_required"` if `verificationMethod === "document_upload"`, else `"under_review"`
  — **real applications never start at `"submitted"`**.
- `getApplicationDetail(reference, lastName?)` — joins `applications` + `deposits` + `documents` +
  `application_events`; returns `{ application, deposits, documents, events, state, balanceCents
  (posted sum), scheduledCents (scheduled+processing sum), projectionAt18Cents }`, or `null` (404)
  or `{error}` (403 on lastName mismatch).
- `addDocuments(reference, items[])` — inserts into `documents`, updates `applications` status to
  `"under_review"` (verificationStatus `awaiting_documents` until ≥2 docs, then `in_review`),
  logs event. Returns `{ok, count}` or `{ok:false, error}`.
- `advanceApplication(reference)` — the pipeline step machine (see §3.2).
- `addGuardianDeposit(reference, amountCents, recurring)` — validates ≥$1.00 and ≤ $5,000 (single
  deposit), requires status `approved`/`funded`, computes state match `min(round(amount*pct),
  cap)`, inserts `parent_contribution` (posted) + `state_match` (scheduled +5d), sets application
  status to `"funded"`, updates `monthlyContribution` (if recurring) and adds to
  `parentContributionAmount`. Returns `{ok, matchCents}` or `{ok:false, error}`.
- `getProgramStats() -> ProgramStats` — awaits `ensureSeedData()`, then aggregate counts/sums over
  `applications` + `deposits`, plus `byState` breakdown. (Touches both tables.)
- `getRecentApplications(limit=6)` — awaits `ensureSeedData()`, selects recent `applications`.
- `createInquiry(input)` — validates name/email/message, inserts into `inquiries`.
- `subscribeNewsletter(email, state?)` — validates email, inserts into `newsletter_signups` with
  `onConflictDoNothing` (unique email).
- `resetInitialization()` — clears the single-flight promise (test helper).
- `NewApplicationInput` type (full guardian + child + account + verification + cert fields).
- Row types: `ApplicationRow`, `DepositRow`, `DocumentRow`, `EventRow`; `ApplicationDetail`.

Bootstrap:
- `ensureSchema()` — idempotent `CREATE TABLE IF NOT EXISTS` for all 6 tables + 3 indexes + one
  `ALTER` to widen `doc_type`. DDL matches `schema.ts` (column names/types).
- `ensureSeedData()` / `runSeed()` — single-flight via module-level `initPromise`; on first call
  runs `ensureSchema()`, and if `applications` is empty inserts 120 seeded applications with
  deposits + events (statuses cycle through funded/approved/under_review/verification_required/
  submitted; auto-enrollment toggled by index; DOBs split across 2025–2028 and 2016–2024). Errors
  reset `initPromise = null` and log.

### 1.4 `faq.ts`

`type Faq = { q, a, category, tag? }`. `FAQ_CATEGORIES` = 7 strings (incl. "All questions").
`FAQS` has exactly **30** entries across 6 categories (Eligibility 6, Registering 6, Verification
4, Deposits & matching 5, Using the account 5, Privacy & fraud 4). Shared by `/faq` and `/search`.

---

## 2. Data layer (`src/db/*`)

### `db/index.ts`
- Reads `process.env.DATABASE_URL` (throws if missing), creates a `pg.Pool`, caches it on
  `globalThis.__arenaNextJsPostgresqlPool` in non-production (HMR-safe), and exports `db =
  drizzle(pool)` (node-postgres driver). No other env vars.

### `db/schema.ts` — six tables
| Export name (physical table) | Key columns | Money (integer cents) | Notes |
| --- | --- | --- | --- |
| `applications` | `referenceNumber` unique; `status`; parent_*; child_*; `participationTier`; `autoEnrollment`; `accountType`; `custodianBank`; `routingNumber`; `accountLast4`; `childAccountNumber`; `verificationMethod/Status`; `identityConsent`; `penaltyOfPerjury`; `electronicSignature`; timestamps | `monthlyContribution`, `federalSeedAmount`, `stateMatchAmount`, `annualSupplementAmount`, `parentContributionAmount` | All `notNull`. `status` default `"submitted"`. |
| `deposits` | `applicationId` (FK cascade), `depositType`, `status` default `"scheduled"`, `description`, `source`, `scheduledFor`, `postedAt` | `amountCents` | `depositType` ∈ `federal_seed\|state_match\|federal_supplement\|parent_contribution\|earnings`; `status` ∈ `scheduled\|processing\|posted\|returned` |
| `documents` (`verification_documents`) | `applicationId` (FK), `docType`, `fileName`, `fileSize`, `mimeType`, `reviewStatus` default `"pending"`, `uploadedAt` | `fileSize` (bytes) | metadata only — no file contents |
| `statusEvents` (`application_events`) | `applicationId` (FK), `event`, `detail`, `actor` default `"system"`, `createdAt` | — | audit trail |
| `inquiries` | `topic`, `fullName`, `email`, `phone?`, `state?`, `referenceNumber?`, `message`, `handled` default false | — | contact form |
| `newsletterSignups` | `email` unique, `state?`, `createdAt` | — | footer subscriptions |

Export-variable names differ from physical table names for two tables (`documents` →
`verification_documents`, `statusEvents` → `application_events`), matching the documented physical
names. No explicit Drizzle `relations()` are defined; joins are done manually in `service.ts`.

---

## 3. API routes (`src/app/api/*`)

All handlers set `export const dynamic = "force-dynamic"` and use the Next 16 signature
(`params`/`searchParams` awaited as Promises). All return `Response.json`.

### 3.1 `/api/applications` (`route.ts`)
- `POST`: coerces body to `NewApplicationInput` (strings, `monthlyContribution` dollars),
  `createApplication`. Success → `201 {ok,reference,status,quote}`. Validation fail → `422
  {ok:false, errors:{field:msg}}`. Throw → `500 {ok:false, errors:{form:...}}`.
- `GET`: `getProgramStats()` → `200 {ok,stats}`. Throw → `500 {ok:false}`.

### 3.2 `/api/applications/[reference]` (`route.ts`)
- `GET`: awaits `ctx.params`; reads `?lastName` from `url.searchParams`. `getApplicationDetail`.
  Not found → `404 {ok:false,error}`. lastName mismatch → `403 {ok:false,error}`. Success → `200
  {ok, application, deposits, documents, events, state, balanceCents, scheduledCents,
  projectionAt18Cents}`. Throw → `500`.
- `POST`: body `{action:"advance"}` → `advanceApplication`; failure (already funded / needs
  documents / not found) → `409 {ok:false,error}`; success → `200 {ok, ...detail}`. Unknown action
  → `400 {ok:false,error:"Unknown action."}`. Throw → `500`.

**Pipeline step machine** (`advanceApplication`): `STATUS_FLOW = ["submitted","under_review",
"approved","funded"]`. Guards: rejects if `funded` ("already funded") or `verification_required`
("upload documents first"). `next = STATUS_FLOW[idx+1]`:
- `next === "approved"`: generate `childAccountNumber`, set status `approved`,
  verificationStatus `verified`, set `reviewedAt`/`approvedAt`, log `identity_verified` +
  `account_opened`.
- `next === "funded"`: insert deposit rows — `federal_seed` (posted, if auto & >0),
  `state_match` (posted, +3d, if auto & >0), `federal_supplement` (scheduled, next birthday, if
  >0), `parent_contribution` (posted first installment + scheduled next month, if >0); set status
  `funded`; log `funds_deposited`.

### 3.3 `/api/applications/[reference]/actions` (`route.ts`)
- `{kind:"documents", documents:[{docType,fileName,fileSize?,mimeType?}]}` → `addDocuments`;
  filters to docType+fileName present, clamps `docType` to `DOCUMENT_TYPES` or 120 chars, fileName
  ≤200, fileSize≥0. Fail → `422`; success → `200 {ok,count}`.
- `{kind:"deposit", amountDollars, recurring}` → `addGuardianDeposit(reference,
  Math.round(dollars*100), recurring)`. Fail → `422`; success → `200 {ok, matchCents}`.
- Unknown kind → `400 {ok:false,error:"Unknown request kind."}`. Throw → `500`.

### 3.4 `/api/health` (`route.ts`)
`GET` → `db.execute(sql\`select 1\`)`; success `200 {ok:true}`, catch `500 {ok:false}`.

### 3.5 `/api/inquiries` (`route.ts`)
`POST` → `createInquiry`. Fail (missing/invalid) → `422 {ok:false,error}`; success `200 {ok:true}`.
Throw → `500`.

### 3.6 `/api/newsletter` (`route.ts`)
`POST` → `subscribeNewsletter(email, state?)`. Fail → `422 {ok:false,error}`; success `200
{ok:true}`. Throw → `500`.

### 3.7 `/api/stats` (`route.ts`)
- `GET` → `getProgramStats()` → `200 {ok,stats}`; throw `500 {ok:false}`.
- `POST` → alias: `{kind:"newsletter", email, state}` → newsletter; otherwise treated as an
  inquiry (`createInquiry`). Fail `422`; success `200`. Throw `500`.

**Contract conformance:** matches the documented contract — success `{ok:true,...}` (201 on
create), validation `{ok:false,errors:{field}}` → 422, single-message `{ok:false,error}` →
400/403/404/409, unexpected → 500 with `console.error`. Case lookup requires `?lastName` and 403
on mismatch. ✓

---

## 4. Client components

### `RegistrationWizard.tsx` (6-step wizard)
- `"use client"`. Steps (`STEP_NAMES`): Guardian, Residence & State, Child, Trust Account,
  Verification, Review & Certify.
- `FormState` carries: guardian fields, residence fields, child fields, `accountType` (default
  `"ctf_savings"`), `custodianBank/routingNumber/accountLast4`, `monthlyContribution` (dollars,
  default 0), `verificationMethod`, and cert booleans + `electronicSignature`.
- Drafts persist to `localStorage` under `ctf-application-draft-v1` (hydration-guarded).
- Live quote via `useMemo(quoteBenefits({dob, stateCode, guardianMonthlyCents: monthly*100}))`.
- Per-step `validate(target)` (client-side) mirrors but is stricter than server (e.g. routing=9
  digits, accountLast4=4 digits, monthly 0–416, childDob not future, signature matches name).
- `submit()` POSTs `{...form, monthlyContribution: Number}` to `/api/applications`; on success, if
  files were staged, POSTs `{kind:"documents", documents:files}` to `.../actions`, clears the
  draft, and renders a confirmation card with the reference number + opening-deposit summary +
  links to `/status?ref=...&last=...`.

### `StatusTracker.tsx`
- `"use client"`. Lookup by reference + child lastName → `GET /api/applications/[ref]?lastName=`.
  Renders: summary header (balance = `formatUSD(balanceCents)`), a 5-step `PIPELINE` visual
  (`submitted/under_review/verification_required/approved/funded`), Account/Verification/Benefit
  info blocks, a documents upload form (shown when `verification_required` or not verified), a
  deposit form (shown when `approved`/`funded`), the deposit ledger table, and a case-history
  timeline. "Run next agency review step" button → `POST ... {action:"advance"}` (disabled when
  funded). `EVENT_LABELS` and `DEPOSIT_TYPE_LABEL` map raw keys to labels.

### `DepositForm.tsx`
- `"use client"`. Lookup (reference + lastName) → same GET. Live state-match preview:
  `matchPreview = min(round(amount*pct), cap/100)`. Contributes → `POST .../actions {kind:"deposit",
  amountDollars, recurring}`. Disables contribution unless status is `approved`/`funded`.

### Other components
- `StateTable.tsx` — sortable/filterable table of all 56 jurisdictions + click-to-select detail
  aside showing opening match, % match, cap, and "register in X" CTA.
- `FaqExplorer.tsx` — category tabs (from `FAQ_CATEGORIES`, with live counts), text search,
  groups results by category into `Accordion`s. Uses `FAQS.length` dynamically.
- `CompoundCalculator.tsx` — sliders (age, initial, stateMatch, monthly, rate) → inline SVG line
  chart (with-program vs savings-only). Includes the $150/yr supplement until age 6.
- `ContactForm.tsx` — topic/name/email/phone/state/reference/message → `POST /api/inquiries`.
- `Accordion.tsx` — accessible disclosure (`aria-expanded`/`aria-controls`, `useId`).
- `GovBanner.tsx` — expandable official-.gov banner with inline SVG flag + "how you know" panel.
- `SiteHeader.tsx` — seal+wordmark, search box, dropdown nav (hover + mobile accordion), CTA.
- `SiteFooter.tsx` — link columns, Guardian Bulletin newsletter form → `/api/newsletter`, legal
  row, **prototype disclaimer** (bordered box, "Demonstration prototype.").
- `ui.tsx` — shared server-safe primitives: `Breadcrumbs, PageHero, SectionHeading, Callout,
  StatTile, FeatureCard, StepList, StatusBadge, Icon` (inline SVG set: baby, shield, bank, chart,
  document, check, clock, pin, phone, mail, star, book).

---

## 5. Pages (`src/app/*/page.tsx`)

| Page | Composes / reads |
| --- | --- |
| `page.tsx` (home) | `db.execute(select 1)` then `getProgramStats()` + `getRecentApplications(6)`; hero, quick actions, live stats, benefit-by-year table, top-8 states table, `CompoundCalculator`, news, `Accordion` FAQ teaser. Hot-links Pexels images. |
| `about/page.tsx` | `getProgramStats()`; mission, governance board, history timeline, newsroom stats. |
| `how-it-works/page.tsx` | Static content; deposit schedule, two hardcoded worked examples (OH auto / TX guardian), age-18 uses. |
| `eligibility/page.tsx` | Static content; qualify/blockers/special-situations, cohort benefit table, eligibility FAQ `Accordion`. |
| `states/page.tsx` | Static; avg/high/low StatTiles + `StateTable`. |
| `program-data/page.tsx` | `await getProgramStats()` FIRST, then raw SQL aggregates (by status, cohort, deposit type, verification method, monthly trend) over `applications`/`deposits`. |
| `apply/page.tsx` | `RegistrationWizard` + help section. |
| `verify/page.tsx` | `VERIFICATION_METHODS`/`DOCUMENT_TYPES`/`STATES`; 4 methods, checklist, offices table. |
| `status/page.tsx` | Awaits `searchParams` ({ref,last}); `StatusTracker`. |
| `deposit/page.tsx` | Awaits `searchParams` ({ref}); `DepositForm`. |
| `resources/page.tsx` | `CompoundCalculator` + guides/forms/glossary/classroom. |
| `faq/page.tsx` | `FaqExplorer` + sidebar. |
| `contact/page.tsx` | `ContactForm` + channels + state offices. |
| `search/page.tsx` | Awaits `searchParams` ({q}); builds an in-memory index of `PAGES` (12) + `FAQS` (30) + `STATES` (56), scores results. |

DB-backed pages (`page.tsx`, `about`, `program-data`) set `export const dynamic = "force-dynamic"`.
Pages reading `searchParams` (`status`, `deposit`, `search`) await it. ✓

---

## 6. Tailwind v4 tokens & classes (`globals.css`)

`@import "tailwindcss";` then `@theme {}` (no `tailwind.config.js`). Color tokens (generate
`bg-*`/`text-*`/`border-*` utilities):

| Token | Value | | Token | Value |
| --- | --- | --- | --- | --- |
| `--color-gov-ink` | `#1b1b1b` | | `--color-gov-accent` | `#ffbe2e` |
| `--color-gov-navy` | `#112e51` | | `--color-gov-accent-dark` | `#c99400` |
| `--color-gov-navy-deep` | `#0a1c33` | | `--color-gov-warm` | `#fa9441` |
| `--color-gov-primary` | `#005ea2` | | `--color-gov-red` | `#d83933` |
| `--color-gov-primary-dark` | `#1a4480` | | `--color-gov-red-dark` | `#b50909` |
| `--color-gov-primary-darker` | `#162e51` | | `--color-gov-green` | `#4d8055` |
| `--color-gov-primary-light` | `#73b3e7` | | `--color-gov-green-dark` | `#216e1f` |
| `--color-gov-primary-lighter` | `#d9e8f6` | | `--color-gov-green-light` | `#70e17b` |
| `--color-gov-primary-lightest` | `#eff6fb` | | `--color-gov-base` | `#71767a` |
| | | | `--color-gov-base-light/lighter/lightest` | `#dfe1e2`/`#f0f0f0`/`#f7f9fb` |

Fonts: `--font-sans` → `--font-public-sans`, `--font-serif` → `--font-source-serif`. Component
classes are plain CSS (no `@apply`): `.usa-button` (+ `--primary/--accent/--outline/--outline-dark`,
`:disabled`), `.usa-input` (+ `--error`), `.usa-label`, `.usa-hint`, `.usa-card`, `.usa-prose`,
`.usa-tag`, `.usa-table` (caption/th/td/zebra), `.gov-rule`, `.skip-link` (+ `:focus`),
`.gov-banner-flag`, plus a `@media print { .no-print }` rule and `:focus-visible` ring.

---

## 7. NAV structure & disclaimer location

`SiteHeader.tsx` `NAV` (top-level, in order):
1. **About the Program** (`/about`) — children: About, How It Works, Eligibility, State
   Participation, Program Data.
2. **Register a Child** (`/apply`)
3. **Verify Identity** (`/verify`)
4. **Track Application** (`/status`)
5. **Make a Deposit** (`/deposit`)
6. **Resources** (`/resources`) — children: Financial Education, Savings Calculator
   (`/resources#calculator`), Forms & Publications (`/resources#forms`), FAQ (`/faq`).
7. **Contact Us** (`/contact`)

Header also has a search box (→ `/search?q=`), a "Login.gov Sign in" link, and a "Register a child
now" accent button; mobile menu replicates NAV with expandable submenus.

**Prototype disclaimer** lives in `SiteFooter.tsx`, in a bordered box (`border-gov-accent/40
bg-gov-accent/10`) with `<strong>Demonstration prototype.</strong>` followed by the "not an
operating federal service / no real money / no real identity checks / no data shared" text. The
footer also has the Guardian Bulletin newsletter form (→ `/api/newsletter`), three link columns,
the legal row, and seal/authority text.

---

## 8. Discrepancies, gaps, and things to flag

**Content vs. data (repeated in 3 places):**
1. State opening-match range is shown as **`$200 – $550`** on the home page (`page.tsx` benefit
   table), `eligibility/page.tsx` (cohort table), and `how-it-works/page.tsx` (deposit schedule).
   The actual data floor is **$150** (American Samoa, Guam, Northern Mariana Islands = 15000
   cents). The `README.md` and `states/page.tsx` both correctly state `$150 – $550`. → Fix the
   three hardcoded `$200` lower bounds to `$150`.
2. Home page FAQ teaser link text says **"All 24 questions"** (`page.tsx`), but `FAQS` has **30**
   entries (confirmed). `FaqExplorer` and the search/faq metadata use the count dynamically.
   → Change "24" to "30" (or derive from `FAQS.length`).
3. `eligibility/page.tsx` and `faq.ts` describe a **Supplemental Child Endowment of $250** for
   households <200% FPL ("credited automatically after the annual IRS data match"). This benefit
   is **not represented in `program.ts`** — no constant, no tier flag, no deposit row is ever
   created for it. Per the product guardrail ("Do not invent new benefit amounts without updating
   `program.ts`"), this is a content/code mismatch: the $250 endowment is described to users but
   never modeled or paid. (Intentionally out-of-band per the copy, but worth a deliberate decision.)

**Config / environment:**
4. `drizzle.config.json` hardcodes `dbCredentials.url` =
   `postgresql://postgres:postgres@127.0.0.1:5432/app_db`, but `.env.example` (and the runtime, via
   `DATABASE_URL`) use `ctf_app`. So `npx drizzle-kit push` would target a **different database**
   than the app connects to. (Functionally masked because `ensureSchema()` creates the tables in
   the runtime DB on first request.) → Make `drizzle.config.json` read `DATABASE_URL` (or align
   the DB name to `ctf_app`).

**Validation / business-rule gaps:**
5. **No cumulative annual contribution limit.** `addGuardianDeposit` only rejects a single deposit
   `> $5,000`; it never sums prior `parent_contribution` deposits in the program year. Multiple
   $5,000 deposits would each succeed, contradicting the FAQ ("$5,000 per child per program year,
   counting all contributors … above the limit are returned"). The FAQ also says over-limit
   contributions are "returned," but the code returns a 422 error rather than creating a `returned`
   deposit row.
6. `validateApplication` (server) is **looser than the wizard**: `routingNumber`,
   `accountLast4`, `parentSsnLast4`, `childSsnLast4`, `childBirthState`, and `monthlyContribution`
   are not in the required set (only format-checked when present). A direct API call could omit
   routing/account/SSN; SSN-last4 default to `"0000"` in `createApplication`. The client enforces
   them; the server does not.
7. **Unused enum values:** `DepositType "earnings"` and `DepositStatus "processing"`/`"returned"`
   are defined in `schema.ts` and surfaced in UI label maps, but no app code ever inserts them.
   `earnings` never appears as a deposit; `returned`/`processing` never appear as a deposit status.

**Minor / process:**
8. `createApplication` never sets initial status `"submitted"` (jumps to `under_review` or
   `verification_required`). The `"submitted"` status is only ever produced by the seed routine and
   is the first step of `STATUS_FLOW`. Not a bug, but means real cases skip the first pipeline node.
9. Home page issues a raw `db.execute(sql\`select 1\`)` **before** calling `getProgramStats()`,
   which technically deviates from the steering rule "go through `getProgramStats()`/
   `getRecentApplications()` before issuing raw queries." Harmless (`select 1` needs no tables) and
   `getProgramStats()` still runs `ensureSeedData()`; `program-data/page.tsx` follows the rule
   correctly and is the model to copy.
10. `how-it-works/page.tsx` worked examples hardcode projection totals ("Estimated growth at 4.5%"
    `$21,600`, "Projected balance at age 18" `$34,000`) as literal strings rather than deriving
    them from `quoteBenefits`. Illustrative only, but can drift from the model.
11. Images are hot-linked from Pexels via plain `<img>` (home, resources, and a few others). No
    `next.config.ts` `images.remotePatterns` — consistent with the steering note; do not switch to
    `next/image` without adding remote patterns and confirming outbound network at build/runtime.

---

## 9. Recommendations (implement nothing)

- Replace the three `$200 – $550` state-match strings with `$150 – $550` (or compute from
  `STATES` min/max).
- Change the home page "All 24 questions" to 30 (or `FAQS.length`).
- Decide on the $250 Supplemental Child Endowment: either add it to `program.ts` (constant + a
  `federal_supplement`-style deposit) or soften the copy to "proposed/illustrative."
- Align `drizzle.config.json` with `DATABASE_URL`/`ctf_app`.
- Add program-year cumulative contribution tracking in `addGuardianDeposit` (sum existing
  `parent_contribution` deposits since Oct 1) and either create a `returned` deposit row or keep
  the 422 — but reconcile with the FAQ wording.
- Tighten server-side `validateApplication` to require routing/account/SSN-last4, matching the
  wizard.
- (Optional) housekeeping: either wire `earnings`/`processing`/`returned` into a flow or document
  them as reserved-for-future-use.

## 10. Verification of scope

All file groups in the brief were read: `lib/{program,states,service,faq}.ts`, `db/{index,schema}.ts`,
all 7 API routes, all 11 client components, `layout.tsx`/`globals.css`/`page.tsx`, and every other
`page.tsx`. All 8 explicit questions are answered (§0 summary + §3/§6/§7/§8 detail). Nothing was
skipped.
