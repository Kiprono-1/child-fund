"use client";

import { useId, useState } from "react";

export type AccordionItem = { q: string; a: React.ReactNode; tag?: string };

export default function Accordion({
  items,
  defaultOpen = 0,
}: {
  items: AccordionItem[];
  defaultOpen?: number | null;
}) {
  const [open, setOpen] = useState<number | null>(defaultOpen ?? null);
  const base = useId();

  return (
    <div className="divide-y divide-gov-base-light border-y border-gov-base-light">
      {items.map((item, i) => {
        const expanded = open === i;
        const headingId = `${base}-h-${i}`;
        const panelId = `${base}-p-${i}`;
        return (
          <div key={item.q}>
            <h3 className="m-0">
              <button
                type="button"
                id={headingId}
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => setOpen(expanded ? null : i)}
                className={`flex w-full items-start gap-3 px-1 py-4 text-left transition-colors hover:bg-gov-primary-lightest ${
                  expanded ? "bg-gov-primary-lightest" : ""
                }`}
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-gov-primary text-gov-primary">
                  <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                    <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.6" />
                    {expanded && <rect x="0" y="5" width="12" height="2" fill="#fff" />}
                  </svg>
                </span>
                <span className="flex-1">
                  <span className="block font-serif text-[1.02rem] font-bold text-gov-navy">
                    {item.q}
                  </span>
                  {item.tag && (
                    <span className="mt-1 inline-block text-[0.68rem] font-bold uppercase tracking-wider text-gov-primary">
                      {item.tag}
                    </span>
                  )}
                </span>
              </button>
            </h3>
            {expanded && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={headingId}
                className="usa-prose px-1 pb-5 pl-9 text-sm text-[#3d4551]"
              >
                {item.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
