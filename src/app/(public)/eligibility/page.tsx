import type { Metadata } from "next";
import Link from "next/link";
import Accordion from "@/components/Accordion";
import { Callout, Icon, PageHero, SectionHeading } from "@/components/ui";
import {
  ANNUAL_CONTRIBUTION_LIMIT_CENTS,
  FEDERAL_SEED_CENTS,
  FEDERAL_SUPPLEMENT_CENTS,
  formatUSD,
} from "@/lib/program";

export const metadata: Metadata = {
  title: "Eligibility & Benefits",
  description:
    "Who qualifies for the U.S. Trump Account, the automatic enrollment cohort born 2025–2028, the guardian-funded cohort, benefit amounts and special situations.",
};

const QUALIFIES = [
  "The child is a U.S. citizen with a valid Social Security number.",
  "The child is under 18 years old on the date the application is filed.",
  "The child has a legal residence in one of the 56 participating jurisdictions.",
  "The applicant is the child's parent or a court-appointed legal guardian.",
  "The applicant passes federal identity proofing.",
  "The custodian bank is an FDIC or NCUA insured institution certified by the Fund Board.",
];

const DOES_NOT = [
  ["No Social Security number yet", "Apply for an SSN at any SSA office; it usually takes 2 weeks. Register the child as soon as the number is issued — the federal seed is still available for the 2025–2028 cohort."],
  ["Child is 18 or older", "The registration window closes on the 18th birthday. An existing account continues and the holder takes control."],
  ["Applicant is not a parent or guardian", "Only a parent or court-appointed guardian may open the account. Grandparents and relatives may contribute to an existing account."],
  ["Child lives outside the United States", "Children of U.S. citizens born abroad with a Consular Report of Birth Abroad are eligible; register through the overseas desk at 1-844-555-4823."],
  ["Custodian bank is not certified", "Choose another institution from the certified list, or ask the state office to open a default account at the Federal Custodian Bank."],
];

const SPECIAL = [
  { title: "Military families", body: "Deployed and overseas-stationed families may verify identity remotely and use a stateside address of record. The state match follows the home of record." },
  { title: "Children in foster care", body: "The state agency of custody files as guardian. Accounts are flagged so that funds follow the child across placements and are never used for care costs." },
  { title: "Tribal members", body: "Federally recognized tribal nations may co-administer enrollment. Children residing on tribal land receive their state match plus any tribal supplement." },
  { title: "Adopted children", body: "Final adoption decrees establish guardianship. Children born in the automatic cohort keep their federal seed even if the adoption is finalized later." },
  { title: "Multiple births", body: "Twins and triplets each receive their own account and their own full federal seed deposit. There is no per-family cap." },
  { title: "Late registration", body: "Registering after the birth year is allowed. The federal seed is paid with retroactive earnings from the child's date of birth." },
];

const FAQS = [
  { q: "Is there an income limit for the family?", a: "No. Every eligible child receives the federal seed deposit regardless of household income. Households below 200% of the federal poverty line receive an additional Supplemental Child Endowment of $250, credited automatically after the annual IRS data match — you do not need to apply for it.", tag: "Income" },
  { q: "Can a family register more than one child?", a: "Yes. Each child needs a separate Form TA-1 and receives a separate reference number, account and deposit. There is no per-family limit.", tag: "Families" },
  { q: "What if the parents are separated or divorced?", a: "The custodial parent named in the court order registers the child. The non-custodial parent may contribute to the account at any time and receives a contribution statement, but cannot withdraw.", tag: "Custody" },
  { q: "Does the account affect financial aid?", a: "Child trust accounts are treated as a student asset for federal aid purposes. Because the account is custodial, the impact is generally smaller than a parent-owned 529 plan in the same amount. Check with your state's aid office.", tag: "Financial aid" },
  { q: "Can the money be used before age 18?", a: "Only in a documented hardship — medical emergency, eviction or foreclosure prevention, or a funeral expense for an immediate family member. The state treasury office must approve the request.", tag: "Withdrawals" },
  { q: "What happens if we move to another state?", a: "The account moves with the child. Report the new address within 30 days. The new state's contribution match applies from the move date; the opening match already received is never reclaimed.", tag: "Moving" },
  { q: "Are deposits insured?", a: "TA Savings Accounts are FDIC-insured to $250,000 per depositor per insured bank. TA Growth Portfolios are invested in securities and are not FDIC-insured, though they may lose value. TA Treasury Ladders are backed by the full faith and credit of the United States.", tag: "Insurance" },
  { q: "Does registering cost anything?", a: "No. Registration, verification, deposits and account maintenance are free forever. Certified custodians are prohibited from charging fees on a child trust account.", tag: "Cost" },
];

export default function EligibilityPage() {
  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Eligibility & Benefits" }]}
        eyebrow="Eligibility · Benefits"
        title="Who qualifies, and what they receive"
        lede={
          <>
            Any U.S. citizen child under 18 with a valid Social Security number can hold a Child
            Trust Fund account. Children born {`2025–2028`} are enrolled automatically and receive
            the federal seed deposit; older children are registered and funded by a parent or
            guardian.
          </>
        }
        actions={
          <>
            <Link href="/apply" className="usa-button usa-button--primary">
              Register a child
            </Link>
            <Link href="/states" className="usa-button usa-button--outline-dark">
              See your state match
            </Link>
          </>
        }
      />

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            <div>
              <SectionHeading kicker="Requirements" title="The child qualifies if…" />
              <ul className="mt-6 list-none space-y-3 p-0">
                {QUALIFIES.map((q) => (
                  <li key={q} className="usa-card flex items-start gap-3 p-4">
                    <span className="mt-0.5 shrink-0 text-gov-green-dark">
                      <Icon name="check" className="h-5 w-5" />
                    </span>
                    <span className="text-sm leading-relaxed text-[#3d4551]">{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <SectionHeading kicker="Benefit amounts" title="What each cohort receives" />
              <div className="mt-6 overflow-hidden rounded border border-gov-base-light">
                <table className="usa-table">
                  <thead>
                    <tr>
                      <th scope="col">Benefit</th>
                      <th scope="col" className="text-right">Born 2025–2028</th>
                      <th scope="col" className="text-right">Born before 2025</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Federal seed deposit</td>
                      <td className="text-right font-bold text-gov-green-dark">{formatUSD(FEDERAL_SEED_CENTS)}</td>
                      <td className="text-right text-gov-base">—</td>
                    </tr>
                    <tr>
                      <td>State opening match</td>
                      <td className="text-right font-bold">$200 – $550</td>
                      <td className="text-right text-gov-base">—</td>
                    </tr>
                    <tr>
                      <td>Federal birthday supplement</td>
                      <td className="text-right font-bold">{formatUSD(FEDERAL_SUPPLEMENT_CENTS)} / yr to age 6</td>
                      <td className="text-right text-gov-base">—</td>
                    </tr>
                    <tr>
                      <td>State match on guardian deposits</td>
                      <td className="text-right font-bold">15% – 55%</td>
                      <td className="text-right font-bold">15% – 55%</td>
                    </tr>
                    <tr>
                      <td>Annual contribution limit</td>
                      <td className="text-right">{formatUSD(ANNUAL_CONTRIBUTION_LIMIT_CENTS, false)}</td>
                      <td className="text-right">{formatUSD(ANNUAL_CONTRIBUTION_LIMIT_CENTS, false)}</td>
                    </tr>
                    <tr>
                      <td>Supplemental Child Endowment (&lt;200% FPL)</td>
                      <td className="text-right">$250</td>
                      <td className="text-right">$250</td>
                    </tr>
                    <tr>
                      <td>Registration fee</td>
                      <td className="text-right font-bold text-gov-green-dark">Free</td>
                      <td className="text-right font-bold text-gov-green-dark">Free</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-6">
                <Callout tone="success" title="Late registration is still registration">
                  A child born in 2025 who is registered in 2028 receives the full federal seed plus
                  retroactive earnings. Do not assume the window has closed.
                </Callout>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Common blockers"
            title="If you do not qualify yet"
            lede="Almost every ineligibility finding can be corrected. Here is what to do."
          />
          <div className="mt-8 overflow-hidden rounded border border-gov-base-light bg-white">
            <table className="usa-table">
              <thead>
                <tr>
                  <th scope="col">Reason</th>
                  <th scope="col">What to do</th>
                </tr>
              </thead>
              <tbody>
                {DOES_NOT.map(([reason, fix]) => (
                  <tr key={reason}>
                    <td className="font-bold text-gov-navy">{reason}</td>
                    <td className="text-sm text-[#3d4551]">{fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-[#3d4551]">
            Disagree with a decision? File Form TA-9 (Request for Reconsideration) within 60 days
            through the{" "}
            <Link href="/contact" className="font-semibold text-gov-primary hover:underline">
              Guardian Help Desk
            </Link>
            . A different specialist reviews the case, and you may add new evidence.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading kicker="Special situations" title="Families in every circumstance" />
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SPECIAL.map((s) => (
              <div key={s.title} className="usa-card p-5">
                <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">{s.title}</h3>
                <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">{s.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-start">
            <SectionHeading
              kicker="Eligibility FAQ"
              title="Detailed answers"
              lede={
                <>
                  Still unsure? Call{" "}
                  <a href="tel:18445554823" className="font-semibold text-gov-primary hover:underline">
                    1-844-555-4TA
                  </a>
                  .
                </>
              }
            />
            <Accordion items={FAQS} defaultOpen={0} />
          </div>

          <div className="mt-12 rounded border-2 border-gov-primary bg-gov-primary-lightest p-6 text-center">
            <h2 className="m-0 font-serif text-2xl font-bold text-gov-navy">
              Ready to open the account?
            </h2>
            <p className="mx-auto mt-2 mb-5 max-w-2xl text-sm leading-relaxed text-[#3d4551]">
              Registration takes about ten minutes and costs nothing. You will receive a reference
              number immediately, and you can follow the case at every stage.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/apply" className="usa-button usa-button--primary">
                Register a child
              </Link>
              <Link href="/status" className="usa-button usa-button--outline-dark">
                Track an application
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
