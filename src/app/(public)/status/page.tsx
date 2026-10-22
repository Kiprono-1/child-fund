import type { Metadata } from "next";
import Link from "next/link";
import StatusTracker from "@/components/StatusTracker";
import { Callout, PageHero, SectionHeading, StepList } from "@/components/ui";

export const metadata: Metadata = {
  title: "Track Your Application",
  description:
    "Look up the status of a Trump Account application, see the review pipeline, upload verification documents, review the deposit ledger and make contributions.",
};

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; last?: string }>;
}) {
  const params = await searchParams;

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Track Application" }]}
        eyebrow="Guardian services · Case lookup"
        title="Track your Trump Account application"
        lede={
          <>
            Enter the reference number issued when you registered plus the child&apos;s last name.
            You can follow every review step, upload verification documents and see each deposit as
            it is wired to the account.
          </>
        }
        aside={
          <div className="usa-card p-5">
            <h2 className="m-0 font-serif text-base font-bold text-gov-navy">Lost your reference number?</h2>
            <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
              It was shown on your confirmation screen and emailed to the address on the
              application. If you cannot find it, call{" "}
              <a href="tel:18445554823" className="font-bold text-gov-primary hover:underline">
                1-844-555-4TA
              </a>{" "}
              with your photo ID and the child&apos;s date of birth.
            </p>
          </div>
        }
      />

      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <StatusTracker initialRef={params.ref ?? ""} initialLast={params.last ?? ""} />
        </div>
      </section>

      <section className="bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Review pipeline"
            title="What each status means"
            lede="Average end-to-end processing time is 11 business days."
          />
          <div className="mt-10">
            <StepList
              steps={[
                {
                  title: "Application filed",
                  body: "We received Form TA-1 and issued your reference number. Nothing else is needed from you yet.",
                },
                {
                  title: "Federal intake review",
                  body: "The Social Security record, your state residency and the custodian routing number are validated.",
                },
                {
                  title: "Identity verification",
                  body: "You complete identity proofing. If documents were requested, upload them from this page.",
                },
                {
                  title: "Account approved",
                  body: "The Fund Board issues the custodial account number in the child's name.",
                },
                {
                  title: "Funds deposited",
                  body: "Federal seed, state match and your first contribution are wired to the account.",
                },
              ]}
            />
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Callout tone="info" title="Typical timing">
              Login.gov and ID.me verification usually clear the same business day. Document upload
              takes 3&ndash;5 business days. In-person verification at a state treasury office is
              completed while you wait.
            </Callout>
            <Callout tone="success" title="Ready to add money?">
              Once the account is approved you can deposit at any time from this page or from{" "}
              <Link href="/deposit" className="font-semibold underline">
                Make a Deposit
              </Link>
              . Your state matches a percentage of every contribution.
            </Callout>
          </div>
        </div>
      </section>
    </>
  );
}
