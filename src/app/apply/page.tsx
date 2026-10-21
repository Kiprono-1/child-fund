import type { Metadata } from "next";
import Link from "next/link";
import RegistrationWizard from "@/components/RegistrationWizard";
import { Callout, Icon, PageHero, SectionHeading } from "@/components/ui";
import { redirect } from "next/navigation";
import { getSessionGuardian } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Register a Child",
  description:
    "File a Child Trust Fund application for your child. Six steps: guardian details, state of residence, child birth details, trust account, identity verification and certification.",
};

export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const guardian = await getSessionGuardian();
  if (!guardian) redirect("/login");

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Register a Child" }]}
        eyebrow="Guardian services · Form CTF-1"
        title="Register a child for the U.S. Child Trust Fund"
        lede={
          <>
            One application opens a custodial trust account for one child. Children born
            2025&ndash;2028 receive the automatic $1,000.00 federal seed deposit; children born
            earlier can be registered and funded by a parent or guardian with the same state match.
          </>
        }
        aside={
          <div className="usa-card p-5">
            <h2 className="m-0 font-serif text-base font-bold text-gov-navy">Before you begin</h2>
            <div className="gov-rule mt-2" />
            <ul className="mt-3 mb-0 list-none space-y-2 p-0 text-sm text-[#3d4551]">
              {[
                "Child's certified birth certificate details",
                "Child's Social Security number (last 4 only here)",
                "Your government photo ID",
                "Your state of legal residence",
                "Custodian bank routing + account numbers",
                "About 10 minutes, no fee",
              ].map((i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 text-gov-green-dark">
                    <Icon name="check" className="h-4 w-4" />
                  </span>
                  {i}
                </li>
              ))}
            </ul>
            <p className="mt-4 mb-0 border-t border-gov-base-light pt-3 text-xs text-gov-base">
              Your draft is saved in this browser. You can leave and come back.
            </p>
          </div>
        }
      />

      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          {/* Pre-auth linkage notice: guardian has an account but was redirected here because no
              applications are linked yet. This happens when an application was submitted before
              the guardian created their account. They can still track that application by reference. */}
          <Callout tone="info" title="Previously submitted an application?">
            If you filed Form CTF-1 before creating this account, that application will not appear
            in your dashboard automatically. Use the{" "}
            <Link href="/status" className="font-semibold underline">
              application tracker
            </Link>{" "}
            with your reference number and the child&apos;s last name to check its status.
            Contact the{" "}
            <Link href="/contact" className="font-semibold underline">
              Guardian Help Desk
            </Link>{" "}
            to link it to this account.
          </Callout>
          <div className="mt-10">
            <RegistrationWizard />
          </div>
        </div>
      </section>

      <section className="bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Help with your application"
            title="Three ways to get assistance"
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="usa-card p-5">
              <span className="text-gov-primary">
                <Icon name="phone" className="h-8 w-8" />
              </span>
              <h3 className="mt-3 mb-1 font-serif text-lg font-bold text-gov-navy">Call the Help Line</h3>
              <p className="m-0 text-sm leading-relaxed text-[#3d4551]">
                <a href="tel:18445554823" className="font-bold text-gov-primary hover:underline">
                  1-844-555-4CTF
                </a>
                <br />
                Monday&ndash;Friday, 8:00 a.m. &ndash; 8:00 p.m. ET. TTY: dial 711.
              </p>
            </div>
            <div className="usa-card p-5">
              <span className="text-gov-primary">
                <Icon name="pin" className="h-8 w-8" />
              </span>
              <h3 className="mt-3 mb-1 font-serif text-lg font-bold text-gov-navy">Visit a state office</h3>
              <p className="m-0 text-sm leading-relaxed text-[#3d4551]">
                Every state treasury office can file the application with you and verify identity in
                person.{" "}
                <Link href="/verify#offices" className="font-bold text-gov-primary hover:underline">
                  Find your office
                </Link>
                .
              </p>
            </div>
            <div className="usa-card p-5">
              <span className="text-gov-primary">
                <Icon name="mail" className="h-8 w-8" />
              </span>
              <h3 className="mt-3 mb-1 font-serif text-lg font-bold text-gov-navy">Send a message</h3>
              <p className="m-0 text-sm leading-relaxed text-[#3d4551]">
                Written questions are answered within 2 business days.{" "}
                <Link href="/contact" className="font-bold text-gov-primary hover:underline">
                  Contact the Guardian Help Desk
                </Link>
                .
              </p>
            </div>
          </div>

          <div className="mt-8">
            <Callout tone="warning" title="Never pay a fee to register">
              Filing Form CTF-1 is free. Anyone charging to &ldquo;expedite&rdquo; a Child Trust
              Fund application, or asking for a gift card or your bank password, is committing
              fraud. Report it through the{" "}
              <Link href="/contact" className="font-semibold underline">
                contact form
              </Link>{" "}
              or to the Office of Inspector General hotline at 1-800-555-0199.
            </Callout>
          </div>
        </div>
      </section>
    </>
  );
}
