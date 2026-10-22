# Trump.Account.gov — U.S. Trump Account Administration

A full-stack Next.js (App Router) + PostgreSQL/Drizzle prototype of a United States
government benefits site that distributes Trump Account money into custodial
accounts registered by a parent or legal guardian.

> **Demonstration prototype.** Built as an academic state-government project. It is
> not an operating federal service: no real money moves, no real identity checks are
> performed, and nothing submitted here is shared with any government agency.

---

## 1. Prerequisites

| Tool       | Version            | Check          |
| ---------- | ------------------ | -------------- |
| Node.js    | 20.9+ (22 LTS used in development) | `node -v` |
| npm        | 10+                | `npm -v`       |
| PostgreSQL | 14+                | `psql --version` |

No other services are required. There is no Docker, Redis, queue or third-party API
key. Remote photography is hot-linked from Pexels with plain `<img>` tags, so no
`next.config` image allow-list is needed.

## 2. Install

```bash
npm ci            # or: npm install
cp .env.example .env
```

## 3. Database

Create an empty database and point `DATABASE_URL` at it:

```bash
createdb ctf_app          # or: psql -c "CREATE DATABASE ctf_app;" postgres
```

```bash
# .env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/ctf_app
```

### Using a managed Postgres (Neon) instead of local Postgres

You can skip the local install and use a hosted Postgres such as
[Neon](https://neon.tech) (or Supabase). The app is provider-agnostic — any
managed Postgres works.

1. Create a Neon project (the free tier is fine). In the dashboard, copy the
   **Pooled connection** string (the `-pooler` endpoint) — it scales better
   than the direct endpoint.
2. Set it as `DATABASE_URL` in `.env` (locally) and in your host's environment
   variables (in production). SSL is enabled automatically for non-localhost
   hosts; set `DATABASE_SSL=no-verify` only if your host rejects the
   certificate.
3. **Cold starts:** Neon suspends idle computes, so the first connection after
   inactivity can take several seconds to wake (the pool's 30s connect timeout
   allows for this). If connections get reset before waking, resume the compute
   from the Neon dashboard.

```bash
# .env (Neon, pooled connection)
DATABASE_URL=postgresql://[user]:[password]@ep-[id]-pooler.[region].aws.neon.tech/[db]?sslmode=require
```

Then either:

```bash
npx drizzle-kit push      # explicit schema push
```

…or just start the app. `src/lib/service.ts` contains an idempotent
`ensureSchema()` + seed routine that runs once on the first database-backed
request: it creates all six tables if missing and inserts a 120-child
demonstration register with deposits and case-history events. The routine is
single-flight, so concurrent cold-start requests are safe.

## 4. Run

```bash
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## 5. Smoke test (optional)

```bash
curl -s localhost:3000/api/health          # {"ok":true}
curl -s localhost:3000/api/stats | head -c 300
```

Full lifecycle: register a child at `/apply` → note the `TA-YYYY-XXXXXX`
reference → upload documents (if that method was chosen) at `/status` →
click **Run next agency review step** until the account shows **Funded** →
make a contribution at `/deposit`.

---

## 6. Architecture

```
src/
  app/
    layout.tsx            Root layout: fonts, header, footer, skip link
    globals.css           Tailwind v4 @theme tokens + USWDS-style component classes
    page.tsx              Home (dynamic — reads live program statistics)
    about/ how-it-works/ eligibility/ states/ program-data/
    apply/ verify/ status/ deposit/ resources/ faq/ contact/ search/
    api/
      health/             Liveness probe (select 1)
      applications/       POST create application · GET aggregate stats
        [reference]/      GET case detail (?lastName= guard) · POST {action:"advance"}
          actions/        POST {kind:"documents"|"deposit"}
      stats/ inquiries/ newsletter/
  components/             SiteHeader, SiteFooter, GovBanner, RegistrationWizard,
                          StatusTracker, DepositForm, StateTable, FaqExplorer,
                          CompoundCalculator, ContactForm, Accordion, ui.tsx
  db/                     index.ts (pg Pool + drizzle) · schema.ts (6 tables)
  lib/                    program.ts (rules, money, quotes) · states.ts (56 jurisdictions)
                          service.ts (all DB + business logic, seed, schema DDL)
                          faq.ts (30 Q&A used by /faq and /search)
public/img/               gov-seal.png, ctf-seal.png
```

### Program rules (`src/lib/program.ts`)

| Rule | Value |
| --- | --- |
| Federal seed deposit | $1,000.00 — automatic cohort only |
| Automatic cohort | Born 2025, 2026, 2027, 2028 |
| Federal birthday supplement | $150.00 / year until age 6 |
| State opening match | $150 – $550, per jurisdiction (`src/lib/states.ts`) |
| State match on guardian deposits | 15% – 55%, capped per year |
| Guardian contribution limit | $5,000 per child per program year |
| Projection rate | 4.5% nominal annual return |

All money is stored as **integer cents**. Never use floats in the schema.

### Case pipeline

`submitted → under_review → approved → funded`
(`verification_required` is a hold state until documents are uploaded.)
`advanceApplication()` moves a case one step forward; reaching `funded` writes the
deposit rows (federal seed, state match, first contribution, scheduled supplement).

### Conventions worth keeping

- Next.js 16: route-handler `params` and page `searchParams` are **Promises** — always `await`.
- Tailwind CSS v4: theme lives in `@theme {}` inside `globals.css`. There is no
  `tailwind.config.js`, and `@apply` is not used — component classes are plain CSS.
- Fonts are loaded with `next/font/google` (`Public_Sans`, `Source_Serif_4`) and
  exposed as the CSS variables `--font-public-sans` / `--font-source-serif`. The
  first build needs network access to fetch them.
- Every DB-touching page or route sets `export const dynamic = "force-dynamic"`.
- API handlers return `{ ok: boolean, ... }` with a matching HTTP status; the UI
  reads `data.errors` (field map) or `data.error` (message).

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `DATABASE_URL is required` on boot | `.env` missing or not at project root |
| `relation "applications" does not exist` | Run `npx drizzle-kit push`, or hit any page once so `ensureSchema()` runs |
| Build fails fetching fonts | No network at build time — run once online, or swap `next/font/google` for local files |
| Stock photos missing | Pexels hot-links blocked offline; replace the URLs in `src/app/page.tsx` and `src/app/resources/page.tsx` with local files |
| Want a clean demo database | `drop table if exists deposits, verification_documents, application_events, inquiries, newsletter_signups, applications cascade;` then reload — it reseeds automatically |
| Port 3000 busy | `npm run dev -- -p 3001` |
| `read ECONNRESET` / `connection timeout` to Neon | The Neon compute is suspended and failing to wake — resume/restart it in the Neon dashboard, then retry. If the Neon web **SQL Editor** also fails, the compute is broken on Neon's side; if it works, a firewall/antivirus/VPN on your machine is resetting the long connection — try another network. |

---

## 8. Deploying (managed Postgres + a Node host)

The app is a dynamic Next.js server (server components + API routes), so it
needs a host that runs Node — not GitHub Pages. Keep the repo on GitHub and
deploy to Vercel, Railway, Fly, or Render.

1. **Database.** Set up a managed Postgres (Neon or Supabase) and set
   `DATABASE_URL` (see "Using a managed Postgres" above). Run the schema once:
   ```bash
   npm run db:push
   ```
   Or just start the app once — `ensureSchema()` creates the tables and seeds
   the 120-child demo register on the first request.
2. **Environment variables** on the host:
   - `DATABASE_URL` — managed-Postgres connection string (pooled endpoint).
   - `SESSION_SECRET` — a long random string to sign session cookies.
   - `DATABASE_SSL` — usually not needed; set `no-verify` only if the host
     rejects the provider's certificate.
3. **Build & start:**
   ```bash
   npm ci
   npm run build
   npm start          # `next start` on the host's port (PORT env var)
   ```
4. **Serverless note.** On Vercel, cold starts hit `ensureSchema()`, which is
   idempotent and single-flight per instance but runs on every new instance.
   Prefer running `npm run db:push` once during provisioning and keeping
   `ensureSchema()` as a fallback, rather than relying on it as the primary
   schema mechanism.
