import { getAdminSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminLoginForm from "@/components/AdminLoginForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin Login" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const isAdmin = await getAdminSession();
  if (isAdmin) redirect("/admin");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gov-base-lighter px-4">
      <div className="usa-card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-gov-primary">
            ChildTrustFund.gov
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold text-gov-navy">
            Admin Portal
          </h1>
          <p className="mt-1 text-sm text-gov-base">Authorized personnel only</p>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded border border-gov-red bg-red-50 px-4 py-3 text-sm text-gov-red"
          >
            Invalid email or password. Please try again.
          </div>
        )}

        <AdminLoginForm />
      </div>
    </div>
  );
}
