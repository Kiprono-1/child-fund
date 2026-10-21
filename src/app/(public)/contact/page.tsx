import type { Metadata } from "next";
import Link from "next/link";
import ContactForm from "@/components/ContactForm";
import { Callout, Icon, PageHero, SectionHeading } from "@/components/ui";
import { STATES } from "@/lib/states";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Contact the U.S. Child Trust Fund Administration: Guardian Help Line, written contact form, mailing addresses, state treasury offices, media and accessibility assistance.",
};

const CHANNELS = [
  {
    icon: "phone",
    title: "Guardian Help Line",
    lines: ["1-844-555-4CTF (1-844-555-4823)", "Monday–Friday, 8:00 a.m. – 8:00 p.m. ET", "TTY: dial 711 · Se habla español"],
    href: "tel:18445554823",
    cta: "Call now",
  },
  {
    icon: "mail",
    title: "Mail",
    lines: [
      "U.S. Child Trust Fund Administration",
      "Attn: Guardian Services",
      "1500 Pennsylvania Avenue NW",
      "Washington, DC 20220",
    ],
    cta: "Allow 10 business days for a written reply",
  },
  {
    icon: "document",
    title: "Office of Inspector General",
    lines: ["Report fraud, waste or abuse", "Hotline: 1-800-555-0199", "Available 24 hours, anonymous reporting accepted"],
    href: "tel:18005550199",
    cta: "Report a problem",
  },
];

export default function ContactPage() {
  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
        eyebrow="Help · Guardian Services"
        title="Contact the Child Trust Fund Administration"
        lede={
          <>
            Real people answer every channel. For anything about an existing case, have your CTF
            reference number ready — it makes every conversation faster.
          </>
        }
      />

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:items-start">
            <ContactForm />

            <div className="space-y-4">
              {CHANNELS.map((c) => (
                <div key={c.title} className="usa-card p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-gov-primary">
                      <Icon name={c.icon} className="h-7 w-7" />
                    </span>
                    <div>
                      <h2 className="m-0 font-serif text-lg font-bold text-gov-navy">{c.title}</h2>
                      <ul className="mt-2 mb-0 list-none space-y-0.5 p-0 text-sm text-[#3d4551]">
                        {c.lines.map((l) => (
                          <li key={l}>{l}</li>
                        ))}
                      </ul>
                      {c.href ? (
                        <a href={c.href} className="usa-button usa-button--outline-dark mt-3 !py-2 text-sm">
                          {c.cta}
                        </a>
                      ) : (
                        <p className="mt-3 mb-0 text-xs text-gov-base">{c.cta}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              <Callout tone="warning" title="Never send sensitive numbers by email">
                Do not include your full Social Security number, bank account number, PIN or password
                in a message. Reference numbers and dates of birth are safe.
              </Callout>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="In person"
            title="State treasury offices"
            lede={
              <>
                Every participating jurisdiction has staff who can register a child, verify identity
                and process hardship requests at no charge.{" "}
                <Link href="/verify#offices" className="font-semibold text-gov-primary hover:underline">
                  See verification details
                </Link>
                .
              </>
            }
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {STATES.slice(0, 18).map((s) => (
              <div key={s.code} className="usa-card bg-white p-4">
                <p className="m-0 font-serif text-base font-bold text-gov-navy">{s.name}</p>
                <p className="m-0 mt-0.5 text-xs leading-relaxed text-gov-base">{s.agency}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-gov-base">
            Plus {STATES.length - 18} more jurisdictions.{" "}
            <Link href="/states" className="font-semibold text-gov-primary hover:underline">
              View the full list →
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
