# Implementation Plan — Authentication Gate for the Registration Wizard

Goal: gate the ChildTrustFund.gov registration wizard behind a real-ish guardian
account auth (Option A). New visitors sign up (email, full name, password), get a
signed session cookie, and land on `/apply`. Returning guardians log in and resume
the wizard from its existing localStorage draft. No new npm dependencies; only
Node's built-in `crypto`.

Work directly in the workspace at
`c:/Users/kipro/Downloads/child-trust-fund-platform (1)` — do NOT use a worktree.
A background `next dev` (Turbopack) is already running on `http://localhost:3000`
and hot-reloads edits. Reuse it; only start your own `npm run dev -- -p 3001` if
`:3000` is not responding.

---

## Confirmed integration findings (read during planning)

- `src/db/schema.ts` — 6 `pgTable` exports (`applications`, `deposits`, `documents`,
  `statusEvents`, `inquiries`, `newsletterSignups`). `applications` already uses the
  lazy `() => applications.id` reference pattern from later tables, so a forward
  `references(() => guardianAccounts.id)` on `applications` is safe even when
  `guardianAccounts` is declared after `applications`. Export var names can differ
  from physical table names (e.g. `documents` → `verification_documents`).
- `src/lib/service.ts` — owns ALL DB access. `ensureSchema()` is a private async fn
  that runs one `db.execute(sql\`...\`)` block of idempotent `CREATE TABLE IF NOT
  EXISTS` / `CREATE INDEX IF NOT EXISTS` / `ALTER TABLE ... type` DDL. The
  single-flight is `initPromise` (module-level), driven by `ensureSeedData()`
  (private) → `runSeed()` → `ensureSchema()` then seed-if-empty. `getProgramStats()`
  and `getRecentApplications()` call `ensureSeedData()` internally. **New DB-backed
  functions must guarantee the schema exists before querying — the simplest is to
  `await ensureSeedData()` at the top of each new guardian function** (it is a fast
  no-op once initialized and reuses the single-flight promise). The existing POST
  `createApplication(input: NewApplicationInput)` builds a row and inserts it.
- `src/app/api/applications/route.ts` — POST parses `body` into a `NewApplicationInput`,
  calls `createApplication`, maps `{ok:false,errors}` → 422, success → 201, throw → 500
  with `console.error`. GET calls `getProgramStats`. `export const dynamic = "force-dynamic"`.
- `src/app/apply/page.tsx` — currently a **synchronous server component**, no
  `force-dynamic`, renders `<PageHero .../>` + `<RegistrationWizard />` + a help
  section. Imports `PageHero, SectionHeading, Callout, Icon` from `@/components/ui`.
- `src/components/RegistrationWizard.tsx` — `"use client"`, `export default function
  RegistrationWizard()` (no props). `FormState` includes `parentFullName` and
  `parentEmail` (Guardian step). `EMPTY` constant is used in exactly 3 spots:
  (1) `useState<FormState>(EMPTY)` initial, (2) the localStorage hydration effect
  `setForm({ ...EMPTY, ...(JSON.parse(raw)) })`, (3) two post-submit resets
  `setForm(EMPTY)` (lines ~362 and ~1079) which clear the form. Draft key is
  `ctf-application-draft-v1` (do NOT change). The 6 steps are Guardian, Residence &
  State, Child, Trust Account, Verification, Review & Certify.
- `src/components/SiteHeader.tsx` — `"use client"`. `NAV` array has
  `{ label: "Register a Child", href: "/apply" }`. Desktop auth cluster
  (`<div className="ml-auto flex items-center gap-3 ...">`) has a "Login.gov Sign in"
  `<Link href="/status">` and an accent `<Link href="/apply" className="usa-button
  usa-button--accent ...">Register a child now</Link>`. Mobile menu mirrors NAV and has
  a bottom `<Link href="/apply" className="usa-button usa-button--primary w-full">
  Register a child now</Link>`. Uses `usePathname`, `useRouter`, `useEffect`,
  `useRef`, `useState` already.
- `src/app/globals.css` — confirmed `.usa-button`, `.usa-button--primary`,
  `.usa-button--accent`, `.usa-input`, `.usa-input--error`, `.usa-label`, `.usa-hint`,
  `.usa-card`, `.usa-prose` exist as plain CSS. No `tailwind.config.js`. Color
  utilities come from `@theme` tokens (`bg-gov-navy`, `text-gov-primary`, etc.).
- `src/app/layout.tsx` renders `SiteHeader` (and the footer) globally, so new
  `/signup` and `/login` pages inherit the header automatically. We will NOT modify
  `layout.tsx`.
- `src/components/SiteFooter.tsx` — protected file. The disclaimer (lines ~238-243)
  reads: "...no real money is transferred, no real identity checks are performed, and
  no data submitted here is shared with any U.S. government agency." Do NOT change it.
- Baselines on the running dev server: `GET /api/health` → `{"ok":true}`;
  `GET /api/stats` → `totalApplications` is currently **121** (the brief said 120; one
  extra was added during earlier exploration — the auth changes must NOT alter this
  count); `GET /apply` with no cookie currently returns **200** (no guard yet); after
  the change it must 307-redirect to `/login`.
- **Env-var reload caveat:** the running dev server loaded `.env` at process start.
  Adding `SESSION_SECRET` to `.env` will NOT be visible to `process.env` until the
  dev server is restarted (Turbopack hot-reload recompiles modules but does not
  re-read `.env`). See the restart step in Verification.

---

## AUTHORITATIVE SPEC (Option A — approved; do not redesign)

### Files to create

- **`src/lib/auth.ts`** — pure helpers, no DB:
  - `hashPassword(pw)` / `verifyPassword(pw, stored)` using `crypto.scrypt`; store as
    `salt:hash` base64.
  - `createSessionToken(payload, secret)` / `readSessionToken(token, secret)` using
    HMAC-SHA256 over `base64url(JSON({guardianId,email,exp}))`.
  - Cookie name constant (e.g. `ctf_session`).
  - `getSessionGuardian()` that reads the cookie via `next/headers` `cookies()` and
    returns `{guardianId,email}` or `null`.
- **`src/components/AuthForm.tsx`** — one client component (`"use client"`) with a
  `mode: "signup" | "login"` prop. Fields per mode. Uses `usa-input`/`usa-label`/
  `usa-button` classes. Inline error rendering from `data.error`/`data.errors`. On
  success, `router.push('/apply')`.
- **`src/app/signup/page.tsx`** — thin server page rendering `<AuthForm mode="signup" />`
  + short note it is a demonstration prototype. `export const dynamic = "force-dynamic"`.
- **`src/app/login/page.tsx`** — thin server page rendering `<AuthForm mode="login" />`.
  `force-dynamic`.
- **`src/app/api/auth/signup/route.ts`** — POST `{email, fullName, password,
  confirmPassword}`. Validate (email format, name non-empty, password >= 8 chars,
  confirm matches). Call service `createGuardianAccount`. Set session cookie
  (httpOnly, sameSite=lax, path=/, maxAge 7d, secure only in production). Success 201
  `{ok:true, guardian:{email,fullName}}`. Duplicate email → 409 `{ok:false,error}`.
  Validation → 422 `{ok:false,errors:{field}}`. Throw → 500. `force-dynamic`.
- **`src/app/api/auth/login/route.ts`** — POST `{email, password}`. Call service
  `getGuardianAccountByEmail` + `verifyPassword`. Mismatch/missing → 401
  `{ok:false,error}`. Success sets cookie, 200 `{ok:true, guardian:{email,fullName}}`.
  `force-dynamic`.
- **`src/app/api/auth/logout/route.ts`** — POST clears the cookie. 200 `{ok:true}`.
  `force-dynamic`.
- **`src/app/api/auth/me/route.ts`** — GET returns the current session guardian or 401.
  `force-dynamic`.

### Files to modify

- **`src/db/schema.ts`** — add a `guardianAccounts` table: `id` serial pk, `email` text
  unique notNull, `fullName` text notNull, `passwordHash` text notNull, `createdAt`
  timestamptz default now(). Add a nullable `guardianAccountId` integer column to
  `applications` (FK to `guardianAccounts.id`, onDelete set null). Raises documented
  "six tables" to seven — update inline comments only, do not rewrite docs. Name the
  Drizzle export `guardianAccounts` with physical table `guardian_accounts`.
- **`src/lib/service.ts`** — add the DDL for `guardian_accounts` (CREATE TABLE IF NOT
  EXISTS) and the `ALTER TABLE applications ADD COLUMN IF NOT EXISTS guardian_account_id
  INT` to `ensureSchema()`. Add DB functions (this file owns ALL DB access):
  `createGuardianAccount({email, fullName, passwordHash})` (insert; on unique violation
  return a sentinel/throw so the route maps to 409), `getGuardianAccountByEmail(email)`
  (return row or null), `getGuardianAccountById(id)`. Keep route handlers thin.
- **`src/app/api/applications/route.ts`** (POST handler) — read the session via
  `getSessionGuardian()` and set `guardianAccountId` on the new application from the
  session (if present). Do not block creation if absent (seed/admin paths), but for
  logged-in users associate it.
- **`src/app/apply/page.tsx`** — make it a server component that calls
  `getSessionGuardian()`. If null → `redirect('/login')`. If present → render the
  existing `<RegistrationWizard />` and help section as before. Set `force-dynamic`.
  Optionally pass the guardian's email/fullName as props to prefill the wizard's
  guardian step (optional; only if cheap).
- **`src/components/SiteHeader.tsx`** — change the "Register a Child" nav item and the
  "Register a child now" accent button to point to `/signup`. Change the "Login.gov
  Sign in" link to `/login`. When a session exists, show the guardian's name + a
  "Sign out" control (calls `/api/auth/logout` then `router.push('/login')`). Keep the
  component a client component; you may fetch `/api/auth/me` client-side to know the
  auth state, or accept an optional prop from the layout.
- **`src/components/RegistrationWizard.tsx`** — OPTIONAL prefill: accept optional
  `defaultEmail`/`defaultFullName` props to seed the Guardian step's FormState. Do not
  otherwise change the 6-step logic or the localStorage draft key.

### Session secret

Add `SESSION_SECRET` to `.env` (generate a random 64-char hex string) and to
`.env.example` (with a comment: "Used to sign session cookies for guardian accounts").
Read it in `src/lib/auth.ts` via `process.env.SESSION_SECRET`; throw at runtime if
missing. NOTE: this deviates from the project's documented "one env var only
(DATABASE_URL)" rule — it is an intentional, documented exception for auth. (If you
find the deviation problematic, the alternative is to auto-generate and persist a
secret in a small `app_settings` table; prefer the env var for simplicity unless that
breaks something.)

### Constraints & conventions (must follow)

- Next 16: route-handler `params` and page `searchParams` are Promises — `await`
  them. Every DB- or cookie-touching page/route sets `export const dynamic =
  "force-dynamic"`.
- API contract: success `{ok:true,...}` (201 on create); validation
  `{ok:false,errors:{field:"msg"}}` → 422; single-message `{ok:false,error:"msg"}` →
  400/401/403/404/409; unexpected → 500 with `console.error` server-side.
- Money is integer cents (not relevant to auth, but do not introduce floats anywhere).
- Tailwind v4: there is NO `tailwind.config.js`; use the existing `usa-*`/`gov-*`
  classes from `src/app/globals.css`. Color utilities come from `@theme` tokens. Do
  NOT add a Tailwind config and do NOT use `@apply`.
- One component per file, PascalCase filename. No barrel files. Import from concrete
  paths (`@/lib/auth`, `@/lib/service`, `@/components/AuthForm`).
- Logic lives in `src/lib/*`; route handlers stay thin (parse → call service/lib →
  shape response). DB access stays in `service.ts`.
- Do NOT add `/signup` or `/login` to the search index `PAGES` in
  `src/app/search/page.tsx` (functional auth pages, not content). The existing
  "Register" NAV entry stays as one entry (now → `/signup`).
- DO NOT modify the prototype disclaimer block in `src/components/SiteFooter.tsx`
  (protected file). Note in the final summary that its "performs no real identity
  checks" wording is now slightly inaccurate because Option A does a real password
  check — leave the text as-is.
- Do NOT store plaintext passwords, full SSNs, or bank account numbers anywhere.
  Only the scrypt `salt:hash` verifier is stored.
- Keep all existing flows working: `/api/health` → `{"ok":true}`; `/api/stats` →
  unchanged application count; home page renders.

### Out of scope (do NOT build)

- No "my applications" dashboard or saved-application resume across devices.
- No password reset / email verification / 2FA.
- No changes to the prototype disclaimer block.
- No new npm dependencies.
- No changes to the existing 6 tables' columns other than adding nullable
  `guardian_account_id` to `applications`.

---

## Implementation order

Ordered by dependency. Each item leaves the codebase buildable. Verification uses
the project's real commands: `npm run typecheck` (`tsc --noEmit`), `npm run lint`
(`eslint .`), `npm run build` (`next build`). There is no unit-test framework.

- [ ] 1. **Add `guardianAccounts` table + nullable `applications.guardianAccountId` to the Drizzle schema.**
      In `src/db/schema.ts`: add an `integer("guardian_account_id")` column to the
      `applications` `pgTable` using a lazy FK
      `.references(() => guardianAccounts.id, { onDelete: "set null" })` (no `.notNull()`
      — it is nullable). Add a new export at the end of the file:
      ```ts
      export const guardianAccounts = pgTable("guardian_accounts", {
        id: serial("id").primaryKey(),
        email: text("email").notNull().unique(),
        fullName: text("full_name").notNull(),
        passwordHash: text("password_hash").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
      });
      ```
      Update the top file comment's "six tables" mention to "seven" (inline comment only,
      do not rewrite docs). `text`/`timestamp`/`serial`/`integer` are already imported.
      Files: `src/db/schema.ts`
      Verify: `npm run typecheck` passes (no usage yet, so no downstream type errors).

- [ ] 2. **Add `SESSION_SECRET` to `.env` and `.env.example`.**
      Generate a 64-char hex secret with
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` and
      append `SESSION_SECRET=<that value>` to `.env`. In `.env.example` append
      `SESSION_SECRET=` (empty placeholder) with a line comment above it:
      `# Used to sign session cookies for guardian accounts.` Keep `DATABASE_URL` as
      the first var. (This deviates from the "one env var only" rule — it is the
      approved, documented auth exception.)
      Files: `.env`, `.env.example`
      Verify: `grep -n SESSION_SECRET .env .env.example` shows both lines.

- [ ] 3. **Add the DDL + three guardian DB functions + `NewApplicationInput.guardianAccountId` to `src/lib/service.ts`.**
      - Add `guardianAccounts` to the existing schema import list
        (`import { applications, deposits, documents, inquiries, newsletterSignups,
        statusEvents, guardianAccounts, ... } from "@/db/schema";`).
      - Inside `ensureSchema()`'s single `db.execute(sql\`...\`)` template literal,
        after the existing `applications`/`deposits`/... `CREATE TABLE` statements and
        their indexes, append (idempotent):
        ```sql
        create table if not exists guardian_accounts (
          id serial primary key,
          email text not null,
          full_name text not null,
          password_hash text not null,
          created_at timestamptz not null default now()
        );
        create unique index if not exists guardian_accounts_email_key on guardian_accounts (email);
        alter table applications add column if not exists guardian_account_id integer
          references guardian_accounts(id) on delete set null;
        ```
        (The `guardian_accounts` table is created before the `ALTER TABLE ... REFERENCES
        guardian_accounts(id)` in the same batch, so the FK resolves. The separate
        `CREATE UNIQUE INDEX IF NOT EXISTS` makes uniqueness idempotent even if the table
        pre-existed without the constraint.)
      - Add `guardianAccountId?: number;` to the `NewApplicationInput` type.
      - In `createApplication`'s `db.insert(applications).values({...})` object add
        `guardianAccountId: input.guardianAccountId ?? null,`.
      - Add the three functions (this file owns ALL DB access). Each begins with
        `await ensureSeedData();` so the table is guaranteed to exist via the
        single-flight:
        ```ts
        export async function createGuardianAccount(input: {
          email: string;
          fullName: string;
          passwordHash: string;
        }): Promise<
          | { ok: true; guardian: { id: number; email: string; fullName: string } }
          | { ok: false; duplicate: true }
        > {
          await ensureSeedData();
          const email = input.email.trim().toLowerCase();
          try {
            const [row] = await db
              .insert(guardianAccounts)
              .values({
                email,
                fullName: input.fullName.trim(),
                passwordHash: input.passwordHash,
              })
              .returning({ id: guardianAccounts.id, email: guardianAccounts.email, fullName: guardianAccounts.fullName });
            return { ok: true, guardian: { id: row.id, email: row.email, fullName: row.fullName } };
          } catch (err: unknown) {
            // pg unique-violation code 23505
            if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "23505") {
              return { ok: false, duplicate: true };
            }
            throw err;
          }
        }

        export async function getGuardianAccountByEmail(email: string) {
          await ensureSeedData();
          const [row] = await db
            .select()
            .from(guardianAccounts)
            .where(eq(guardianAccounts.email, email.trim().toLowerCase()))
            .limit(1);
          return row ?? null;
        }

        export async function getGuardianAccountById(id: number) {
          await ensureSeedData();
          const [row] = await db
            .select()
            .from(guardianAccounts)
            .where(eq(guardianAccounts.id, id))
            .limit(1);
          return row ?? null;
        }
        ```
        (`eq` is already imported.) Keep `createGuardianAccount`'s `duplicate` sentinel
        so the route can map to 409 without leaking the error to the client.
      Files: `src/lib/service.ts`
      Verify: `npm run typecheck` passes.

- [ ] 4. **Create `src/lib/auth.ts` (pure helpers, no DB).**
      ```ts
      import { createHmac, randomBytes, scrypt, timingSafeEqual } from "crypto";
      import { cookies } from "next/headers";

      export const SESSION_COOKIE = "ctf_session";
      const SCRYPT_KEYLEN = 64;

      function getSecret(): string {
        const secret = process.env.SESSION_SECRET;
        if (!secret) throw new Error("SESSION_SECRET is not set.");
        return secret;
      }

      export async function hashPassword(password: string): Promise<string> {
        const salt = randomBytes(16);
        const hash = await new Promise<Buffer>((resolve, reject) => {
          scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => (err ? reject(err) : resolve(key)));
        });
        return `${salt.toString("base64")}:${hash.toString("base64")}`;
      }

      export async function verifyPassword(password: string, stored: string): Promise<boolean> {
        const parts = stored.split(":");
        if (parts.length !== 2) return false;
        const salt = Buffer.from(parts[0], "base64");
        const expected = Buffer.from(parts[1], "base64");
        const computed = await new Promise<Buffer>((resolve, reject) => {
          scrypt(password, salt, SCRYPT_KEYLEN, (err, key) => (err ? reject(err) : resolve(key)));
        });
        if (computed.length !== expected.length) return false;
        return timingSafeEqual(computed, expected);
      }

      type SessionPayload = { guardianId: number; email: string; exp: number };

      export function createSessionToken(payload: Omit<SessionPayload, "exp">, secret: string, maxAgeSeconds = 60 * 60 * 24 * 7): string {
        const full: SessionPayload = { ...payload, exp: Date.now() + maxAgeSeconds * 1000 };
        const data = Buffer.from(JSON.stringify(full)).toString("base64url");
        const sig = createHmac("sha256", secret).update(data).digest("base64url");
        return `${data}.${sig}`;
      }

      export function readSessionToken(token: string, secret: string): SessionPayload | null {
        const [data, sig] = token.split(".");
        if (!data || !sig) return null;
        const expected = createHmac("sha256", secret).update(data).digest("base64url");
        const a = Buffer.from(sig);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
        try {
          const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as SessionPayload;
          if (typeof payload.exp !== "number" || typeof payload.guardianId !== "number" || typeof payload.email !== "string") return null;
          if (payload.exp < Date.now()) return null;
          return payload;
        } catch {
          return null;
        }
      }

      export async function getSessionGuardian(): Promise<{ guardianId: number; email: string } | null> {
        const store = await cookies();
        const token = store.get(SESSION_COOKIE)?.value;
        if (!token) return null;
        try {
          const payload = readSessionToken(token, getSecret());
          if (!payload) return null;
          return { guardianId: payload.guardianId, email: payload.email };
        } catch {
          return null;
        }
      }
      ```
      Notes: `cookies()` is a Promise in Next 16 — `await` it. `base64url` Buffer
      encoding is supported on Node 20.9+. The `getSessionGuardian` `catch` swallows the
      "missing secret" throw so a missing secret degrades to "logged out" rather than a
      500 on the `/apply` page redirect path; the auth API routes will surface the throw
      as 500 (acceptable — and the /api/auth/me 401-vs-500 check in Verification
      confirms the secret loaded).
      Files: `src/lib/auth.ts`
      Verify: `npm run typecheck` passes.

- [ ] 5. **Create the four auth API route handlers** (`signup`, `login`, `logout`, `me`).
      All `export const dynamic = "force-dynamic"`. Each wraps the body in try/catch and
      `console.error`s on unexpected errors. Use `(await cookies())` from
      `next/headers` to set/clear the cookie; cookie options:
      `{ httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7, secure:
      process.env.NODE_ENV === "production" }`.
      - **`src/app/api/auth/signup/route.ts`** — POST `{email, fullName, password,
        confirmPassword}`. Validate into `errors: Record<string,string>`:
        - `email`: required + `/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i`.
        - `fullName`: non-empty (trimmed).
        - `password`: length >= 8.
        - `confirmPassword`: must equal `password`.
        If `Object.keys(errors).length` → 422 `{ok:false, errors}`. Else
        `const hash = await hashPassword(password); const res = await
        createGuardianAccount({ email, fullName, passwordHash: hash });`. If
        `res.duplicate` → 409 `{ok:false, error:"An account with that email already exists."}`.
        On success: `const token = createSessionToken({ guardianId: res.guardian.id,
        email: res.guardian.email }, process.env.SESSION_SECRET!);` then set cookie and
        return 201 `{ok:true, guardian:{email:res.guardian.email, fullName:res.guardian.fullName}}`.
        Throw → 500 `{ok:false, error:"Sign up failed. Please try again."}`.
      - **`src/app/api/auth/login/route.ts`** — POST `{email, password}`. If missing
        email/password → 422 (or 400). `const account = await
        getGuardianAccountByEmail(email);` if `!account` → 401
        `{ok:false, error:"That email and password do not match an account."}`.
        `const valid = await verifyPassword(password, account.passwordHash);` if `!valid`
        → 401 with the SAME message (avoid account enumeration). On success: set cookie
        with `createSessionToken({ guardianId: account.id, email: account.email },
        process.env.SESSION_SECRET!)` and return 200
        `{ok:true, guardian:{email:account.email, fullName:account.fullName}}`. Throw → 500.
      - **`src/app/api/auth/logout/route.ts`** — POST: `(await cookies()).set(SESSION_COOKIE,
        "", { httpOnly:true, sameSite:"lax", path:"/", maxAge:0, secure:
        process.env.NODE_ENV === "production" });` then 200 `{ok:true}`. (maxAge:0
        deletes the cookie.) Throw → 500.
      - **`src/app/api/auth/me/route.ts`** — GET: `const g = await
        getSessionGuardian();` if `!g` → 401 `{ok:false, error:"Not authenticated."}`.
        Else `const acct = await getGuardianAccountById(g.guardianId);` and return 200
        `{ok:true, guardian:{ email:g.email, fullName: acct?.fullName ?? "" }}`. Throw →
        500.
      Files: `src/app/api/auth/signup/route.ts`, `src/app/api/auth/login/route.ts`,
      `src/app/api/auth/logout/route.ts`, `src/app/api/auth/me/route.ts`
      Verify: `npm run typecheck` passes.

- [ ] 6. **Create `src/components/AuthForm.tsx`** (`"use client"`).
      Props `{ mode: "signup" | "login" }`. Local state for `email`, `fullName`,
      `password`, `confirmPassword`, plus `errors: Record<string,string>`, `error:
      string | null`, `busy: boolean`. `const router = useRouter();` from
      `next/navigation`. On submit: preventDefault, clear errors, POST JSON to
      `/api/auth/signup` (signup fields) or `/api/auth/login` (login fields). Parse
      `data = await res.json().catch(()=>({}))`. If `!res.ok`: if `data.errors` set
      `errors`, else if `data.error` set `error`, else generic. If `res.ok`:
      `router.push("/apply")`. Render with `.usa-input`/`.usa-label`/`.usa-button`
      classes and a `.usa-hint` for the password rule; render `errors[field]` under each
      field and `error` above the submit button. Mark inputs `required`, `autoComplete`
      (`email`, `new-password`/`current-password`, `name`). Keep it one default export.
      Files: `src/components/AuthForm.tsx`
      Verify: `npm run typecheck` passes.

- [ ] 7. **Create `src/app/signup/page.tsx` and `src/app/login/page.tsx`** (thin server pages).
      Both: `export const dynamic = "force-dynamic"`. Use the existing `PageHero` from
      `@/components/ui` (same props shape as `src/app/apply/page.tsx`: `trail`, `eyebrow`,
      `title`, `lede`). Render `<AuthForm mode="signup" />` / `<AuthForm mode="login" />`
      inside a `<section className="bg-white py-10"><div className="mx-auto max-w-w...">`
      wrapper (mirror apply page's section wrapper, e.g.
      `max-w-3xl px-4 sm:px-6`). On the signup page add a short
      `<Callout tone="info" title="Demonstration prototype">` (or a plain `<p>` in
      `.usa-prose`) noting this is an academic prototype, no real identity checks, and
      not to reuse a real password. Keep the pages thin — no DB, no auth logic. Provide
      a `Metadata` export with `title`.
      Files: `src/app/signup/page.tsx`, `src/app/login/page.tsx`
      Verify: `npm run typecheck` passes.

- [ ] 8. **Gate `src/app/apply/page.tsx` behind the session.**
      Add `export const dynamic = "force-dynamic"`. Make the component `async`. At the
      top: `const guardian = await getSessionGuardian(); if (!guardian)
      redirect("/login");` (import `redirect` from `next/navigation` and
      `getSessionGuardian` from `@/lib/auth`). Optionally prefill the wizard: `const
      acct = guardian ? await getGuardianAccountById(guardian.guardianId) : null;` then
      `<RegistrationWizard defaultEmail={guardian.email} defaultFullName={acct?.fullName ?? undefined} />`.
      Leave the PageHero, help section, and Callout exactly as they are. (The lookup is
      a single indexed query in a server component — cheap.)
      Files: `src/app/apply/page.tsx`
      Verify: `npm run typecheck` passes.

- [ ] 9. **Update `src/app/api/applications/route.ts` POST to associate the session.**
      At the top of `POST`, after parsing the body and BEFORE building `payload`,
      `const guardian = await getSessionGuardian();`. Then add
      `guardianAccountId: guardian?.guardianId,` to the `payload` object (number |
      undefined → service stores `null` when undefined). Do NOT block creation when
      absent (seed/admin paths). Leave GET and the 422/201/500 mapping unchanged.
      Files: `src/app/api/applications/route.ts`
      Verify: `npm run typecheck` passes.

- [ ] 10. **Update `src/components/SiteHeader.tsx` (nav targets + auth state + sign out).**
      - In `NAV`, change `{ label: "Register a Child", href: "/apply" }` →
        `href: "/signup"`.
      - Desktop auth cluster: change "Login.gov Sign in" `<Link href="/status">` →
        `<Link href="/login">`. Change the accent button `href="/apply"` → `href="/signup"`.
      - Mobile menu bottom button: change `href="/apply"` → `href="/signup"`.
      - Add auth state: `const [me, setMe] = useState<{ email: string; fullName:
        string } | null>(null);` and an effect that re-fetches on `pathname` change:
        ```ts
        useEffect(() => {
          let cancelled = false;
          fetch("/api/auth/me")
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled) setMe(d?.guardian ?? null); })
            .catch(() => {});
          return () => { cancelled = true; };
        }, [pathname]);
        ```
      - Add a `signOut` handler:
        ```ts
        async function signOut() {
          try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
          setMe(null);
          router.push("/login");
        }
        ```
      - In the desktop auth cluster, when `me`: render `Signed in as
        <span>{me.fullName || me.email}</span>` and a
        `<button type="button" onClick={signOut} className="usa-button usa-button--outline !py-2 text-[0.8rem]">Sign out</button>`;
        when not `me`: keep the "Login.gov Sign in" → `/login` link. (Either swap the
        cluster conditionally or render both states; keep the "Register a child now"
        accent button always visible pointing to `/signup`.)
      - In the mobile menu, add a small sign-in / sign-out row at the bottom (when
        `me` show "Signed in as …" + "Sign out"; otherwise a "Sign in" link to `/login`),
        in addition to the existing "Register a child now" button.
      Keep the component `"use client"` and all existing menu/hover logic intact.
      Files: `src/components/SiteHeader.tsx`
      Verify: `npm run typecheck` passes.

- [ ] 11. **Add optional prefill props to `src/components/RegistrationWizard.tsx`.**
      Change the signature to
      `export default function RegistrationWizard({ defaultEmail, defaultFullName }: { defaultEmail?: string; defaultFullName?: string })`.
      Inside the component, build a base that merges the defaults into `EMPTY`:
      `const baseForm: FormState = { ...EMPTY, ...(defaultEmail ? { parentEmail: defaultEmail } : {}), ...(defaultFullName ? { parentFullName: defaultFullName } : {}) };`
      Use `baseForm` in: (a) `useState<FormState>(baseForm)` and (b) the hydration
      effect's `setForm({ ...baseForm, ...(JSON.parse(raw) as FormState) })` so a saved
      draft always wins over the defaults but defaults fill the Guardian step for new
      sessions. Do NOT change the two post-submit `setForm(EMPTY)` resets (lines ~362,
      ~1079) — those clear the form for a fresh application. Do NOT change the
      `STORAGE_KEY`, the 6 steps, validation, or the POST. (Note: defaults come from
      the server as props, so initial server + first client render are identical — no
      hydration mismatch; localStorage is read only in the effect, same as today.)
      Files: `src/components/RegistrationWizard.tsx`
      Verify: `npm run typecheck` passes.

- [ ] 12. **Full static verification.**
      Run in order: `npm run typecheck`, `npm run lint`, `npm run build`. Fix any new
      errors introduced by these changes (lint rules, type errors, build-time errors).
      Build needs network for Google Fonts (already available). If `npm run build` is
      too slow/flaky in the agent environment, fall back to typecheck + lint + the curl
      smoke below, but try build first.
      Files: —
      Verify: all three commands exit 0.

- [ ] 13. **Restart the dev server so `SESSION_SECRET` is loaded, then run the curl smoke test.**
      The already-running `:3000` server loaded `.env` at startup, so the new
      `SESSION_SECRET` is NOT in `process.env` until a restart. Restart it: find and
      stop the existing `next dev` on `:3000` (e.g. kill the process bound to :3000) and
      relaunch `npm run dev` in the background, OR launch a fresh
      `npm run dev -- -p 3001` and target that port in the curl commands below. Wait for
      "Ready" before continuing.
      Sanity pre-check (confirms the secret loaded): `curl -s -o /dev/null -w
      "%{http_code}" http://localhost:3000/api/auth/me` must return **401** (not 500).
      A 500 means `SESSION_SECRET` is not loaded → restart the server again.
      Then run the full smoke test in the Verification procedure below.
      Files: —
      Verify: every curl assertion in the Verification procedure passes.

---

## Verification procedure (required before reporting done)

Use `curl` against the dev server on `:3000` (or `:3001` if you started your own).
Use a fresh email each run to avoid the duplicate-409 on the "fresh signup" test:

```bash
EMAIL="auth-test-$(date +%s)@example.com"
CJ=/tmp/ctf_cookies.txt

# 0. Secret loaded (401, not 500)
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/auth/me        # expect 401

# 1. /apply unauthenticated -> redirect to /login (307 + Location)
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/apply   # expect 307 .../login

# 2. Signup fresh -> 201 + Set-Cookie ctf_session
curl -s -i -c "$CJ" -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"fullName\":\"Test Guardian\",\"password\":\"password123\",\"confirmPassword\":\"password123\"}"
# expect: HTTP/1.1 201, Set-Cookie: ctf_session=... ; body {"ok":true,"guardian":{...}}

# 3. With that cookie, /apply -> 200 and the wizard renders
curl -s -o /dev/null -w "%{http_code}\n" -b "$CJ" http://localhost:3000/apply     # expect 200
curl -s -b "$CJ" http://localhost:3000/apply | grep -c "Register a child\|Guardian\|Form CTF-1"   # expect >=1

# 4. Duplicate signup (same email) -> 409
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"fullName\":\"Test Guardian\",\"password\":\"password123\",\"confirmPassword\":\"password123\"}"   # expect 409

# 5. Validation failures -> 422 with errors
# 5a. mismatched passwords
curl -s -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" \
  -d "{\"email\":\"x@x.com\",\"fullName\":\"A B\",\"password\":\"password123\",\"confirmPassword\":\"different\"}"
# expect {"ok":false,"errors":{"confirmPassword":...}} and http 422 (check -w "%{http_code}")
# 5b. short password
curl -s -X POST http://localhost:3000/api/auth/signup -H "Content-Type: application/json" \
  -d "{\"email\":\"y@y.com\",\"fullName\":\"A B\",\"password\":\"short\",\"confirmPassword\":\"short\"}"
# expect 422 with errors.password

# 6. Login correct -> 200 + Set-Cookie; wrong password -> 401
curl -s -i -c "$CJ" -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"password123\"}"
# expect HTTP/1.1 200, Set-Cookie: ctf_session=...
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"wrongpassword\"}"   # expect 401

# 7. Logout -> 200 and clears cookie; then /apply redirects to /login again
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/auth/logout -b "$CJ" -c "$CJ"   # expect 200
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -b "$CJ" http://localhost:3000/apply   # expect 307 .../login

# 8. Existing flows still work
curl -s http://localhost:3000/api/health                          # expect {"ok":true}
curl -s http://localhost:3000/api/stats | grep -o '"totalApplications":[0-9]*'   # expect the SAME count as baseline (121) — auth must not change it
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # expect 200
```

Report any step that failed and what you did about it.

---

## Heads-up notes for the final summary

1. **Disclaimer wording (required heads-up).** The protected
   `src/components/SiteFooter.tsx` disclaimer says the prototype "...performs no real
   identity checks..." which is now slightly inaccurate because Option A performs a
   real scrypt password verification. Per the rules, leave the text unchanged; call
   this out in the final summary.
2. **Env-var deviation.** `SESSION_SECRET` is a second env var, intentionally added
   despite the project's documented "one env var only (DATABASE_URL)" rule. State this
   in the summary.
3. **Stats baseline.** `/api/stats` currently reports 121 applications (the brief said
   120; one was added during earlier exploration). The auth changes must NOT alter this
   number — verify it stays at the pre-change value.
4. **Dev server restart required.** The running `:3000` server must be restarted after
   editing `.env` so `SESSION_SECRET` reaches `process.env`; otherwise every auth
   endpoint 500s. The `/api/auth/me` 401-vs-500 check is the canary.
5. **In-memory dev fallback (alternative, only if restart is impossible).** If the
   dev server genuinely cannot be restarted, an acceptable fallback that still honors
   "throw in production if missing" is: in `getSecret()`, if `process.env.NODE_ENV !==
   "production"` and `SESSION_SECRET` is unset, derive an ephemeral in-memory secret
   (e.g. `randomBytes(32).toString("hex")` cached at module load). Prefer the env-var +
   restart path; only use this fallback if restart is blocked, and note it in the
   summary.
