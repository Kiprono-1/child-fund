import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
import { PageHero } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sign in — ChildTrustFund.gov",
  description: "Sign in to your guardian account to continue a Child Trust Fund application.",
};

export default function LoginPage() {
  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Sign in" }]}
        eyebrow="Guardian access"
        title="Sign in to your guardian account"
        lede="Welcome back. Sign in to continue your Child Trust Fund application."
      />
      <section className="bg-white py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <AuthForm mode="login" />
        </div>
      </section>
    </>
  );
}
