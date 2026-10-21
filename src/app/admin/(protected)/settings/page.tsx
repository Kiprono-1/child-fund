import { requireAdminSession } from "@/app/admin/_adminAuth";
import { getSiteContactInfo } from "@/lib/service";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Site Settings — Admin" };

export default async function AdminSettingsPage() {
  await requireAdminSession();
  const settings = await getSiteContactInfo();

  return (
    <div className="p-6">
      <h1 className="font-serif text-2xl font-bold text-gov-navy">Site Settings</h1>
      <p className="mt-1 text-sm text-gov-base">
        Update the public contact information displayed in the site footer and contact page.
      </p>

      <div className="usa-card mt-6 max-w-lg p-6">
        <h2 className="mb-4 font-serif text-lg font-semibold text-gov-navy">
          Contact Information
        </h2>
        <AdminSettingsForm initial={settings} />
      </div>
    </div>
  );
}
