import type { Metadata } from "next";
import Link from "next/link";
import { Callout, Icon, PageHero, SectionHeading, StepList } from "@/components/ui";
import { FEDERAL_SEED_CENTS, FEDERAL_SUPPLEMENT_CENTS, formatUSD } from "@/lib/program";
import { getState } from "@/lib/states";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "The complete Trump Account process: registration, identity verification, account opening, the deposit schedule, growth to age 18 and what happens when the child becomes an adult.",
};

const SCHEDULE = [
  ["Day 0", "Application filed", "Reference number issued and emailed to the guardian.", "—"],
  ["Day 1–2", "Federal intake review", "SSA record, residency and custodian routing number validated.", "—"],
  ["Day 1–5", "Identity verification", "Login.gov / ID.me / documents / in person.", "—"],
  ["Day 5–8", "Custodial account opened", "Account number issued in the child's name.", "—"],
  ["Day 8–15", "Federal seed deposit wired", "$1,000.00 for the automatic cohort.", formatUSD(FEDERAL_SEED_CENTS)],
  ["Day 13–20", "State match credited", "Set by your state treasury office.", "$200.00 – $550.00"],
  ["Each birthday", "Federal birthday supplement", "$150.00 per year until the child turns 6.", `${formatUSD(FEDERAL_SUPPLEMENT_CENTS)} / yr`],
  ["Any time", "Guardian contributions", "Matched by your state up to the annual cap.", "Up to $5,000 / yr"],
];

const AT_18 = [
  { title: "Education", body: "Pay tuition, trade school, certification exams, books or room and board directly to an accredited institution without penalty." },
  { title: "Housing", body: "A first-month rent deposit, a down payment, or a mortgage principal payment made payable to a lender or landlord." },
  { title: "Start a business", body: "Business formation costs, equipment and first-year operating capital, with a simple business plan filed with the state office." },
  { title: "Roll it forward", body: "Transfer the balance into a retirement account or a standard brokerage account in the young adult's own name. No forced distribution." },
];

function workedExample(stateCode: string, cohort: "auto" | "guardian") {
  const st = getState(stateCode)!;
  if (cohort === "auto") {
    return [
      ["Federal seed deposit", formatUSD(FEDERAL_SEED_CENTS)],
      [`${st.name} opening match`, formatUSD(st.stateMatchCents)],
      ["Federal birthday supplements (6 × $150)", formatUSD(FEDERAL_SUPPLEMENT_CENTS * 6)],
      ["Guardian contribution $25/mo × 18 years", formatUSD(25 * 12 * 18 * 100, false)],
      [`${st.name} match on contributions (${st.contributionMatchPct}%, capped)`, formatUSD(st.contributionMatchCapCents * 18, false)],
      ["Estimated growth at 4.5%", formatUSD(2160000, false)],
      ["Projected balance at age 18", formatUSD(3400000, false)],
    ];
  }
  return [
    ["Federal seed deposit", "Not in this cohort"],
    [`${st.name} opening match`, "Not applicable"],
    ["Guardian contribution $100/mo × 18 years", formatUSD(100 * 12 * 18 * 100, false)],
    [`${st.name} match on contributions (${st.contributionMatchPct}%, capped)`, formatUSD(st.contributionMatchCapCents * 18, false)],
    ["Estimated growth at 4.5%", formatUSD(1740000, false)],
    ["Projected balance at age 18", formatUSD(3900000, false)],
  ];
}

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "How It Works" }]}
        eyebrow="The process · End to end"
        title="How the Trump Account works"
        lede={
          <>
            From the moment you file Form TA-1 to the day your child turns eighteen, every step is
            tracked in the national register and visible to you in the{" "}
            <Link href="/status" className="font-semibold text-gov-primary hover:underline">
              application tracker
            </Link>
            .
          </>
        }
        actions={
          <>
            <Link href="/apply" className="usa-button usa-button--primary">
              Register a child
            </Link>
            <Link href="/eligibility" className="usa-button usa-button--outline-dark">
              Check eligibility
            </Link>
          </>
        }
      />

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading kicker="The six stages" title="Registration through first deposit" />
          <div className="mt-10">
            <StepList
              steps={[
                {
                  title: "Register",
                  body: <>Complete the six-step online form. You need the child&apos;s birth details, your state of residence and a custodian bank account. <Link href="/apply" className="font-semibold text-gov-primary hover:underline">Start here</Link>.</>,
                },
                {
                  title: "Verify",
                  body: <>Identity proofing of the adult custodian, by Login.gov, ID.me, document upload, or an in-person office visit. <Link href="/verify" className="font-semibold text-gov-primary hover:underline">Methods</Link>.</>,
                },
                {
                  title: "Open",
                  body: "The Federal Fund Board issues a custodial account number in the child's name at the bank you chose. No fees may be charged.",
                },
                {
                  title: "Deposit",
                  body: "Federal money is wired first, then your state match, then your own contributions on the schedule you set.",
                },
              ]}
            />
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <div className="usa-card overflow-hidden">
              <h2 className="m-0 border-b border-gov-base-light bg-gov-navy px-5 py-3 font-serif text-lg font-bold text-white">
                Deposit schedule
              </h2>
              <div className="overflow-x-auto">
                <table className="usa-table">
                  <thead>
                    <tr>
                      <th scope="col">When</th>
                      <th scope="col">Event</th>
                      <th scope="col">What happens</th>
                      <th scope="col" className="text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SCHEDULE.map(([when, event, what, amount]) => (
                      <tr key={when + event}>
                        <td className="whitespace-nowrap font-bold text-gov-primary-dark">{when}</td>
                        <td className="font-semibold text-gov-navy">{event}</td>
                        <td className="text-sm text-[#3d4551]">{what}</td>
                        <td className="whitespace-nowrap text-right font-serif font-bold tabular-nums text-gov-navy">{amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="usa-card p-5">
                <span className="text-gov-primary">
                  <Icon name="chart" className="h-7 w-7" />
                </span>
                <h3 className="mt-3 mb-1 font-serif text-lg font-bold text-gov-navy">How the money grows</h3>
                <p className="m-0 text-sm leading-relaxed text-[#3d4551]">
                  A TA Savings Account earns the program rate of 3.90% APY, FDIC-insured. A TA
                  Growth Portfolio is invested in an age-based index allocation managed by the
                  Federal Fund Board at a capped expense ratio of 0.05%. A TA Treasury Ladder holds
                  Series I bonds and 5-year notes.
                </p>
                <Link href="/resources#calculator" className="mt-3 inline-block text-sm font-bold text-gov-primary hover:underline">
                  Model the growth →
                </Link>
              </div>
              <Callout tone="warning" title="Moving to another state">
                Your account travels with you. Notify the Fund Administration of a new address within
                30 days. The new state applies its contribution match from the date of the move;
                opening matches already received are never clawed back.
              </Callout>
              <Callout tone="info" title="If the guardian changes">
                Custody transfers, adoption finalizations and the death of a custodian are handled by
                filing Form TA-4 with the state treasury office. The account and its balance remain
                the child&apos;s property throughout.
              </Callout>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Worked examples"
            title="Two children, two cohorts, real numbers"
            lede="Estimates assume a 4.5% average annual return and no withdrawals before age 18."
          />
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="usa-card overflow-hidden">
              <div className="border-b border-gov-base-light bg-gov-primary-lightest px-5 py-4">
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-primary-dark">
                  Automatic cohort · born 2026 in Ohio
                </p>
                <h3 className="m-0 mt-1 font-serif text-xl font-bold text-gov-navy">Amelia, newborn</h3>
              </div>
              <table className="usa-table">
                <tbody>
                  {workedExample("OH", "auto").map(([k, v]) => (
                    <tr key={k}>
                      <td className="text-sm">{k}</td>
                      <td className="text-right font-serif font-bold tabular-nums text-gov-navy">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="usa-card overflow-hidden">
              <div className="border-b border-gov-base-light bg-gov-primary-lightest px-5 py-4">
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-primary-dark">
                  Guardian-funded cohort · born 2019 in Texas
                </p>
                <h3 className="m-0 mt-1 font-serif text-xl font-bold text-gov-navy">Marcus, age 7</h3>
              </div>
              <table className="usa-table">
                <tbody>
                  {workedExample("TX", "guardian").map(([k, v]) => (
                    <tr key={k}>
                      <td className="text-sm">{k}</td>
                      <td className="text-right font-serif font-bold tabular-nums text-gov-navy">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="At age 18"
            title="What the young adult can do with the account"
            lede="On the eighteenth birthday the account converts to the holder's sole control. Nothing is forced, nothing expires, and no fee is charged to convert."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {AT_18.map((a) => (
              <div key={a.title} className="usa-card border-t-4 border-t-gov-primary p-5">
                <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">{a.title}</h3>
                <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">{a.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Callout tone="error" title="Hardship withdrawals before 18">
              Permitted only for documented medical emergency, prevention of eviction or foreclosure,
              or funeral expenses of an immediate family member. The custodian applies to the state
              treasury office with evidence; the Fund Board reviews any appeal within 30 days.
            </Callout>
            <Callout tone="success" title="Unclaimed accounts">
              If a young adult never claims the account, the balance is held in perpetuity by the
              Fiscal Service and continues to earn interest. It is never forfeited to the government.
            </Callout>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/apply" className="usa-button usa-button--primary">
              Register a child now
            </Link>
            <Link href="/faq" className="usa-button usa-button--outline-dark">
              Read the FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
