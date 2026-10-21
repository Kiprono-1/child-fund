---
inclusion: always
---

# Tech stack

## Runtime

- **Next.js 16.2** App Router, React 19.2, TypeScript 5.9 (`strict: true`)
- **PostgreSQL** via `pg` 8.20 + **Drizzle ORM** 0.45 / drizzle-kit 0.31
- **Tailwind CSS v4** through `@tailwindcss/postcss`
- Node 20.9+ (developed on Node 22)

## Commands

```bash
npm run dev         # next dev
npm run build       # next build
npm start           # next start
npm run typecheck   # tsc --noEmit
npm run lint        # eslint .
npx drizzle-kit push   # apply src/db/schema.ts to the database
```

Path alias: `@/*` → `./src/*`.

## Environment

One variable only:

```
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/ctf_app
```

Read server-side through `src/db/index.ts`. Never expose it to the client; there
are no `NEXT_PUBLIC_*` variables in this project.

## Tailwind v4 specifics (important)

- There is **no `tailwind.config.js`**. Design tokens live in the `@theme {}`
  block of `src/app/globals.css` as CSS variables:
  `--color-gov-navy`, `--color-gov-primary`, `--color-gov-accent`, `--font-sans`,
  `--font-serif`, etc. They generate utilities like `bg-gov-navy`, `text-gov-accent`.
- Reusable component classes (`.usa-button`, `.usa-input`, `.usa-label`,
  `.usa-card`, `.usa-table`, `.usa-tag`, `.usa-hint`, `.gov-rule`, `.usa-prose`)
  are written as **plain CSS**, not `@apply`. Extend them the same way.
- To add a colour: add a `--color-gov-*` token in `@theme`, then use it as a utility.

## Typography

`next/font/google` in `src/app/layout.tsx`:

- `Public_Sans` → `--font-public-sans` → `font-sans` (body)
- `Source_Serif_4` → `--font-source-serif` → `font-serif` (headings, numerals)

Both are variable fonts — do **not** pass a `weight` option. The first build
needs network access to fetch them.

## Images

- Local seals: `public/img/gov-seal.png`, `public/img/ctf-seal.png`; favicon at
  `src/app/icon.png`.
- Photography is hot-linked from Pexels using plain `<img>` tags (browser-side
  fetch), so `images.remotePatterns` in `next.config.ts` is intentionally absent.
  Do not switch these to `next/image` without adding remote patterns and
  confirming the server has outbound network access.

## Data layer

Six tables in `src/db/schema.ts`:

| Table | Purpose |
| --- | --- |
| `applications` | One row per registered child account (guardian + child + account + verification) |
| `deposits` | Ledger entries: `federal_seed`, `state_match`, `federal_supplement`, `parent_contribution`, `earnings`; status `scheduled` \| `processing` \| `posted` \| `returned` |
| `verification_documents` | Metadata only for uploaded documents |
| `application_events` | Case history / audit trail |
| `inquiries` | Contact-form messages |
| `newsletter_signups` | Footer subscriptions (unique email) |

**All money columns are integer cents.**

### Schema bootstrap

`src/lib/service.ts` exposes `ensureSchema()` (idempotent `CREATE TABLE IF NOT
EXISTS` DDL + indexes) and a seed routine that inserts a 120-child demonstration
register when the table is empty. It is wrapped in a **single-flight promise**
(`initPromise`) so concurrent cold-start requests never query half-created
tables. Any new DB-backed page must go through `getProgramStats()` /
`getRecentApplications()` (or await one of them) **before** issuing raw queries.

### Where logic lives

- `src/lib/program.ts` — benefit rules, tiers, quotes, formatting helpers,
  status metadata, verification methods, account types, document types.
- `src/lib/states.ts` — the 56 jurisdictions with match amounts and agencies.
- `src/lib/service.ts` — every DB read/write and the whole case pipeline.
  Route handlers stay thin: parse → call service → shape the response.
- `src/lib/faq.ts` — 30 Q&A entries shared by `/faq` and `/search`.

## API contract

Route handlers use the Next 16 signature — `params` is a Promise:

```ts
type Ctx = { params: Promise<{ reference: string }> };
export async function GET(req: Request, ctx: Ctx) {
  const { reference } = await ctx.params;
}
```

Pages that read `searchParams` must `await` it too. Every DB-backed page or
route sets `export const dynamic = "force-dynamic"`.

All endpoints return JSON:

- success: `{ ok: true, ...payload }` (201 for creation)
- validation failure: `{ ok: false, errors: { fieldName: "message" } }` → **422**
- single-message failure: `{ ok: false, error: "message" }` → 400 / 403 / 404 / 409
- unexpected: `{ ok: false, error: "..." }` → **500**, with `console.error` server-side

Case lookup requires `?lastName=<child's last name>` and returns 403 on mismatch.

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/health` | GET | `select 1` liveness probe |
| `/api/applications` | POST | Create an application (validates, computes quote, logs events) |
| `/api/applications` | GET | Aggregate program statistics |
| `/api/applications/[reference]` | GET | Full case detail (application, deposits, documents, events, balances) |
| `/api/applications/[reference]` | POST | `{ action: "advance" }` — next pipeline step |
| `/api/applications/[reference]/actions` | POST | `{ kind: "documents", documents: [...] }` or `{ kind: "deposit", amountDollars, recurring }` |
| `/api/inquiries` | POST | Contact form |
| `/api/newsletter` | POST | Footer subscription |
| `/api/stats` | GET/POST | Statistics / inquiry / newsletter alias |

## Client components

Marked `"use client"`: `GovBanner`, `SiteHeader`, `SiteFooter`,
`RegistrationWizard`, `StatusTracker`, `DepositForm`, `StateTable`,
`FaqExplorer`, `CompoundCalculator`, `ContactForm`, `Accordion`.
They fetch with `fetch()` and render `data.error` / `data.errors` inline.
Everything else is a server component — keep pages on the server unless they
need state, and pass primitives (not Drizzle rows with `Date` objects) into
client components where possible.

## Testing posture

There is no unit-test framework wired up. Validation is:
`npx next typegen` → `npm run typecheck` → `npm run build`, then a manual
lifecycle smoke test (register → verify → advance → funded → deposit).
