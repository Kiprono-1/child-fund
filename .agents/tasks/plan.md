# Implementation Plan

This work decomposes into three independent FEAT artifacts under
`.agents/tasks/task-wizard-auth-deposit/`. Read `context.json` and the relevant
`FEAT-NNN.json` file before implementing each feature.

---

- [ ] 1. **FEAT-001 — $1,500 minimum deposit constant and backend enforcement**
      Add `MINIMUM_INITIAL_DEPOSIT_CENTS = 150000` to `src/lib/program.ts`.
      Enforce in `addGuardianDeposit()` (replace the $1 floor with $1,500) and
      in `validateApplication()` (reject initial deposits below $1,500 when one
      is provided). Add a matching server-side guard in
      `src/app/api/applications/route.ts`.
      Files: `src/lib/program.ts`, `src/lib/service.ts`,
      `src/app/api/applications/route.ts`
      Verify: `npm run typecheck` → 0 errors; `npm run build` → succeeds.

- [ ] 2. **FEAT-002 — Multi-child 7-step registration wizard + DepositForm minimum**
      Rewrite `src/components/RegistrationWizard.tsx` completely.
      Step 0 asks for number of children (1–5) with a "$1,500 per child" note.
      Steps 1–2 capture guardian + residence (once). Steps 3–4 loop per child
      (child details → child account). Step 5 verification. Step 6 review/certify.
      Strict validation: guardian name 2+ words, DOB age-18+, phone 10 digits,
      email regex; child name letters/hyphens/apostrophes only, DOB under 18;
      account routing 9 digits, accountLast4 4 digits, deposit ≥ $1,500.
      Submit posts one application per child, redirects to `/dashboard`.
      Update `src/components/DepositForm.tsx`: quick-amount buttons start at
      $1,500; min attribute uses `MINIMUM_INITIAL_DEPOSIT_CENTS / 100`.
      Update `src/app/(public)/apply/page.tsx` aside checklist to mention the
      $1,500 per child requirement.
      Files: `src/components/RegistrationWizard.tsx`,
      `src/components/DepositForm.tsx`, `src/app/(public)/apply/page.tsx`
      Depends on: FEAT-001 (imports `MINIMUM_INITIAL_DEPOSIT_CENTS`).
      Verify: `npm run typecheck` → 0 errors; `npm run build` → succeeds.

- [ ] 3. **FEAT-003 — Streamlined auth form + dashboard child folder cards**
      Rewrite `src/components/AuthForm.tsx`: add show/hide password toggle
      (eye SVG), remember-me checkbox (checked = 30 days, unchecked = 7 days),
      trust-signals row (3 icons), and in signup mode a 4-segment strength bar
      + requirements checklist. Pass `rememberMe` boolean in the login POST.
      Update `src/app/api/auth/login/route.ts` to read `rememberMe` and pass
      the correct `maxAge` to both `createSessionToken` and
      `sessionCookieOptions`.
      Add `getBalancesByGuardianId(guardianId)` to `src/lib/service.ts`
      (single-query SUM grouped by application).
      Update `src/app/(public)/dashboard/page.tsx`: when the guardian has >1
      child, show a folder-card grid above the balance tiles. Each card shows
      child name (font-serif), StatusBadge, reference number, and balance.
      Clicking a card navigates to `?child=<ref>`. Remove the existing
      `DashboardChildSwitcher` block (replaced by the new grid).
      Files: `src/components/AuthForm.tsx`,
      `src/app/api/auth/login/route.ts`, `src/lib/service.ts`,
      `src/app/(public)/dashboard/page.tsx`
      Depends on: FEAT-001 and FEAT-002 can be done in parallel with this;
      they share no files.
      Verify: `npm run typecheck` → 0 errors; `npm run build` → succeeds.
