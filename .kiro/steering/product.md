---
inclusion: always
---

# Product — U.S. Child Trust Fund (ChildTrustFund.gov)

## What it is

A public-benefits website modeled on the tone and structure of `investor.gov`.
It distributes Child Trust Fund money into custodial accounts that a parent or
legal guardian registers for a child. United States only, English-first,
plain-language federal voice.

**This is a demonstration prototype for an academic state-government project.**
It must always carry the prototype disclaimer in the site footer. It never
moves real money, never performs real identity checks, and never claims to
transmit data to a real agency.

## Core value proposition

Every eligible American child holds a custodial trust account that receives
public money at opening and compounds until the child turns 18. No child reaches
adulthood with zero capital.

## Program rules (single source of truth: `src/lib/program.ts`)

- **Automatic cohort** — children born 2025, 2026, 2027, 2028:
  $1,000.00 federal seed deposit + state opening match + $150.00 federal
  birthday supplement every year until age 6. No family money required.
- **Guardian-funded cohort** — children born 2015–2024: no federal seed; the
  parent/guardian deposits the funds and the state matches a percentage of every
  contribution.
- **Legacy cohort** — born before 2015: handled by the state transfer desk.
- Guardian contribution limit: **$5,000 per child per program year**.
- State match rates live in `src/lib/states.ts` for all 50 states, D.C. and
  five territories (56 jurisdictions).
- Projections assume a 4.5% nominal annual return and are labelled as estimates.

## Primary users

1. **Parent / legal guardian** — registers a child, verifies identity, tracks
   the case, makes deposits.
2. **Grandparent or relative** — contributes to an existing account.
3. **State treasury specialist** — reviews cases (simulated in this prototype by
   the "Run next agency review step" action).
4. **Public / press** — reads program data, news, FAQ.

## Key journeys (keep these working end to end)

1. **Register** `/apply` — six-step wizard: Guardian → Residence & State →
   Child → Trust Account → Verification → Review & Certify. Ends with a
   `CTF-YYYY-XXXXXX` reference number and a confirmation screen.
2. **Verify** `/verify` — Login.gov, ID.me, document upload, or in person.
3. **Track** `/status` — lookup by reference + child's last name; pipeline,
   deposit ledger, case history, document upload, contribution.
4. **Deposit** `/deposit` — one-time or monthly contribution with live state
   match preview.
5. **Learn** `/resources`, `/faq`, `/states`, `/program-data`.

## Voice and content standards

- Federal plain-language standard (Plain Writing Act of 2010). Short sentences,
  active voice, "you" for the guardian, no marketing superlatives.
- Never ask for a full Social Security number — last 4 digits only, everywhere.
- Every money figure is shown as USD with cents where the amount is a benefit,
  rounded where it is a projection.
- Fraud warnings accompany anything that asks for money or personal data.

## Non-negotiable guardrails

- Keep the prototype disclaimer visible in the footer.
- Do not invent new benefit amounts without updating `src/lib/program.ts` and
  the content pages that quote them — the numbers must stay consistent.
- Do not store full SSNs, bank account numbers, passwords or uploaded file
  contents. Only metadata (file name, size, MIME type) is persisted.
- Money is stored as integer cents. Never floats.
