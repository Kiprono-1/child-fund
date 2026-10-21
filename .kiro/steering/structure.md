---
inclusion: always
---

# Project structure

```
.
├── .env.example              DATABASE_URL template (copy to .env — .env is gitignored)
├── README.md                 Setup, architecture, troubleshooting
├── drizzle.config.json       dialect postgresql, schema ./src/db/schema.ts
├── next.config.ts            reactStrictMode only — keep it minimal
├── postcss.config.mjs        @tailwindcss/postcss (Tailwind v4)
├── eslint.config.mjs         eslint-config-next flat config
├── tsconfig.json             strict, paths: @/* → ./src/*
├── public/
│   └── img/                  gov-seal.png, ctf-seal.png (government seals)
└── src/
    ├── app/
    │   ├── layout.tsx        fonts + GovBanner/Header/Footer + skip link
    │   ├── globals.css       Tailwind import, @theme tokens, USWDS-style classes
    │   ├── icon.png          favicon (auto-served by the App Router)
    │   ├── page.tsx          home (dynamic, live stats)
    │   ├── about/            mission, statute, governance, history, newsroom anchor
    │   ├── how-it-works/     process, deposit schedule, worked examples, age 18
    │   ├── eligibility/      requirements, cohort benefit table, blockers, FAQ
    │   ├── states/           interactive 56-jurisdiction match table
    │   ├── program-data/     live dashboard (charts built from raw SQL aggregates)
    │   ├── apply/            six-step registration wizard host page
    │   ├── verify/           four verification methods + document checklist + offices
    │   ├── status/           case lookup, pipeline, ledger, uploads, contributions
    │   ├── deposit/          guardian contribution flow
    │   ├── resources/        guides, calculator, forms table, glossary, classroom
    │   ├── faq/              30 searchable answers by category
    │   ├── contact/          contact form + channels + state offices
    │   ├── search/           site search across pages, FAQs and states
    │   └── api/              health, applications (+[reference]/actions), stats,
    │                         inquiries, newsletter
    ├── components/
    │   ├── ui.tsx            shared server-safe primitives: PageHero, Breadcrumbs,
    │   │                     SectionHeading, Callout, StatTile, FeatureCard,
    │   │                     StepList, StatusBadge, Icon (inline SVG set)
    │   ├── GovBanner.tsx     official .gov banner (client, expandable)
    │   ├── SiteHeader.tsx    seal + wordmark + search + dropdown nav + mobile menu
    │   ├── SiteFooter.tsx    link columns, newsletter, legal row, disclaimer
    │   ├── RegistrationWizard.tsx   the 6-step application + live benefit sidebar
    │   ├── StatusTracker.tsx        case lookup, pipeline, ledger, uploads, deposits
    │   ├── DepositForm.tsx          contribution flow with state-match preview
    │   ├── StateTable.tsx           sortable/filterable state table + detail aside
    │   ├── FaqExplorer.tsx          category tabs + search + accordion groups
    │   ├── CompoundCalculator.tsx   SVG growth chart with sliders
    │   ├── ContactForm.tsx          inquiry form → /api/inquiries
    │   └── Accordion.tsx            reusable accessible disclosure
    ├── db/
    │   ├── index.ts          cached pg Pool + drizzle instance
    │   └── schema.ts         six tables, integer-cents money columns
    └── lib/
        ├── program.ts        benefit rules, tiers, quotes, formatters, constants
        ├── states.ts         56 jurisdictions with match amounts + agencies
        ├── service.ts        ALL database access, case pipeline, DDL bootstrap, seed
        └── faq.ts            FAQ content shared by /faq and /search
```

## Conventions

- **Pages are thin.** A page composes `PageHero` + sections and, when it needs
  data, calls `src/lib/service.ts`. Complex interactive flows live in
  `src/components/*` as client components.
- **One component per file**, PascalCase filename matching the default export.
  Shared presentational primitives live together in `ui.tsx`.
- **Content that repeats** (FAQ, states, program rules) lives in `src/lib/*` as
  data, not copy-pasted JSX. `lib/faq.ts` and `lib/states.ts` feed multiple pages.
- **No barrel files.** Import from the concrete path (`@/components/ui`,
  `@/lib/program`).
- **Naming:** DB columns snake_case, Drizzle fields camelCase, API JSON camelCase.
  Money fields end in `Cents` or `Amount`; dollar-facing inputs are named
  `amountDollars` and converted at the boundary.
- **CSS classes** use the `usa-*` / `gov-*` prefix to mirror the U.S. Web Design
  System vocabulary already established in `globals.css`.

## Where to add things

| You want to… | Edit |
| --- | --- |
| Change a benefit amount or cohort rule | `src/lib/program.ts` (+ the pages that quote it) |
| Add or change a state's match rate | `src/lib/states.ts` |
| Add a table or column | `src/db/schema.ts` **and** the DDL in `ensureSchema()` in `src/lib/service.ts` |
| Add an endpoint | `src/app/api/<name>/route.ts`, keep logic in `service.ts` |
| Add a page | `src/app/<name>/page.tsx` + add it to `NAV` in `SiteHeader.tsx`, the footer columns, and `PAGES` in `src/app/search/page.tsx` |
| Add a FAQ | `src/lib/faq.ts` (it automatically appears in `/faq` and `/search`) |
| Change colours or fonts | the `@theme {}` block in `src/app/globals.css` |
| Add a shared visual primitive | `src/components/ui.tsx` |

## Files to leave alone

- `.env` (gitignored, machine-specific) — use `.env.example` as the template.
- `next-env.d.ts` (generated by Next).
- `package-lock.json` (regenerated by npm; never hand-edit `package.json`
  versions without reinstalling).
- The prototype disclaimer block in `SiteFooter.tsx`.
