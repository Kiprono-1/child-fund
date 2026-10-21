"use client";

import { useMemo, useState } from "react";
import Accordion from "./Accordion";
import { FAQS, FAQ_CATEGORIES } from "@/lib/faq";

export default function FaqExplorer() {
  const [category, setCategory] = useState<string>("All questions");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQS.filter((f) => {
      const inCat = category === "All questions" || f.category === category;
      const inQuery = !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q);
      return inCat && inQuery;
    });
  }, [category, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof FAQS>();
    filtered.forEach((f) => {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    });
    return [...map.entries()];
  }, [filtered]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-60 flex-1">
          <label className="usa-label" htmlFor="faq-search">
            Search {FAQS.length} answers
          </label>
          <input
            id="faq-search"
            type="search"
            className="usa-input"
            placeholder="Try 'state match', 'twins', 'withdraw'…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <p className="m-0 pb-2 text-sm text-gov-base">
          <strong className="text-gov-navy">{filtered.length}</strong> result
          {filtered.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-2" role="tablist" aria-label="FAQ categories">
        {FAQ_CATEGORIES.map((c) => {
          const active = category === c;
          const n =
            c === "All questions" ? FAQS.length : FAQS.filter((f) => f.category === c).length;
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors ${
                active
                  ? "border-gov-navy bg-gov-navy text-white"
                  : "border-gov-base-light bg-white text-gov-primary-dark hover:border-gov-primary"
              }`}
            >
              {c} <span className="opacity-60">({n})</span>
            </button>
          );
        })}
      </div>

      {grouped.length === 0 && (
        <div className="usa-card bg-gov-base-lightest p-6 text-sm text-[#3d4551]">
          <p className="m-0 font-bold text-gov-navy">No answers matched your search.</p>
          <p className="mt-1 mb-0">
            Try a different term, or call the Guardian Help Line at{" "}
            <a href="tel:18445554823" className="font-semibold text-gov-primary hover:underline">
              1-844-555-4CTF
            </a>
            .
          </p>
        </div>
      )}

      <div className="space-y-10">
        {grouped.map(([cat, items]) => (
          <section key={cat}>
            <h2 className="m-0 border-b-2 border-gov-primary pb-1.5 font-serif text-xl font-bold text-gov-navy">
              {cat}
            </h2>
            <div className="mt-4">
              <Accordion
                items={items.map((f) => ({ q: f.q, a: f.a, tag: f.tag }))}
                defaultOpen={null}
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
