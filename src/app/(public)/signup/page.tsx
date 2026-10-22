import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { PageHero } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Create an account — Trump.Account.gov",
  description:
    "Create a guardian account to register a child for the U.S. Trump Account.",
};

export default function SignupPage() {
  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Create an account" }]}
        eyebrow="Guardian access"
        title="Create a guardian account"
        lede="Create an account to register a child for the U.S. Trump Account. After you sign up, you will continue to the six-step application."
      />
      <section className="bg-white py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <AuthForm mode="signup" />
        </div>
      </section>
    </>
  );
}
