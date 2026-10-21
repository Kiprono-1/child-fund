import { requireAdminSession } from "@/app/admin/_adminAuth";
import { adminGetNewsletterSignups } from "@/lib/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Newsletter Signups — Admin" };

export default async function AdminNewsletterPage() {
  await requireAdminSession();

  const rows = await adminGetNewsletterSignups();

  return (
    <div className="p-6">
      <h1 className="font-serif text-2xl font-bold text-gov-navy">Newsletter Signups</h1>
      <p className="mt-1 text-sm text-gov-base">
        {rows.length.toLocaleString()} subscriber{rows.length !== 1 ? "s" : ""}
      </p>

      <div className="usa-card mt-6 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="py-4 text-sm text-gov-base">No newsletter signups yet.</p>
        ) : (
          <table className="usa-table w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Email</th>
                <th>State</th>
                <th>Signed Up</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id}>
                  <td className="text-sm text-gov-base">{i + 1}</td>
                  <td>
                    <a
                      href={`mailto:${row.email}`}
                      className="text-sm text-gov-primary hover:underline"
                    >
                      {row.email}
                    </a>
                  </td>
                  <td className="text-sm">{row.state ?? "—"}</td>
                  <td className="whitespace-nowrap text-sm text-gov-base">
                    {new Date(row.createdAt).toLocaleDateString("en-US")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
