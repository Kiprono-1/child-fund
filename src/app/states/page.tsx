import type { Metadata } from "next";
import Link from "next/link";
import StateTable from "@/components/StateTable";
import { Callout, PageHero, SectionHeading, StatTile } from "@/components/ui";
import { formatUSD } from "@/lib/program";
import { STATES } from "@/lib/states";

export const metadata: Metadata = {
  title: "State Participation & Match Rates",
  description:
    "Child Trust Fund opening match rates, contribution match percentages and annual caps for all 50 states, the District of Columbia and five U.S. territories.",
};

export default function StatesPage() {
  const matches = STATES.map((s) => s.stateMatchCents);
  const total = matches.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / matches.length);
  const sorted = [...STATES].sort((a, b) => b.stateMatchCents - a.stateMatchCents);
  const highest = sorted[0];
  const lowest = sorted[sorted.length - 1];

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "State Participation" }]}
        eyebrow="States & territories · Program year 2026"
        title="State match rates for all 56 jurisdictions"
        lede={
          <>
            Every state, the District of Columbia and five permanently inhabited territories
            co-administer the Child Trust Fund and add their own money on top of the federal deposit.
            Rates below are the published figures for the current program year.
          </>
        }
      />

      <section className="bg-gov-base-lightest py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile value={STATES.length.toString()} label="Participating jurisdictions" tone="white" />
            <StatTile value={formatUSD(avg, false)} label="Average opening match" tone="white" />
            <StatTile value={`${highest.name} · ${formatUSD(highest.stateMatchCents, false)}`} label="Highest match" tone="gold" />
            <StatTile value={`${lowest.name} · ${formatUSD(lowest.stateMatchCents, false)}`} label="Lowest match" tone="white" />
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Interactive table"
            title="Look up your state"
            lede="Sort by any column, filter by name, and select a row for the full funding picture in that jurisdiction."
          />
          <div className="mt-8">
            <StateTable />
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <Callout tone="info" title="Why the rates differ">
              Congress set the federal seed at a flat $1,000 but left the state match to each
              legislature. States fund their match from general revenue, unclaimed property
              settlements or dedicated education trust funds, which is why the range runs from $150 to
              $550.
            </Callout>
            <Callout tone="warning" title="Rates can change">
              State matches are set annually and may change with each budget cycle. The rate that
              applies to your child is the rate published on the day the account is approved, not the
              day you register.
            </Callout>
          </div>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/apply" className="usa-button usa-button--primary">
              Register a child
            </Link>
            <Link href="/program-data" className="usa-button usa-button--outline-dark">
              Enrollment data by state
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
