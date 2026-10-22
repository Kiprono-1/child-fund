import type { Metadata } from "next";
import Link from "next/link";
import CompoundCalculator from "@/components/CompoundCalculator";
import { Callout, Icon, PageHero, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Resources & Financial Education",
  description:
    "Free guides, classroom materials, a compound growth calculator, forms and a plain-language glossary for the U.S. Trump Account.",
};

const GUIDES = [
  {
    cat: "For new parents",
    title: "Your first 30 days with a Trump Account account",
    body: "What to expect after the hospital, how registration works with a birth certificate, and how to set up a recurring $25 deposit that compounds for 18 years.",
    read: "8 min read",
    href: "/how-it-works",
  },
  {
    cat: "For guardians",
    title: "Choosing between savings, growth and a Treasury ladder",
    body: "A side-by-side look at the three account types, their risk, their returns and how to switch once per program year without losing your state match.",
    read: "11 min read",
    href: "/eligibility",
  },
  {
    cat: "For kids 5–12",
    title: "The magic of saving: a guide for elementary classrooms",
    body: "Illustrated lesson on how a dollar grows, with a printable coin-jar tracker and a class activity that models the birthday supplement.",
    read: "Lesson plan · 45 min",
    href: "#classroom",
  },
  {
    cat: "For teens 13–17",
    title: "Your account, your future: what happens at 18",
    body: "Written for the account holder. Covers taking control of the account, the four ways to use the balance, and how to avoid the fees that eat savings.",
    read: "10 min read",
    href: "/how-it-works",
  },
  {
    cat: "Fraud awareness",
    title: "Five scams targeting families with child accounts",
    body: "Fake 'expedite' calls, look-alike websites, gift-card demands, false tax notices and phony custody offers — how to recognize and report each one.",
    read: "7 min read",
    href: "/faq",
  },
  {
    cat: "For grandparents",
    title: "Gifting to a grandchild's trust account",
    body: "How to contribute with a reference number, what counts toward the annual limit, and how gifting interacts with your own tax filing.",
    read: "6 min read",
    href: "/deposit",
  },
];

const FORMS = [
  ["TA-1", "Trump Account application", "Filed online in six steps. Paper copies available by mail.", "/apply"],
  ["TA-2", "Document upload cover sheet", "Use when mailing verification documents instead of uploading.", "/verify"],
  ["TA-4", "Change of custodian", "Custody transfers, adoption finalizations, death of a custodian.", "/contact"],
  ["TA-7", "Address or bank change", "Report a move or new custodian account within 30 days.", "/contact"],
  ["TA-9", "Request for reconsideration", "Appeal a decision within 60 days with new evidence.", "/contact"],
  ["TA-12", "Hardship withdrawal request", "Medical, eviction prevention or funeral expenses only.", "/contact"],
  ["Pub. 5900", "Trump Account guardian handbook", "Complete plain-language guide to the program.", "/about"],
  ["Sch. 2026-SM", "State match schedule, program year 2026", "All 56 jurisdictions, rates and caps.", "/states"],
];

const GLOSSARY = [
  ["Custodial account", "An account owned by the child but managed by an adult custodian until the child turns 18."],
  ["Federal seed deposit", "The one-time $1,000.00 deposited by the U.S. Treasury for children born 2025–2028."],
  ["State match", "Money added by a state treasury office, either on opening or as a percentage of guardian contributions."],
  ["Birthday supplement", "A $150.00 federal deposit credited every year until the child turns six."],
  ["Program year", "The federal fiscal year, October 1 through September 30, used for the $5,000 contribution limit."],
  ["Certified custodian", "An FDIC or NCUA insured institution approved by the Federal Fund Board to hold child trust accounts, prohibited from charging fees."],
  ["Identity proofing", "The federal process that confirms the adult opening the account is who they say they are."],
  ["Reference number", "Your TA-YYYY-XXXXXX case identifier. Needed to track the application and to make deposits."],
];

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Resources" }]}
        eyebrow="Education · Tools · Forms"
        title="Resources for guardians, teachers and kids"
        lede={
          <>
            Free, plain-language materials from the Federal Fund Board. Everything here is written to
            the federal plain-language standard and available in English and Spanish.
          </>
        }
        actions={
          <>
            <Link href="#calculator" className="usa-button usa-button--primary">
              Open the savings calculator
            </Link>
            <Link href="#forms" className="usa-button usa-button--outline-dark">
              Forms &amp; publications
            </Link>
          </>
        }
      />

      <section id="calculator" className="scroll-mt-32 bg-gov-primary-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Interactive tool"
            title="Trump Account growth calculator"
            lede="Model any child's account. Compare it against the same contributions held in an ordinary savings account with no federal or state money."
          />
          <div className="usa-card mt-8 p-5 sm:p-7">
            <CompoundCalculator />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading kicker="Library" title="Guides and lesson plans" />
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => (
              <article key={g.title} className="usa-card flex h-full flex-col p-5">
                <p className="m-0 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-gov-primary">
                  {g.cat}
                </p>
                <h3 className="mt-2 mb-0 font-serif text-lg font-bold leading-snug text-gov-navy">
                  {g.title}
                </h3>
                <p className="mt-2 mb-0 flex-1 text-sm leading-relaxed text-[#3d4551]">{g.body}</p>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-gov-base-light pt-3">
                  <span className="text-xs text-gov-base">{g.read}</span>
                  <Link href={g.href} className="text-sm font-bold text-gov-primary hover:underline">
                    Open →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="forms" className="scroll-mt-32 bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Official paperwork"
            title="Forms and publications"
            lede="Every form in the program, what it does and where to file it. Paper copies are mailed free of charge on request."
          />
          <div className="mt-8 overflow-x-auto rounded border border-gov-base-light bg-white">
            <table className="usa-table">
              <thead>
                <tr>
                  <th scope="col">Form</th>
                  <th scope="col">Title</th>
                  <th scope="col">Purpose</th>
                  <th scope="col">Where to file</th>
                </tr>
              </thead>
              <tbody>
                {FORMS.map(([code, title, purpose, href]) => (
                  <tr key={code}>
                    <td className="whitespace-nowrap font-mono text-sm font-bold text-gov-primary-dark">
                      {code}
                    </td>
                    <td className="font-semibold text-gov-navy">{title}</td>
                    <td className="text-sm text-[#3d4551]">{purpose}</td>
                    <td>
                      <Link href={href} className="text-sm font-bold text-gov-primary hover:underline">
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-gov-base">
            Need a paper copy mailed to you? Call{" "}
            <a href="tel:18445554823" className="font-semibold text-gov-primary hover:underline">
              1-844-555-4TA
            </a>{" "}
            or select &ldquo;Forms request&rdquo; on the{" "}
            <Link href="/contact" className="font-semibold text-gov-primary hover:underline">
              contact form
            </Link>
            .
          </p>
        </div>
      </section>

      <section id="classroom" className="scroll-mt-32 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.3fr] lg:items-start">
            <div>
              <SectionHeading
                kicker="Glossary"
                title="Plain-language definitions"
                lede="The eight terms that appear most often in program notices."
              />
              <dl className="mt-6 list-none space-y-3 p-0">
                {GLOSSARY.map(([term, def]) => (
                  <div key={term} className="usa-card p-4">
                    <dt className="font-serif text-base font-bold text-gov-navy">{term}</dt>
                    <dd className="m-0 mt-1 text-sm leading-relaxed text-[#3d4551]">{def}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="space-y-6">
              <div className="usa-card overflow-hidden">
                <img
                  src="https://images.pexels.com/photos/8457299/pexels-photo-8457299.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200"
                  alt="A diverse group of American children studying together with notebooks"
                  className="h-56 w-full object-cover"
                  loading="lazy"
                  width={1200}
                  height={627}
                />
                <div className="p-5 sm:p-6">
                  <span className="text-gov-primary">
                    <Icon name="book" className="h-7 w-7" />
                  </span>
                  <h2 className="mt-3 mb-1 font-serif text-xl font-bold text-gov-navy">
                    Bring the Trump Account into your classroom
                  </h2>
                  <p className="m-0 text-sm leading-relaxed text-[#3d4551]">
                    A free four-lesson unit for grades 4–12 covers saving, compound growth, how a
                    government program is funded, and how to read a bank statement. Includes a
                    printable coin tracker, a mock registration worksheet and a teacher answer key.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href="/contact" className="usa-button usa-button--primary !py-2 text-sm">
                      Request the classroom kit
                    </Link>
                    <Link href="/faq" className="usa-button usa-button--outline-dark !py-2 text-sm">
                      Teacher FAQ
                    </Link>
                  </div>
                </div>
              </div>

              <Callout tone="info" title="Related federal resources">
                Explore{" "}
                <a href="https://www.investor.gov" className="font-semibold underline">
                  Investor.gov
                </a>{" "}
                for investing basics,{" "}
                <a href="https://www.treasurydirect.gov" className="font-semibold underline">
                  TreasuryDirect
                </a>{" "}
                for savings bonds,{" "}
                <a href="https://www.consumerfinance.gov" className="font-semibold underline">
                  consumerfinance.gov
                </a>{" "}
                for household budgeting, and{" "}
                <a href="https://www.usa.gov" className="font-semibold underline">
                  USA.gov
                </a>{" "}
                for every other federal benefit.
              </Callout>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
