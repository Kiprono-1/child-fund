import type { Metadata } from "next";
import Link from "next/link";
import DepositForm from "@/components/DepositForm";
import { Callout, PageHero, SectionHeading } from "@/components/ui";
import { ANNUAL_CONTRIBUTION_LIMIT_CENTS, formatUSD } from "@/lib/program";

export const metadata: Metadata = {
  title: "Make a Deposit",
  description:
    "Add money to a child's U.S. Child Trust Fund account. One-time or monthly guardian contributions with a state match on every deposit.",
};

export default async function DepositPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Make a Deposit" }]}
        eyebrow="Guardian services · Contributions"
        title="Deposit money into your child's trust account"
        lede={
          <>
            Guardian contributions are accepted for every registered child, including those born
            before the automatic-enrollment window. Each deposit is matched by your state treasury
            up to {formatUSD(ANNUAL_CONTRIBUTION_LIMIT_CENTS, false)} per program year.
          </>
        }
        aside={
          <div className="usa-card p-5">
            <h2 className="m-0 font-serif text-base font-bold text-gov-navy">Contribution rules</h2>
            <div className="gov-rule mt-2" />
            <ul className="mt-3 mb-0 list-disc space-y-1.5 pl-5 text-sm text-[#3d4551]">
              <li>Annual limit: {formatUSD(ANNUAL_CONTRIBUTION_LIMIT_CENTS, false)} per child.</li>
              <li>Minimum single deposit: $1.00.</li>
              <li>State match is credited within 5 business days.</li>
              <li>Withdrawals are locked until the child turns 18.</li>
            </ul>
          </div>
        }
      />

      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <DepositForm initialRef={params.ref ?? ""} />
        </div>
      </section>

      <section className="bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Good to know"
            title="How guardian contributions are treated"
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="usa-card p-5">
              <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">Not taxable income</h3>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                Contributions are made with after-tax dollars and are never taxed again. Earnings
                inside the account are tax-deferred until the child withdraws after age 18.
              </p>
            </div>
            <div className="usa-card p-5">
              <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">No effect on benefits</h3>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                A child trust account is excluded from the asset tests used by Medicaid, SNAP and
                Supplemental Security Income, up to the statutory cap.
              </p>
            </div>
            <div className="usa-card p-5">
              <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">Anyone can give</h3>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                Grandparents, relatives and friends can contribute with the reference number. Gifts
                count toward the child&apos;s annual limit.{" "}
                <Link href="/faq" className="font-semibold text-gov-primary hover:underline">
                  Read the gifting rules
                </Link>
                .
              </p>
            </div>
          </div>
          <div className="mt-8">
            <Callout tone="info" title="Automatic cohort families can contribute too">
              The $1,000 federal seed deposit does not replace your own savings. Families in the
              automatic cohort can add up to {formatUSD(ANNUAL_CONTRIBUTION_LIMIT_CENTS, false)} per
              year and still receive their state match on every dollar.
            </Callout>
          </div>
        </div>
      </section>
    </>
  );
}
