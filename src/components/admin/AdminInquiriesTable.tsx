"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InquiryRow = {
  id: number;
  topic: string;
  fullName: string;
  email: string;
  phone: string | null;
  state: string | null;
  referenceNumber: string | null;
  message: string;
  handled: boolean;
  createdAt: string; // ISO string
};

type Props = { rows: InquiryRow[] };

export default function AdminInquiriesTable({ rows }: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [handlingId, setHandlingId] = useState<number | null>(null);

  async function markHandled(id: number) {
    setHandlingId(id);
    try {
      await fetch(`/api/admin/inquiries/${id}/handle`, { method: "POST" });
      router.refresh();
    } finally {
      setHandlingId(null);
    }
  }

  if (rows.length === 0) {
    return <p className="py-4 text-sm text-gov-base">No inquiries match this filter.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="usa-table w-full">
        <thead>
          <tr>
            <th>Submitted</th>
            <th>Topic</th>
            <th>Name</th>
            <th>Email</th>
            <th>State</th>
            <th>Reference</th>
            <th>Handled</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <>
              <tr
                key={row.id}
                className="cursor-pointer hover:bg-gov-base-lighter"
                onClick={() => setExpandedId(expandedId === row.id ? null : row.id)}
              >
                <td className="whitespace-nowrap text-sm">
                  {new Date(row.createdAt).toLocaleDateString("en-US")}
                </td>
                <td className="text-sm capitalize">{row.topic}</td>
                <td className="text-sm">{row.fullName}</td>
                <td className="text-sm">
                  <a
                    href={`mailto:${row.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-gov-primary hover:underline"
                  >
                    {row.email}
                  </a>
                </td>
                <td className="text-sm">{row.state ?? "—"}</td>
                <td className="font-mono text-sm">{row.referenceNumber ?? "—"}</td>
                <td>
                  {row.handled ? (
                    <span className="usa-tag bg-gov-base-light text-xs text-gov-ink">Handled</span>
                  ) : (
                    <span className="usa-tag bg-gov-accent text-xs text-gov-navy-deep">Open</span>
                  )}
                </td>
                <td>
                  {!row.handled && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void markHandled(row.id); }}
                      disabled={handlingId === row.id}
                      className="text-xs text-gov-primary hover:underline disabled:opacity-50"
                    >
                      {handlingId === row.id ? "Marking…" : "Mark handled"}
                    </button>
                  )}
                </td>
              </tr>
              {expandedId === row.id && (
                <tr key={`${row.id}-expanded`}>
                  <td colSpan={8} className="bg-gov-base-lighter px-4 py-3">
                    <p className="text-sm font-semibold text-gov-navy">Full message:</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gov-ink">{row.message}</p>
                    {row.phone && (
                      <p className="mt-2 text-xs text-gov-base">Phone: {row.phone}</p>
                    )}
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
