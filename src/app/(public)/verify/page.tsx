import type { Metadata } from "next";
import Link from "next/link";
import { Callout, Icon, PageHero, SectionHeading, StepList } from "@/components/ui";
import { DOCUMENT_TYPES, VERIFICATION_METHODS } from "@/lib/program";
import { STATES } from "@/lib/states";
import { getSessionGuardian } from "@/lib/auth";
import { getApplicationsByGuardianId } from "@/lib/service";

export const metadata: Metadata = {
  title: "Verify Your Identity",
  description:
    "Complete identity verification for your Trump Account application by uploading documents or visiting a state treasury office in person.",
};

export const dynamic = "force-dynamic";

const METHOD_DETAIL: Record<string, { time: string; need: string[]; steps: string[] }> = {
  login_gov: {
    time: "Same business day",
    need: ["An existing Login.gov account at identity-verified level", "Your state-issued photo ID on file with Login.gov"],
    steps: [
      "Select Login.gov on Step 5 of the registration form.",
      "You are redirected to Login.gov to complete a one-time proofing check.",
      "Login.gov returns a verified assertion to the Fund Administration; no credential data is stored here.",
    ],
  },
  id_me: {
    time: "Usually within 2 hours",
    need: ["A smartphone or webcam", "Driver's license, state ID, or U.S. passport"],
    steps: [
      "Select ID.me and create or sign in to your account.",
      "Photograph the front and back of your ID and record a short video selfie.",
      "ID.me returns a pass/fail result. If it fails twice, use document upload or an office visit.",
    ],
  },
  document_upload: {
    time: "3–5 business days",
    need: [
      "Government photo ID (JPG, PNG or PDF, under 10 MB)",
      "Child's certified birth certificate",
      "Court-appointed guardianship order, if you are not the birth parent",
    ],
    steps: [
      "Choose Document upload on Step 5, then attach your files.",
      "You can also upload later from the application tracker.",
      "A specialist reviews the images and either approves the case or requests a clearer copy.",
    ],
  },
  in_person: {
    time: "Completed while you wait",
    need: ["Original photo ID", "Child's original certified birth certificate"],
    steps: [
      "Visit any participating state treasury office during business hours.",
      "A specialist inspects the originals and records the verification in the national register.",
      "Your account is usually funded the next business day.",
    ],
  },
};

export default async function VerifyPage() {
  // Show a reference banner for logged-in guardians
  const guardian = await getSessionGuardian();
  let refBanner: { reference: string } | null = null;
  if (guardian) {
    const apps = await getApplicationsByGuardianId(guardian.guardianId);
    if (apps.length > 0 && apps[0]) {
      refBanner = { reference: apps[0].referenceNumber };
    }
  }

  return (
    <>
      {refBanner && (
        <div className="border-b border-gov-green bg-[#f0f9ec] px-4 py-3 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <Callout tone="success" title="Your application reference">
              Your reference number is{" "}
              <strong className="font-mono">{refBanner.reference}</strong>. After you verify,
              you can track progress on your dashboard.{" "}
              <Link href="/dashboard" className="font-bold text-gov-green-dark underline">
                Go to my dashboard →
              </Link>
            </Callout>
          </div>
        </div>
      )}
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Verify Identity" }]}
        eyebrow="Guardian services · Identity proofing"
        title="Verify your identity to open the child's account"
        lede={
          <>
            Federal law (31 C.F.R. § 210) requires the Trump Account Administration to verify the
            identity of every adult who opens a custodial account for a minor. Choose document
            upload or visit a participating state treasury office in person — both are free.
          </>
        }
        actions={
          <>
            <Link href="/status" className="usa-button usa-button--primary">
              Upload documents now
            </Link>
            <Link href="/apply" className="usa-button usa-button--outline-dark">
              Start a new registration
            </Link>
          </>
        }
      />

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading kicker="Two ways to verify" title="Choose your verification method" />
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {VERIFICATION_METHODS.filter((m) =>
              m.id === "document_upload" || m.id === "in_person"
            ).map((m) => {
              const d = METHOD_DETAIL[m.id];
              return (
                <article key={m.id} className="usa-card flex h-full flex-col p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="m-0 font-serif text-xl font-bold text-gov-navy">{m.label}</h2>
                    <span className="usa-tag shrink-0 bg-gov-primary-lighter text-gov-primary-darker">
                      {d.time}
                    </span>
                  </div>
                  <p className="mt-2 mb-4 text-sm leading-relaxed text-[#3d4551]">{m.detail}</p>

                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-gov-primary">
                    What you need
                  </h3>
                  <ul className="mt-2 mb-4 list-disc space-y-1 pl-5 text-sm text-[#3d4551]">
                    {d.need.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>

                  <h3 className="m-0 text-xs font-bold uppercase tracking-wider text-gov-primary">
                    How it works
                  </h3>
                  <ol className="mt-2 mb-0 list-decimal space-y-1 pl-5 text-sm text-[#3d4551]">
                    {d.steps.map((s) => (
                      <li key={s}>{s}</li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>

          <div className="mt-10">
            <Callout tone="warning" title="We will never ask for these">
              Your full Social Security number by email or text, bank login credentials, a payment
              to &ldquo;release&rdquo; the federal deposit, gift cards, or cryptocurrency. Any such
              request is fraud — report it to the Office of Inspector General at 1-800-555-0199.
            </Callout>
          </div>
        </div>
      </section>

      <section className="bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <SectionHeading
                kicker="Checklist"
                title="Documents accepted for verification"
                lede="Send clear, uncropped color images. Files must be JPG, PNG or PDF and under 10 MB."
              />
              <ul className="mt-6 list-none space-y-3 p-0">
                {DOCUMENT_TYPES.map((d) => (
                  <li key={d} className="usa-card flex items-start gap-3 p-4">
                    <span className="mt-0.5 text-gov-primary">
                      <Icon name="document" className="h-6 w-6" />
                    </span>
                    <span>
                      <span className="block text-sm font-bold text-gov-navy">{d}</span>
                      <span className="mt-0.5 block text-xs text-gov-base">
                        {d.includes("birth certificate") || d.includes("Social Security")
                          ? "Certified copy required — hospital souvenir copies are not accepted."
                          : "Must be unexpired and show your current address where applicable."}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <SectionHeading kicker="Timing" title="What happens after you verify" />
              <div className="mt-8">
                <StepList
                  steps={[
                    { title: "Automated checks", body: "Name, date of birth and SSN record are matched against federal databases within minutes." },
                    { title: "Specialist review", body: "A human specialist reviews anything the automated check could not resolve, within 1 business day." },
                    { title: "Account issuance", body: "The Fund Board issues the custodial account number in the child's name." },
                    { title: "Deposit wiring", body: "Federal seed within 10 business days, state match within 5 days after that." },
                  ]}
                />
              </div>

              <div className="mt-8 space-y-4">
                <Callout tone="error" title="If verification fails">
                  You will receive a plain-language notice explaining why, and you may try again
                  twice. After that, visit a state treasury office in person or file an appeal with
                  the Fund Board within 60 days.
                </Callout>
                <Callout tone="info" title="Non-parent guardians">
                  Foster parents, grandparents and other court-appointed guardians must upload the
                  guardianship order in addition to a photo ID. Kinship caregivers can also call the
                  Help Line for a paper Form TA-1.
                </Callout>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="offices" className="scroll-mt-32 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="In-person help"
            title="State treasury offices that verify identity"
            lede="No appointment is needed at any participating office. Bring originals."
          />
          <div className="mt-8 overflow-x-auto rounded border border-gov-base-light">
            <table className="usa-table">
              <thead>
                <tr>
                  <th scope="col">State / territory</th>
                  <th scope="col">Co-administering office</th>
                  <th scope="col" className="text-right">Opening match</th>
                  <th scope="col" className="text-right">Match on deposits</th>
                </tr>
              </thead>
              <tbody>
                {STATES.map((s) => (
                  <tr key={s.code}>
                    <td className="font-bold text-gov-navy">{s.name}</td>
                    <td className="text-sm">{s.agency}</td>
                    <td className="text-right tabular-nums">${(s.stateMatchCents / 100).toFixed(2)}</td>
                    <td className="text-right tabular-nums">{s.contributionMatchPct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
