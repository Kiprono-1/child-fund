import type { Metadata } from "next";
import Link from "next/link";
import FaqExplorer from "@/components/FaqExplorer";
import { Callout, PageHero, SectionHeading } from "@/components/ui";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "Answers to 30 common questions about the U.S. Trump Account: eligibility, registration, identity verification, deposits, state matches and fraud prevention.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
        eyebrow="Help · Answers"
        title="Frequently asked questions"
        lede={
          <>
            Everything guardians ask the Help Line, in plain language. Use the search box or filter by
            category. If your question is not here, call{" "}
            <a href="tel:18445554823" className="font-semibold text-gov-primary hover:underline">
              1-844-555-4TA
            </a>{" "}
            or{" "}
            <Link href="/contact" className="font-semibold text-gov-primary hover:underline">
              send us a message
            </Link>
            .
          </>
        }
      />

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1.7fr_1fr] lg:items-start">
            <FaqExplorer />

            <aside className="space-y-4 lg:sticky lg:top-32">
              <div className="usa-card bg-gov-primary-lightest p-5">
                <h2 className="m-0 font-serif text-lg font-bold text-gov-navy">Fast answers</h2>
                <ul className="mt-3 mb-0 list-none space-y-2 p-0 text-sm">
                  {[
                    { l: "Register a child", h: "/apply" },
                    { l: "Track an application", h: "/status" },
                    { l: "Verify identity", h: "/verify" },
                    { l: "Make a deposit", h: "/deposit" },
                    { l: "State match rates", h: "/states" },
                    { l: "Eligibility rules", h: "/eligibility" },
                  ].map((x) => (
                    <li key={x.l}>
                      <Link href={x.h} className="font-bold text-gov-primary hover:underline">
                        {x.l} →
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="usa-card p-5">
                <h2 className="m-0 font-serif text-lg font-bold text-gov-navy">Talk to a person</h2>
                <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                  <strong className="text-gov-navy">Guardian Help Line</strong>
                  <br />
                  <a href="tel:18445554823" className="font-bold text-gov-primary hover:underline">
                    1-844-555-4TA (1-844-555-4823)
                  </a>
                  <br />
                  Monday–Friday, 8:00 a.m. – 8:00 p.m. ET
                  <br />
                  TTY: dial 711 · Se habla español
                </p>
                <Link href="/contact" className="usa-button usa-button--outline-dark mt-4 !py-2 text-sm">
                  Written contact form
                </Link>
              </div>

              <Callout tone="error" title="Report fraud">
                The program never charges a fee or asks for gift cards, bank passwords or your full
                SSN. Office of Inspector General hotline:{" "}
                <a href="tel:18005550199" className="font-semibold underline">
                  1-800-555-0199
                </a>
                .
              </Callout>
            </aside>
          </div>
        </div>
      </section>

      <section className="bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Still stuck?"
            title="Three ways to resolve a problem"
          />
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <div className="usa-card p-5">
              <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">1. Call the Help Line</h3>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                Specialists can see your case in the national register and fix most address, bank and
                document problems during the call.
              </p>
            </div>
            <div className="usa-card p-5">
              <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">2. Visit a state office</h3>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                Every participating state treasury office handles registrations, verification and
                hardship requests in person, free of charge.{" "}
                <Link href="/verify#offices" className="font-semibold text-gov-primary hover:underline">
                  Find yours
                </Link>
                .
              </p>
            </div>
            <div className="usa-card p-5">
              <h3 className="m-0 font-serif text-lg font-bold text-gov-navy">3. Request reconsideration</h3>
              <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
                If a decision was wrong, file Form TA-9 within 60 days. A different specialist
                reviews the case and you may add new evidence.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
