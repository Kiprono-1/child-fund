import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { Callout, PageHero } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create an account — ChildTrustFund.gov",
  description:
    "Create a guardian account to register a child for the U.S. Child Trust Fund.",
};

export default function SignupPage() {
  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Create an account" }]}
        eyebrow="Guardian access"
        title="Create a guardian account"
        lede="Create an account to register a child for the U.S. Child Trust Fund. After you sign up, you will continue to the six-step application."
      />
      <section className="bg-white py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <AuthForm mode="signup" />
          <div className="mx-auto mt-6 max-w-md">
            <Callout tone="info" title="Demonstration prototype">
              This is an academic prototype. It is not an operating federal service, performs no
              real identity checks, and does not share data with any agency. Do not reuse a real
              password.
            </Callout>
          </div>
        </div>
      </section>
    </>
  );
}
