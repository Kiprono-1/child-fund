"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "submitted", label: "Submitted" },
  { value: "under_review", label: "Under Review" },
  { value: "verification_required", label: "Verification Required" },
  { value: "approved", label: "Approved" },
  { value: "funded", label: "Funded" },
  { value: "rejected", label: "Rejected" },
];

export default function ApplicationsFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState(searchParams.get("status") ?? "");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushParams(newStatus: string, newSearch: string) {
    const params = new URLSearchParams();
    if (newStatus) params.set("status", newStatus);
    if (newSearch) params.set("search", newSearch);
    params.set("page", "1");
    router.push(`/admin/applications?${params.toString()}`);
  }

  function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setStatus(val);
    pushParams(val, search);
  }

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      pushParams(status, val);
    }, 300);
  }

  // keep state in sync when navigating back/forward
  useEffect(() => {
    setStatus(searchParams.get("status") ?? "");
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="app-filter-status" className="usa-label mb-1 text-xs">
          Status
        </label>
        <select
          id="app-filter-status"
          className="usa-input py-1.5 text-sm"
          value={status}
          onChange={handleStatusChange}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="app-filter-search" className="usa-label mb-1 text-xs">
          Search
        </label>
        <input
          id="app-filter-search"
          type="search"
          className="usa-input py-1.5 text-sm"
          placeholder="Reference, name…"
          value={search}
          onChange={handleSearchChange}
        />
      </div>
    </div>
  );
}
