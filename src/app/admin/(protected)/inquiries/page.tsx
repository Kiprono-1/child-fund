import { requireAdminSession } from "@/app/admin/_adminAuth";
import { adminGetAllInquiries } from "@/lib/service";
import AdminInquiriesTable from "@/components/admin/AdminInquiriesTable";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inquiries — Admin" };

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ handled?: string }>;
}) {
  await requireAdminSession();

  const sp = await searchParams;
  const handledParam = sp.handled;
  const handled =
    handledParam === "true" ? true : handledParam === "false" ? false : false;

  const rawRows = await adminGetAllInquiries({ handled });

  // Serialize dates for the client component
  const rows = rawRows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="p-6">
      <h1 className="font-serif text-2xl font-bold text-gov-navy">Inquiries</h1>
      <p className="mt-1 text-sm text-gov-base">{rows.length} inquiry(ies)</p>

      {/* Filter tabs */}
      <div className="mt-4 flex gap-2">
        <Link
          href="/admin/inquiries"
          className={`rounded px-3 py-1.5 text-sm font-medium ${!sp.handled || sp.handled === "false" ? "bg-gov-primary text-white" : "bg-white text-gov-primary border border-gov-primary"}`}
        >
          Unhandled
        </Link>
        <Link
          href="/admin/inquiries?handled=true"
          className={`rounded px-3 py-1.5 text-sm font-medium ${sp.handled === "true" ? "bg-gov-primary text-white" : "bg-white text-gov-primary border border-gov-primary"}`}
        >
          Handled
        </Link>
      </div>

      <div className="usa-card mt-4">
        <AdminInquiriesTable rows={rows} />
      </div>
    </div>
  );
}
