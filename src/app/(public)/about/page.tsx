import type { Metadata } from "next";
import Link from "next/link";
import { Callout, Icon, PageHero, SectionHeading, StatTile } from "@/components/ui";
import { formatUSD } from "@/lib/program";
import { getProgramStats } from "@/lib/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "About the Program",
  description:
    "The U.S. Child Trust Fund: statutory authority, mission, governance, the Federal Fund Board, and how federal deposits reach every eligible American child.",
};

const TIMELINE = [
  {
    year: "2019",
    title: "Baby bond proposals enter the national debate",
    body: "Economists and members of both parties propose a federally seeded child account as a response to the racial and intergenerational wealth gap.",
  },
  {
    year: "2022",
    title: "State pilots launch",
    body: "Connecticut, Maine and the District of Columbia open the first state-funded child trust accounts for newborns, demonstrating operational feasibility.",
  },
  {
    year: "2024",
    title: "Child Trust Fund Act signed",
    body: "Congress enacts the Child Trust Fund Act of 2024 (31 U.S.C. § 5141 et seq.), creating a $1,000 federal seed deposit for children born 2025–2028 and a matching grant program for states.",
  },
  {
    year: "2025",
    title: "First cohort enrolled",
    body: "Every child born on or after January 1, 2025 becomes eligible. Custodian banks are certified by the Federal Fund Board and registration opens nationwide.",
  },
  {
    year: "2026",
    title: "All jurisdictions participating",
    body: "All 50 states, the District of Columbia and five territories sign administration agreements and publish their opening match rates.",
  },
];

const BOARD = [
  { name: "Office of the Fiscal Service", role: "U.S. Department of the Treasury", duty: "Holds the appropriation, wires federal deposits and publishes the national register." },
  { name: "Federal Fund Board", role: "9-member bipartisan board", duty: "Certifies custodian banks, sets portfolio rules and audits fees charged to child accounts." },
  { name: "State treasury offices", role: "56 jurisdictions", duty: "Verify residency, add the state match, and provide in-person guardian assistance." },
  { name: "Social Security Administration", role: "Federal partner", duty: "Confirms the child's SSN record and citizenship status at intake." },
  { name: "Office of Inspector General", role: "Independent oversight", duty: "Investigates fraud, waste and abuse in program operations." },
  { name: "Consumer Financial Protection Bureau", role: "Federal partner", duty: "Supervises custodian banks for fair treatment of minor accountholders." },
];

export default async function AboutPage() {
  const stats = await getProgramStats();

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "About the Program" }]}
        eyebrow="About · Statute and governance"
        title="The U.S. Child Trust Fund"
        lede={
          <>
            The Child Trust Fund is a federal&ndash;state program that opens a custodial savings
            account in the name of every eligible American child and deposits public money into it.
            The goal is simple: no child should reach adulthood with zero capital.
          </>
        }
        aside={
          <div className="usa-card p-5">
            <h2 className="m-0 font-serif text-base font-bold text-gov-navy">Program facts</h2>
            <dl className="m-0 mt-3 space-y-2 text-sm">
              {[
                ["Authority", "Child Trust Fund Act of 2024"],
                ["Codified at", "31 U.S.C. § 5141 et seq."],
                ["Administered by", "Treasury Fiscal Service"],
                ["Automatic cohort", "Born 2025–2028"],
                ["Federal seed", formatUSD(100000)],
                ["Jurisdictions", "56"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-gov-base-light pb-1.5">
                  <dt className="text-gov-base">{k}</dt>
                  <dd className="m-0 text-right font-bold text-gov-navy">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        }
      />

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
            <div className="usa-prose max-w-none">
              <SectionHeading kicker="Mission" title="Capital at birth, choice at eighteen" />
              <p className="mt-4 text-[1.02rem] leading-relaxed text-[#3d4551]">
                A child born into a family with no savings starts life without the one financial tool
                almost every adult eventually needs: an asset that compounds. Rent deposits, a first
                car, tuition, a small business, an emergency — all of them require capital that a
                paycheck alone rarely produces.
              </p>
              <p className="text-[1.02rem] leading-relaxed text-[#3d4551]">
                The Child Trust Fund answers that with a deposit made in the child&apos;s name on the
                day the account is opened. For children born between January 1, 2025 and December 31,
                2028, the United States Treasury deposits $1,000.00 automatically, and the family&apos;s
                state treasury adds its own match. A further $150.00 federal birthday supplement is
                credited every year until the child turns six.
              </p>
              <p className="text-[1.02rem] leading-relaxed text-[#3d4551]">
                Children born before that window are not left out. A parent or legal guardian may
                register the child and fund the account directly, and participating states match a
                percentage of every guardian contribution up to an annual cap. No child under 18 with
                a valid Social Security number is excluded from the program.
              </p>
              <p className="text-[1.02rem] leading-relaxed text-[#3d4551]">
                The money is locked. The adult custodian may deposit but may not withdraw; only the
                account holder can access funds after their eighteenth birthday, except in documented
                hardship cases approved by the state treasury office. Custodian banks are certified by
                the Federal Fund Board and may charge no maintenance, transfer or closure fees on a
                child trust account.
              </p>

              <Callout tone="info" title="Plain language commitment">
                Every notice, form and screen in this program is written to the federal plain-language
                standard required by the Plain Writing Act of 2010. If any part of this site confuses
                you, tell us through the{" "}
                <Link href="/contact" className="font-semibold underline">
                  contact form
                </Link>{" "}
                and we will rewrite it.
              </Callout>
            </div>

            <div className="space-y-4">
              <StatTile value={stats.totalApplications.toLocaleString("en-US")} label="Children registered" />
              <StatTile value={formatUSD(stats.totalPostedCents, false)} label="Deposited to child accounts" tone="gold" />
              <StatTile value={stats.participatingStates.toString()} label="Participating jurisdictions" tone="white" />
              <img
                src="/img/ctf-seal.png"
                alt="Seal of the Child Trust Fund Administration"
                width={220}
                height={220}
                className="mx-auto mt-4 h-44 w-44 rounded-full object-contain"
              />
              <p className="text-center text-xs text-gov-base">
                Seal of the Child Trust Fund Administration, an office of the U.S. Department of the
                Treasury.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="governance" className="scroll-mt-32 bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Governance"
            title="Who runs the program"
            lede="Six bodies share responsibility, so no single agency controls both the money and the rules."
          />
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {BOARD.map((b) => (
              <div key={b.name} className="usa-card p-5">
                <span className="text-gov-primary">
                  <Icon name="bank" className="h-7 w-7" />
                </span>
                <h3 className="mt-3 mb-0.5 font-serif text-lg font-bold text-gov-navy">{b.name}</h3>
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-primary">{b.role}</p>
                <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">{b.duty}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="usa-card p-5 sm:p-6">
              <h3 className="m-0 font-serif text-xl font-bold text-gov-navy">Program history</h3>
              <ol className="mt-5 mb-0 list-none space-y-0 border-l-2 border-gov-base-light p-0 pl-6">
                {TIMELINE.map((t) => (
                  <li key={t.year} className="relative pb-6">
                    <span className="absolute -left-[2.05rem] top-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-gov-primary" />
                    <p className="m-0 font-serif text-base font-bold text-gov-primary">{t.year}</p>
                    <p className="m-0 mt-0.5 font-bold text-gov-navy">{t.title}</p>
                    <p className="m-0 mt-1 text-sm leading-relaxed text-[#3d4551]">{t.body}</p>
                  </li>
                ))}
              </ol>
            </div>
            <div className="space-y-4">
              <div className="usa-card p-5">
                <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">Fees prohibited</h3>
                <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                  Certified custodians may not charge account maintenance, minimum balance, transfer
                  or closure fees on a child trust account. Excess fees are refunded by the Fund
                  Board with interest.
                </p>
              </div>
              <div className="usa-card p-5">
                <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">Privacy</h3>
                <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                  Records are protected by the Privacy Act of 1974 (System of Records Notice
                  Treasury/CTF.001). Only the custodian, the child after 18, and authorized state and
                  federal staff may view an account.
                </p>
              </div>
              <div className="usa-card p-5">
                <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">Accessibility</h3>
                <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                  This site conforms to Section 508 and WCAG 2.1 AA. Screen-reader users who hit a
                  barrier should call 1-844-555-4CTF and ask for the accessibility coordinator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="newsroom" className="scroll-mt-32 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Newsroom"
            title="Where the money comes from and where it goes"
            lede={
              <>
                Every dollar is tracked in the public register. See the{" "}
                <Link href="/program-data" className="font-semibold text-gov-primary hover:underline">
                  full data dashboard
                </Link>{" "}
                for live figures by state.
              </>
            }
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile value={formatUSD(stats.totalFederalCents, false)} label="Federal deposits" tone="white" sub="Seed + birthday supplements" />
            <StatTile value={formatUSD(stats.totalStateCents, false)} label="State match deposits" tone="white" sub="All jurisdictions" />
            <StatTile value={formatUSD(stats.totalGuardianCents, false)} label="Guardian contributions" tone="white" sub="Family deposits" />
            <StatTile value={formatUSD(stats.scheduledCents, false)} label="Scheduled to wire" tone="gold" sub="Next 12 months" />
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/how-it-works" className="usa-button usa-button--primary">
              How the program works
            </Link>
            <Link href="/eligibility" className="usa-button usa-button--outline-dark">
              Eligibility & benefits
            </Link>
            <Link href="/states" className="usa-button usa-button--outline-dark">
              State match table
            </Link>
            <Link href="/resources" className="usa-button usa-button--outline-dark">
              Resource library
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
