"use client";

import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/ui";

export type ChildTab = {
  referenceNumber: string;
  childFirstName: string;
  childLastName: string;
  status: string;
  selected: boolean;
};

export default function DashboardChildSwitcher({ children }: { children: ChildTab[] }) {
  const router = useRouter();

  return (
    <nav aria-label="Switch child" className="mx-auto max-w-7xl px-4 sm:px-6">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gov-primary">
        Your registered children
      </p>
      <div role="tablist" className="flex flex-wrap gap-2">
        {children.map((child) => (
          <button
            key={child.referenceNumber}
            role="tab"
            aria-selected={child.selected}
            type="button"
            onClick={() => router.push(`/dashboard?child=${encodeURIComponent(child.referenceNumber)}`)}
            className={`inline-flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-bold transition-colors ${
              child.selected
                ? "border-gov-primary bg-gov-primary text-white"
                : "border-gov-base-light bg-white text-gov-navy hover:border-gov-primary hover:bg-gov-primary-lightest"
            }`}
          >
            {child.childFirstName} {child.childLastName}
            <StatusBadge status={child.status} />
          </button>
        ))}
      </div>
    </nav>
  );
}
