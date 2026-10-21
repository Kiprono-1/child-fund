import Link from "next/link";
import Accordion from "@/components/Accordion";
import CompoundCalculator from "@/components/CompoundCalculator";
import { Callout, FeatureCard, Icon, SectionHeading, StatTile, StatusBadge, StepList } from "@/components/ui";
import {
  ACCOUNT_TYPES,
  AUTO_ENROLLMENT_YEARS,
  FEDERAL_SEED_CENTS,
  formatUSD,
} from "@/lib/program";
import { getProgramStats, getRecentApplications } from "@/lib/service";
import { STATES } from "@/lib/states";

export const dynamic = "force-dynamic";

const HERO_IMG =
  "https://images.pexels.com/photos/6392952/pexels-photo-6392952.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const CLASSROOM_IMG =
  "https://images.pexels.com/photos/8618066/pexels-photo-8618066.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const CAPITOL_IMG =
  "https://images.pexels.com/photos/16151394/pexels-photo-16151394.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";

const NEWS = [
  {
    date: "January 12, 2026",
    tag: "Program update",
    title: "Automatic enrollment opens for every child born in 2025 and 2026",
    body: "Birth records filed with the Social Security Administration are now matched nightly, so eligible newborns receive a provisional CTF reference number before their parents register.",
    href: "/about#newsroom",
  },
  {
    date: "December 4, 2025",
    tag: "State match",
    title: "Nine states increased their opening match for program year 2026",
    body: "Massachusetts, New York and the District of Columbia now match the federal seed deposit at $550. Alaska, Hawaii and Oregon moved to $400 or more.",
    href: "/states",
  },
  {
    date: "November 18, 2025",
    tag: "Consumer alert",
    title: "The Child Trust Fund never asks for a fee, a gift card or your full SSN",
    body: "Registration and deposits are free. Report anyone who charges a fee to 'expedite' a CTF application to the Office of Inspector General.",
    href: "/faq",
  },
];

const FAQS = [
  {
    q: "Who automatically receives the $1,000 federal deposit?",
    a: "Every U.S. citizen child born between January 1, 2025 and December 31, 2028 with a valid Social Security number. A parent or guardian still registers the account and completes identity verification, but no money is required from the family.",
    tag: "Eligibility",
  },
  {
    q: "My child was born before 2025. Can they still get an account?",
    a: "Yes. Children born before the automatic-enrollment window are registered in the guardian-funded cohort. You open the account and deposit funds yourself, and your state still matches a percentage of every contribution up to its annual cap.",
    tag: "Eligibility",
  },
  {
    q: "How fast is the money deposited after I register?",
    a: "Identity verification takes 1–5 business days depending on the method you choose. Once verified, the custodial account is opened within 3 business days and the federal seed deposit is wired within 10 business days of verification.",
    tag: "Timing",
  },
  {
    q: "Can I withdraw money from the child's account?",
    a: "No. The account is owned by the child and custodially managed by you. Withdrawals are only permitted by the account holder after their 18th birthday, or in a documented hardship approved by your state treasury office.",
    tag: "Rules",
  },
  {
    q: "Is the deposit taxable?",
    a: "Federal seed deposits and state matches are not taxable income to the child or the guardian. Investment earnings inside a CTF Growth Portfolio are tax-deferred until distribution, similar to a Series I savings bond.",
    tag: "Taxes",
  },
];

export default async function HomePage() {
  const [stats, recent] = await Promise.all([getProgramStats(), getRecentApplications(6)]);

  const topStates = [...STATES].sort((a, b) => b.stateMatchCents - a.stateMatchCents).slice(0, 8);
  const leadState = stats.byState[0];

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="relative overflow-hidden bg-gov-navy text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 12% 20%, #ffffff 0 1.5px, transparent 1.6px), radial-gradient(circle at 62% 70%, #ffffff 0 1.5px, transparent 1.6px)",
            backgroundSize: "80px 80px, 120px 120px",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-20">
          <div>
            <p className="m-0 flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-gov-accent">
              <span className="inline-block h-px w-8 bg-gov-accent" aria-hidden="true" />
              Child Trust Fund Act of 2024 · 31 U.S.C. § 5141
            </p>
            <h1 className="mt-4 mb-0 max-w-2xl font-serif text-[clamp(2.1rem,5.2vw,3.6rem)] font-bold leading-[1.06]">
              Every child born in America starts life with a stake in its future.
            </h1>
            <p className="mt-5 max-w-xl text-[1.05rem] leading-relaxed text-gov-primary-lighter">
              The U.S. Child Trust Fund deposits{" "}
              <strong className="text-white">{formatUSD(FEDERAL_SEED_CENTS)}</strong> into a
              custodial account for every child born {AUTO_ENROLLMENT_YEARS[0]}–
              {AUTO_ENROLLMENT_YEARS[AUTO_ENROLLMENT_YEARS.length - 1]}, matched by your state
              treasury. Children born earlier can be registered and funded by a parent or guardian
              — with the same state match.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/apply" className="usa-button usa-button--accent">
                Register a child
              </Link>
              <Link href="/status" className="usa-button usa-button--outline">
                Track an application
              </Link>
              <Link href="/eligibility" className="usa-button usa-button--outline">
                Am I eligible?
              </Link>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-white/20 pt-6">
              <div>
                <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-gov-primary-light">
                  Federal seed
                </dt>
                <dd className="m-0 mt-1 font-serif text-2xl font-bold">{formatUSD(FEDERAL_SEED_CENTS, false)}</dd>
              </div>
              <div>
                <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-gov-primary-light">
                  States participating
                </dt>
                <dd className="m-0 mt-1 font-serif text-2xl font-bold">{stats.participatingStates}</dd>
              </div>
              <div>
                <dt className="text-[0.68rem] font-bold uppercase tracking-wider text-gov-primary-light">
                  Median state match
                </dt>
                <dd className="m-0 mt-1 font-serif text-2xl font-bold">
                  {formatUSD(
                    [...STATES].sort((a, b) => a.stateMatchCents - b.stateMatchCents)[
                      Math.floor(STATES.length / 2)
                    ].stateMatchCents,
                    false,
                  )}
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded border-4 border-white/20 shadow-2xl">
              <img
                src={HERO_IMG}
                alt="Parents with their newborn child at home in the United States"
                className="h-64 w-full object-cover sm:h-80 lg:h-[22rem]"
                loading="eager"
                width={1200}
                height={627}
              />
            </div>
            <div className="absolute -bottom-6 left-4 right-4 rounded border border-gov-base-light bg-white p-4 shadow-xl sm:left-6 sm:right-auto sm:max-w-xs">
              <div className="flex items-center gap-3">
                <img
                  src="/img/ctf-seal.png"
                  alt="Seal of the Child Trust Fund Administration"
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-full object-contain"
                />
                <div>
                  <p className="m-0 text-[0.65rem] font-bold uppercase tracking-wider text-gov-base">
                    Accounts opened
                  </p>
                  <p className="m-0 font-serif text-2xl font-bold tabular-nums text-gov-navy">
                    {stats.totalApplications.toLocaleString("en-US")}
                  </p>
                </div>
              </div>
              <p className="m-0 mt-2 border-t border-gov-base-light pt-2 text-xs text-gov-base">
                {formatUSD(stats.totalPostedCents, false)} deposited to children&apos;s accounts
                nationwide.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- ANNOUNCEMENT ---------------- */}
      <div className="bg-gov-accent text-gov-navy-deep">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm sm:px-6">
          <span className="usa-tag !bg-gov-navy-deep !text-gov-accent">Enrollment open</span>
          <span className="font-semibold">
            Children born {AUTO_ENROLLMENT_YEARS[0]}–{AUTO_ENROLLMENT_YEARS[3]} are enrolled
            automatically at no cost to the family.
          </span>
          <Link href="/apply" className="ml-auto font-bold underline underline-offset-2 hover:no-underline">
            Start registration →
          </Link>
        </div>
      </div>

      {/* ---------------- QUICK ACTIONS ---------------- */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Guardian services"
            title="What do you need to do today?"
            lede="Four services cover everything from registering a newborn to depositing money into an existing child account."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard icon={<Icon name="baby" />} title="Register a child" href="/apply" cta="Start the 6-step application">
              Birth details, your residency state and a custodian bank account. About 10 minutes.
            </FeatureCard>
            <FeatureCard icon={<Icon name="shield" />} title="Verify identity" href="/verify" cta="Choose a verification method">
              Login.gov, ID.me, document upload or an in-person visit to a state treasury office.
            </FeatureCard>
            <FeatureCard icon={<Icon name="document" />} title="Track application" href="/status" cta="Look up your reference number">
              See the review pipeline, case history and every scheduled deposit in real time.
            </FeatureCard>
            <FeatureCard icon={<Icon name="bank" />} title="Make a deposit" href="/deposit" cta="Add funds to an account">
              One-time or monthly contributions, matched by your state up to the annual cap.
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ---------------- LIVE STATISTICS ---------------- */}
      <section className="bg-gov-base-lightest py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div>
              <SectionHeading
                kicker="Live program data"
                title="Where the Child Trust Fund stands today"
                lede={
                  <>
                    Figures below are read directly from the national enrollment register and are
                    updated continuously.{" "}
                    <Link href="/program-data" className="font-semibold text-gov-primary hover:underline">
                      See the full data dashboard →
                    </Link>
                  </>
                }
              />
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <StatTile value={stats.totalApplications.toLocaleString("en-US")} label="Children registered" sub="All cohorts" />
                <StatTile value={stats.fundedAccounts.toLocaleString("en-US")} label="Accounts funded" sub="Deposits wired" tone="gold" />
                <StatTile value={formatUSD(stats.totalFederalCents, false)} label="Federal deposits" sub="Seed + birthday supplements" tone="white" />
                <StatTile value={formatUSD(stats.totalStateCents, false)} label="State match deposits" sub={`${stats.participatingStates} jurisdictions`} tone="white" />
              </div>
            </div>

            <div className="usa-card overflow-hidden">
              <div className="border-b border-gov-base-light bg-gov-navy px-5 py-3">
                <p className="m-0 text-xs font-bold uppercase tracking-wider text-gov-accent">
                  Most recent registrations
                </p>
              </div>
              <ul className="m-0 list-none divide-y divide-gov-base-light p-0">
                {recent.map((r) => (
                  <li key={r.referenceNumber} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gov-primary-lighter font-serif text-sm font-bold text-gov-primary-darker">
                      {r.childFirstName.charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-gov-navy">
                        {r.childFirstName} {r.childLastName.charAt(0)}.
                      </span>
                      <span className="block text-xs text-gov-base">
                        {r.referenceNumber} · {STATES.find((s) => s.code === r.parentState)?.name ?? r.parentState} ·{" "}
                        {r.autoEnrollment ? "Automatic cohort" : "Guardian-funded"}
                      </span>
                    </span>
                    <StatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
              <div className="border-t border-gov-base-light bg-gov-base-lightest px-5 py-3 text-xs text-gov-base">
                Names are abbreviated to protect the privacy of minors.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="How it works"
            title="From birth certificate to funded account in four steps"
            lede="The whole process is designed to take less than two weeks from filing to first deposit."
          />
          <div className="mt-10">
            <StepList
              steps={[
                {
                  title: "Register the child",
                  body: "A parent or legal guardian files the online application with the child's birth details, your state of residence and a custodian bank account.",
                },
                {
                  title: "Verify your identity",
                  body: "Federal law requires identity proofing of the adult custodian. Use Login.gov, ID.me, upload documents, or visit a state treasury office.",
                },
                {
                  title: "Account is opened",
                  body: "The Fund Board opens a custodial account in the child's name. You receive the account number and can track it any time.",
                },
                {
                  title: "Funds are deposited",
                  body: "The federal seed deposit is wired within 10 business days, your state match follows within 5 days, and the birthday supplement repeats annually.",
                },
              ]}
            />
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            <div className="usa-card overflow-hidden lg:col-span-2">
              <img
                src={CAPITOL_IMG}
                alt="The United States Capitol building with the American flag flying"
                className="h-56 w-full object-cover sm:h-72"
                loading="lazy"
                width={1200}
                height={627}
              />
              <div className="p-5 sm:p-6">
                <h3 className="m-0 font-serif text-xl font-bold text-gov-navy">
                  A federal deposit, administered with your state
                </h3>
                <div className="gov-rule mt-2" />
                <p className="mt-3 mb-0 text-sm leading-relaxed text-[#3d4551]">
                  The Treasury funds the account; your state treasury office verifies residency,
                  adds its own match and provides in-person help. {leadState ? `${leadState.name} currently leads the nation with ${leadState.applications.toLocaleString("en-US")} registered children.` : ""} Every jurisdiction publishes its match rate on the{" "}
                  <Link href="/states" className="font-semibold text-gov-primary hover:underline">
                    state participation table
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {ACCOUNT_TYPES.map((a) => (
                <div key={a.id} className="usa-card p-4">
                  <h4 className="m-0 font-serif text-base font-bold text-gov-navy">{a.label}</h4>
                  <p className="mt-1 mb-0 text-sm leading-relaxed text-[#3d4551]">{a.detail}</p>
                </div>
              ))}
              <Callout tone="info" title="You choose the account type at registration">
                The selection can be changed once per program year by the custodian.
              </Callout>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- BENEFIT TABLE ---------------- */}
      <section className="bg-gov-navy py-14 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-gov-accent">
              Benefits by birth year
            </p>
            <h2 className="mt-2 mb-0 font-serif text-[clamp(1.5rem,3vw,2.1rem)] font-bold">
              What your child receives, by year of birth
            </h2>
            <div className="gov-rule mt-3" />
          </div>
          <div className="mt-8 overflow-x-auto rounded border border-white/15">
            <table className="usa-table !bg-white text-gov-ink">
              <thead>
                <tr>
                  <th scope="col">Birth year</th>
                  <th scope="col">Cohort</th>
                  <th scope="col">Federal seed</th>
                  <th scope="col">State match</th>
                  <th scope="col">Birthday supplement</th>
                  <th scope="col">Guardian deposits</th>
                </tr>
              </thead>
              <tbody>
                {["2025", "2026", "2027", "2028"].map((y) => (
                  <tr key={y}>
                    <td className="font-serif text-base font-bold text-gov-navy">{y}</td>
                    <td>
                      <span className="usa-tag bg-[#ddf9c7] text-gov-green-dark">Automatic</span>
                    </td>
                    <td className="font-semibold">{formatUSD(FEDERAL_SEED_CENTS)}</td>
                    <td>{formatUSD(20000)} – {formatUSD(55000)}</td>
                    <td>{formatUSD(15000)} / year to age 6</td>
                    <td>Allowed, up to $5,000 / year</td>
                  </tr>
                ))}
                <tr>
                  <td className="font-serif text-base font-bold text-gov-navy">2015 – 2024</td>
                  <td>
                    <span className="usa-tag bg-gov-primary-lighter text-gov-primary-darker">Guardian-funded</span>
                  </td>
                  <td>—</td>
                  <td>Match on your deposits</td>
                  <td>—</td>
                  <td>
                    <strong>Required</strong> — you fund the account
                  </td>
                </tr>
                <tr>
                  <td className="font-serif text-base font-bold text-gov-navy">Before 2015</td>
                  <td>
                    <span className="usa-tag bg-gov-base-lighter text-gov-navy">Legacy transfer</span>
                  </td>
                  <td>—</td>
                  <td>Case by case</td>
                  <td>—</td>
                  <td>Handled by the state transfer desk</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-xs text-gov-primary-light">
            State match figures show the current range across all participating jurisdictions. Look
            up your state on the <Link href="/states" className="text-gov-accent hover:underline">participation table</Link>.
          </p>
        </div>
      </section>

      {/* ---------------- STATES ---------------- */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr] lg:items-start">
            <div>
              <SectionHeading
                kicker="State participation"
                title="The highest opening matches in program year 2026"
                lede="Each state sets its own opening match and its own percentage match on guardian contributions. All 50 states, D.C. and five territories participate."
              />
              <Link href="/states" className="usa-button usa-button--outline-dark mt-6">
                See all 56 jurisdictions
              </Link>
            </div>
            <div className="overflow-hidden rounded border border-gov-base-light">
              <table className="usa-table">
                <thead>
                  <tr>
                    <th scope="col">State</th>
                    <th scope="col">Treasury office</th>
                    <th scope="col" className="text-right">Opening match</th>
                    <th scope="col" className="text-right">Match on deposits</th>
                  </tr>
                </thead>
                <tbody>
                  {topStates.map((s) => (
                    <tr key={s.code}>
                      <td className="font-bold text-gov-navy">{s.name}</td>
                      <td className="text-xs text-gov-base">{s.agency}</td>
                      <td className="text-right font-serif font-bold tabular-nums text-gov-green-dark">
                        {formatUSD(s.stateMatchCents)}
                      </td>
                      <td className="text-right tabular-nums">{s.contributionMatchPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- CALCULATOR ---------------- */}
      <section id="calculator" className="scroll-mt-32 bg-gov-primary-lightest py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Savings tool"
            title="See what the account could be worth at 18"
            lede="Move the sliders to model your child's account. The dashed line shows the same contributions held in an ordinary savings account, without federal or state money."
          />
          <div className="usa-card mt-8 p-5 sm:p-7">
            <CompoundCalculator />
          </div>
        </div>
      </section>

      {/* ---------------- NEWS + EDUCATION ---------------- */}
      <section className="py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <SectionHeading kicker="Newsroom" title="Announcements and program updates" />
              <div className="mt-6 space-y-4">
                {NEWS.map((n) => (
                  <Link
                    key={n.title}
                    href={n.href}
                    className="usa-card block p-5 transition-shadow hover:border-gov-primary hover:shadow-md"
                  >
                    <p className="m-0 flex items-center gap-3 text-[0.7rem] font-bold uppercase tracking-wider text-gov-base">
                      <span>{n.date}</span>
                      <span className="usa-tag bg-gov-primary-lighter text-gov-primary-darker">{n.tag}</span>
                    </p>
                    <h3 className="mt-2 mb-0 font-serif text-lg font-bold text-gov-navy">{n.title}</h3>
                    <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">{n.body}</p>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <SectionHeading kicker="Learn" title="Teach your child about money" />
              <div className="mt-6 overflow-hidden rounded border border-gov-base-light">
                <img
                  src={CLASSROOM_IMG}
                  alt="Children reading and writing together in a bright American classroom"
                  className="h-44 w-full object-cover"
                  loading="lazy"
                  width={1200}
                  height={627}
                />
                <div className="p-5">
                  <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">
                    Money lessons for ages 5 to 18
                  </h3>
                  <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                    Free, plain-language guides from the Federal Fund Board: how saving works, what
                    compound interest does, how to read a bank statement, and how to avoid fraud.
                  </p>
                  <Link href="/resources" className="usa-button usa-button--primary mt-4 !py-2 text-sm">
                    Open the resource library
                  </Link>
                </div>
              </div>
              <Callout tone="warning" title="Watch out for imposters">
                The Child Trust Fund Administration never calls, texts or emails asking for a fee,
                a gift card, your full Social Security number or your bank password.{" "}
                <Link href="/faq" className="font-semibold underline">
                  Read the fraud guidance
                </Link>
                .
              </Callout>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="bg-gov-base-lightest py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <div>
              <SectionHeading
                kicker="Questions"
                title="Frequently asked questions"
                lede={
                  <>
                    Can&apos;t find your answer? Call{" "}
                    <a href="tel:18445554823" className="font-semibold text-gov-primary hover:underline">
                      1-844-555-4CTF
                    </a>{" "}
                    or{" "}
                    <Link href="/contact" className="font-semibold text-gov-primary hover:underline">
                      send us a message
                    </Link>
                    .
                  </>
                }
              />
              <Link href="/faq" className="usa-button usa-button--outline-dark mt-6">
                All 24 questions
              </Link>
            </div>
            <Accordion items={FAQS} />
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="bg-gov-primary py-14 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-8 px-4 sm:px-6">
          <img
            src="/img/gov-seal.png"
            alt=""
            aria-hidden="true"
            width={110}
            height={110}
            className="hidden h-28 w-28 rounded-full bg-white object-contain p-2 sm:block"
          />
          <div className="max-w-2xl flex-1">
            <h2 className="m-0 font-serif text-[clamp(1.5rem,3vw,2.2rem)] font-bold">
              Register your child today — it takes about ten minutes.
            </h2>
            <p className="mt-3 mb-0 text-sm leading-relaxed text-gov-primary-lighter">
              You will need the child&apos;s birth certificate details, your Social Security last
              four digits, a photo ID, and a custodian bank account. There is no fee, ever.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/apply" className="usa-button usa-button--accent">
              Register a child
            </Link>
            <Link href="/verify" className="usa-button usa-button--outline">
              Verify identity
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
