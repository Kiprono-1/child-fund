import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, Callout, PageHero } from "@/components/ui";
import { FAQS } from "@/lib/faq";
import { formatUSD } from "@/lib/program";
import { STATES } from "@/lib/states";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  description: "Search Trump.Account.gov — program pages, frequently asked questions and state match information.",
};

type Entry = {
  title: string;
  url: string;
  type: string;
  body: string;
  keywords: string;
};

const PAGES: Entry[] = [
  { title: "Register a Child", url: "/apply", type: "Service", body: "File the six-step Trump Account application: guardian details, state of residence, child birth details, trust account, identity verification and certification.", keywords: "apply register application form ctf-1 sign up enroll newborn baby open account" },
  { title: "Track Your Application", url: "/status", type: "Service", body: "Look up a case with your reference number, follow the review pipeline, upload verification documents and review the deposit ledger.", keywords: "track status case lookup reference number pipeline progress check where is my application" },
  { title: "Verify Your Identity", url: "/verify", type: "Service", body: "Login.gov, ID.me, secure document upload or an in-person visit to a state treasury office. Documents accepted and typical timing.", keywords: "verify identity proofing login.gov id.me documents photo id birth certificate office" },
  { title: "Make a Deposit", url: "/deposit", type: "Service", body: "One-time or monthly guardian contributions to a child account, with a state match on every deposit up to $5,000 per year.", keywords: "deposit contribute money add funds gift grandparent recurring monthly ach" },
  { title: "About the Program", url: "/about", type: "About", body: "Mission, statutory authority under the Trump Account Act of 2024, governance, the Federal Fund Board and program history.", keywords: "about mission statute governance board history treasury authority 31 usc 5141" },
  { title: "How It Works", url: "/how-it-works", type: "About", body: "Registration, verification, account opening, the deposit schedule, growth to age 18 and hardship withdrawal rules.", keywords: "how it works process steps timeline deposit schedule growth age 18 hardship" },
  { title: "Eligibility & Benefits", url: "/eligibility", type: "About", body: "Who qualifies, benefit amounts for each cohort, common blockers, special situations and the eligibility FAQ.", keywords: "eligibility qualify benefits cohort automatic 2025 2026 2027 2028 income limit citizen ssn" },
  { title: "State Participation & Match Rates", url: "/states", type: "Data", body: "Opening match, contribution match percentage and annual cap for all 50 states, the District of Columbia and five territories.", keywords: "state match rates table ohio texas california new york florida territory dc puerto rico" },
  { title: "Program Data & Statistics", url: "/program-data", type: "Data", body: "Live enrollment and funding statistics from the national register: registrations by state, deposits by source, statuses and monthly trends.", keywords: "data statistics dashboard numbers open data enrollment counts totals chart" },
  { title: "Resources & Financial Education", url: "/resources", type: "Education", body: "Guides, classroom lesson plans, the growth calculator, official forms and a plain-language glossary.", keywords: "resources guides education calculator forms glossary classroom teachers kids teens" },
  { title: "Frequently Asked Questions", url: "/faq", type: "Help", body: "Thirty plain-language answers covering eligibility, registration, verification, deposits, using the account and fraud prevention.", keywords: "faq questions answers help support" },
  { title: "Contact Us", url: "/contact", type: "Help", body: "Guardian Help Line, written contact form, mailing address, Office of Inspector General and state treasury offices.", keywords: "contact phone help line email address office fraud report accessibility" },
  { title: "My Dashboard", url: "/dashboard", type: "Account", body: "View your child's Trump Account balance, deposit history, case status and quick actions. Sign in required.", keywords: "dashboard my account balance deposits status guardian logged in" },
];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

  const index: Entry[] = [
    ...PAGES,
    ...FAQS.map((f) => ({
      title: f.q,
      url: "/faq",
      type: `FAQ · ${f.category}`,
      body: f.a,
      keywords: `${f.category} ${f.tag ?? ""}`.toLowerCase(),
    })),
    ...STATES.map((s) => ({
      title: `${s.name} — Trump Account in ${s.name}`,
      url: "/states",
      type: "State",
      body: `${s.agency} co-administers the program in ${s.name}. Opening match ${formatUSD(
        s.stateMatchCents,
      )}; ${s.contributionMatchPct}% match on guardian contributions, capped at ${formatUSD(
        s.contributionMatchCapCents,
        false,
      )} per year.`,
      keywords: `${s.code} ${s.name} ${s.agency} state territory match`.toLowerCase(),
    })),
  ];

  const results = terms.length
    ? index
        .map((e) => {
          const hay = `${e.title} ${e.body} ${e.keywords}`.toLowerCase();
          let score = 0;
          terms.forEach((t) => {
            if (e.title.toLowerCase().includes(t)) score += 5;
            if (e.keywords.includes(t)) score += 3;
            if (e.body.toLowerCase().includes(t)) score += 1;
          });
          return { e, score };
        })
        .filter((r) => r.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 20)
        .map((r) => r.e)
    : [];

  const popular = [
    { label: "Register a child", href: "/apply" },
    { label: "Who is eligible?", href: "/eligibility" },
    { label: "State match rates", href: "/states" },
    { label: "Verification methods", href: "/verify" },
    { label: "Deposit schedule", href: "/how-it-works" },
    { label: "Report fraud", href: "/faq" },
  ];

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Search" }]}
        eyebrow="Site search"
        title={query ? `Results for “${query}”` : "Search Trump.Account.gov"}
        lede={
          query ? (
            <p className="m-0">
              {results.length} result{results.length === 1 ? "" : "s"} across program pages,
              frequently asked questions and all 56 jurisdictions.
            </p>
          ) : (
            <p className="m-0">
              Search across every program page, all {FAQS.length} FAQ answers and every state match
              entry.
            </p>
          )
        }
      />

      <section className="py-12">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <Breadcrumbs trail={[{ label: "Home", href: "/" }, { label: "Search" }]} />

          <form action="/search" method="get" className="usa-card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <label className="usa-label !mb-0 sm:w-24" htmlFor="q">
              Search
            </label>
            <input
              id="q"
              name="q"
              type="search"
              defaultValue={query}
              className="usa-input flex-1"
              placeholder="e.g. state match, twins, verification"
            />
            <button type="submit" className="usa-button usa-button--primary">
              Search
            </button>
          </form>

          {!query && (
            <div className="mt-8">
              <h2 className="m-0 font-serif text-lg font-bold text-gov-navy">Popular searches</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {popular.map((p) => (
                  <Link
                    key={p.label}
                    href={p.href}
                    className="rounded-full border border-gov-base-light bg-white px-4 py-1.5 text-sm font-bold text-gov-primary-dark hover:border-gov-primary hover:bg-gov-primary-lightest"
                  >
                    {p.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {query && results.length === 0 && (
            <div className="mt-8 space-y-4">
              <Callout tone="warning" title="No results">
                We could not find anything matching &ldquo;{query}&rdquo;. Try a shorter term, check
                the spelling, or browse the{" "}
                <Link href="/faq" className="font-semibold underline">
                  FAQ
                </Link>
                .
              </Callout>
              <Callout tone="info" title="Ask a person instead">
                The Guardian Help Line answers questions the website does not cover:{" "}
                <a href="tel:18445554823" className="font-semibold underline">
                  1-844-555-4TA
                </a>
                , Monday&ndash;Friday 8 a.m. &ndash; 8 p.m. ET.
              </Callout>
            </div>
          )}

          {results.length > 0 && (
            <ol className="mt-8 list-none space-y-4 p-0">
              {results.map((r, i) => (
                <li key={`${r.url}-${i}`} className="usa-card p-5">
                  <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-gov-primary">
                    {r.type}
                  </p>
                  <h2 className="m-0 mt-1 font-serif text-lg font-bold text-gov-navy">
                    <Link href={r.url} className="hover:text-gov-primary hover:underline">
                      {r.title}
                    </Link>
                  </h2>
                  <p className="mt-2 mb-1 text-sm leading-relaxed text-[#3d4551]">{r.body}</p>
                  <p className="m-0 text-xs text-gov-base">trump.account.gov{r.url}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </>
  );
}
