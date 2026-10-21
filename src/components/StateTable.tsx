"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { STATES, type StateInfo } from "@/lib/states";
import { formatUSD } from "@/lib/program";

type SortKey = "name" | "stateMatchCents" | "contributionMatchPct" | "contributionMatchCapCents";

export default function StateTable() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("stateMatchCents");
  const [asc, setAsc] = useState(false);
  const [selected, setSelected] = useState<StateInfo | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = STATES.filter(
      (s) => !q || s.name.toLowerCase().includes(q) || s.code.toLowerCase() === q || s.agency.toLowerCase().includes(q),
    );
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return asc ? cmp : -cmp;
    });
  }, [query, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setAsc((v) => !v);
    else {
      setSortKey(key);
      setAsc(key === "name");
    }
  }

  const Th = ({ label, k, right }: { label: string; k: SortKey; right?: boolean }) => (
    <th scope="col" className={right ? "text-right" : undefined}>
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={`flex w-full items-center gap-1 font-bold uppercase tracking-[0.03em] text-inherit hover:text-gov-accent ${right ? "justify-end" : ""}`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        <span aria-hidden="true">{sortKey === k ? (asc ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <div>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1">
            <label className="usa-label" htmlFor="state-filter">
              Filter by state, code or treasury office
            </label>
            <input
              id="state-filter"
              type="search"
              className="usa-input"
              placeholder="Try 'Ohio', 'OH' or 'comptroller'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="m-0 pb-2 text-sm text-gov-base">
            <strong className="text-gov-navy">{rows.length}</strong> of {STATES.length} jurisdictions
          </p>
        </div>

        <div className="overflow-x-auto rounded border border-gov-base-light">
          <table className="usa-table">
            <thead>
              <tr>
                <Th label="State" k="name" />
                <Th label="Opening match" k="stateMatchCents" right />
                <Th label="Match on deposits" k="contributionMatchPct" right />
                <Th label="Annual cap" k="contributionMatchCapCents" right />
                <th scope="col">Co-administering office</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr
                  key={s.code}
                  onClick={() => setSelected(s)}
                  className={`cursor-pointer ${selected?.code === s.code ? "!bg-gov-primary-lighter" : "hover:!bg-gov-primary-lightest"}`}
                >
                  <td className="whitespace-nowrap font-bold text-gov-navy">
                    {s.name} <span className="ml-1 text-xs font-normal text-gov-base">({s.code})</span>
                  </td>
                  <td className="whitespace-nowrap text-right font-serif font-bold tabular-nums text-gov-green-dark">
                    {formatUSD(s.stateMatchCents)}
                  </td>
                  <td className="text-right tabular-nums">{s.contributionMatchPct}%</td>
                  <td className="text-right tabular-nums">{formatUSD(s.contributionMatchCapCents, false)}</td>
                  <td className="text-xs text-[#3d4551]">{s.agency}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-gov-base">
                    No jurisdiction matches &ldquo;{query}&rdquo;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gov-base">
          Opening matches apply to the automatic-enrollment cohort (children born 2025&ndash;2028).
          Match-on-deposit rates apply to every guardian contribution, in both cohorts. Rates are the
          published figures for program year 2026.
        </p>
      </div>

      <aside className="lg:sticky lg:top-32">
        {selected ? (
          <div className="usa-card overflow-hidden">
            <div className="bg-gov-navy px-5 py-4 text-white">
              <p className="m-0 text-[0.7rem] font-bold uppercase tracking-[0.14em] text-gov-accent">
                {selected.code}
              </p>
              <h2 className="m-0 mt-1 font-serif text-2xl font-bold">{selected.name}</h2>
              <p className="m-0 mt-1 text-xs text-gov-primary-light">{selected.agency}</p>
            </div>
            <dl className="m-0 divide-y divide-gov-base-light">
              {[
                ["Opening match (automatic cohort)", formatUSD(selected.stateMatchCents)],
                ["Match on guardian deposits", `${selected.contributionMatchPct}%`],
                ["Annual match cap", formatUSD(selected.contributionMatchCapCents, false)],
                ["Status", selected.participating ? "Participating" : "Not participating"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 px-5 py-3 text-sm">
                  <dt className="text-gov-base">{k}</dt>
                  <dd className="m-0 text-right font-serif font-bold text-gov-navy">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-gov-base-light bg-gov-base-lightest px-5 py-4">
              <p className="m-0 text-sm leading-relaxed text-[#3d4551]">
                A child registered in {selected.name} in the automatic cohort receives{" "}
                <strong className="text-gov-navy">
                  {formatUSD(100000 + selected.stateMatchCents)}
                </strong>{" "}
                on opening day — the $1,000 federal seed plus the state match — before any family
                contribution.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/apply" className="usa-button usa-button--primary !py-2 text-sm">
                  Register in {selected.name}
                </Link>
                <Link href="/verify#offices" className="usa-button usa-button--outline-dark !py-2 text-sm">
                  Find an office
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="usa-card bg-gov-base-lightest p-6 text-sm text-[#3d4551]">
            <h2 className="m-0 font-serif text-lg font-bold text-gov-navy">Select a state</h2>
            <p className="mt-2 mb-0">
              Choose any row in the table to see that jurisdiction&apos;s opening match, its match on
              guardian contributions, its annual cap and the treasury office that reviews your
              application.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}
