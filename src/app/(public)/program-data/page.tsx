import type { Metadata } from "next";
import Link from "next/link";
import { count, desc, eq, sql } from "drizzle-orm";
import { applications, deposits } from "@/db/schema";
import { db } from "@/db";
import { Callout, PageHero, SectionHeading, StatTile } from "@/components/ui";
import { formatUSD, STATUS_META } from "@/lib/program";
import { getProgramStats, getRecentApplications } from "@/lib/service";
import { getState } from "@/lib/states";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Program Data & Statistics",
  description:
    "Live enrollment and funding statistics for the U.S. Trump Account: registrations by state, deposits by source, case statuses and monthly filing trends.",
};

export default async function ProgramDataPage() {
  // Awaited first: guarantees the register exists before the raw queries run.
  const stats = await getProgramStats();

  const [recent, byStatus, byCohort, byType, byMethod, monthly] = await Promise.all([
    getRecentApplications(10),
    db
      .select({ status: applications.status, total: count() })
      .from(applications)
      .groupBy(applications.status),
    db
      .select({ auto: applications.autoEnrollment, total: count() })
      .from(applications)
      .groupBy(applications.autoEnrollment),
    db
      .select({
        type: deposits.depositType,
        total: sql<number>`coalesce(sum(${deposits.amountCents}),0)::bigint`,
        n: count(),
      })
      .from(deposits)
      .where(eq(deposits.status, "posted"))
      .groupBy(deposits.depositType),
    db
      .select({ method: applications.verificationMethod, total: count() })
      .from(applications)
      .groupBy(applications.verificationMethod),
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${applications.submittedAt}), 'Mon YYYY')`,
        key: sql<string>`to_char(date_trunc('month', ${applications.submittedAt}), 'YYYY-MM')`,
        total: sql<number>`count(*)::int`,
      })
      .from(applications)
      .groupBy(
        sql`to_char(date_trunc('month', ${applications.submittedAt}), 'Mon YYYY')`,
        sql`to_char(date_trunc('month', ${applications.submittedAt}), 'YYYY-MM')`,
      )
      .orderBy(sql`to_char(date_trunc('month', ${applications.submittedAt}), 'YYYY-MM')`),
  ]);

  const maxMonth = Math.max(1, ...monthly.map((m) => Number(m.total)));
  const maxState = Math.max(1, ...stats.byState.map((s) => Number(s.applications)));
  const auto = byCohort.find((c) => c.auto)?.total ?? 0;
  const guardian = byCohort.find((c) => !c.auto)?.total ?? 0;

  const TYPE_LABEL: Record<string, string> = {
    federal_seed: "Federal seed deposit",
    state_match: "State match",
    federal_supplement: "Federal birthday supplement",
    parent_contribution: "Guardian contribution",
    earnings: "Investment earnings",
  };
  const METHOD_LABEL: Record<string, string> = {
    login_gov: "Login.gov",
    id_me: "ID.me",
    document_upload: "Document upload",
    in_person: "In person at a state office",
  };

  return (
    <>
      <PageHero
        trail={[{ label: "Home", href: "/" }, { label: "Program Data" }]}
        eyebrow="Transparency · National register"
        title="Program data and statistics"
        lede={
          <>
            Read directly from the national enrollment register. Every figure on this page is
            generated from live program records, not from a static report.
          </>
        }
        aside={
          <div className="usa-card p-5">
            <h2 className="m-0 font-serif text-base font-bold text-gov-navy">Data dictionary</h2>
            <p className="mt-2 mb-0 text-sm leading-relaxed text-[#3d4551]">
              Registrations count filed Form TA-1 applications. Funded accounts are those that have
              received at least one posted deposit. Dollar figures are posted amounts only;
              scheduled deposits are shown separately.
            </p>
          </div>
        }
      />

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile value={stats.totalApplications.toLocaleString("en-US")} label="Total registrations" />
            <StatTile value={stats.fundedAccounts.toLocaleString("en-US")} label="Funded accounts" tone="gold" />
            <StatTile value={formatUSD(stats.totalPostedCents, false)} label="Posted deposits" tone="white" />
            <StatTile value={formatUSD(stats.scheduledCents, false)} label="Scheduled to wire" tone="white" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <StatTile value={formatUSD(stats.totalFederalCents, false)} label="Federal share" tone="white" />
            <StatTile value={formatUSD(stats.totalStateCents, false)} label="State share" tone="white" />
            <StatTile value={formatUSD(stats.totalGuardianCents, false)} label="Guardian share" tone="white" />
          </div>
        </div>
      </section>

      <section className="bg-gov-base-lightest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            <div className="usa-card p-5 sm:p-6">
              <SectionHeading kicker="Trend" title="Registrations filed per month" />
              <div className="mt-6 flex h-56 items-end gap-2">
                {monthly.map((m) => {
                  const h = Math.max(4, (Number(m.total) / maxMonth) * 100);
                  return (
                    <div key={m.key} className="group flex flex-1 flex-col items-center justify-end gap-1">
                      <span className="text-[0.65rem] font-bold text-gov-navy opacity-0 transition-opacity group-hover:opacity-100">
                        {m.total}
                      </span>
                      <div
                        className="w-full rounded-t bg-gov-primary transition-colors group-hover:bg-gov-navy"
                        style={{ height: `${h}%` }}
                        title={`${m.month}: ${m.total} registrations`}
                      />
                      <span className="text-[0.6rem] text-gov-base">{m.month.split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-gov-base">
                {monthly.length} month{monthly.length === 1 ? "" : "s"} of filing history in the
                register.
              </p>
            </div>

            <div className="space-y-6">
              <div className="usa-card p-5">
                <SectionHeading kicker="Cohorts" title="Automatic vs guardian-funded" />
                <div className="mt-4 space-y-3">
                  {[
                    { label: "Automatic cohort (born 2025–2028)", value: Number(auto), tone: "bg-gov-primary" },
                    { label: "Guardian-funded (born before 2025)", value: Number(guardian), tone: "bg-gov-accent" },
                  ].map((r) => {
                    const pctVal = stats.totalApplications
                      ? Math.round((r.value / stats.totalApplications) * 100)
                      : 0;
                    return (
                      <div key={r.label}>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#3d4551]">{r.label}</span>
                          <span className="font-bold tabular-nums text-gov-navy">
                            {r.value.toLocaleString("en-US")} ({pctVal}%)
                          </span>
                        </div>
                        <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-gov-base-light">
                          <div className={`h-full ${r.tone}`} style={{ width: `${pctVal}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="usa-card p-5">
                <SectionHeading kicker="Verification" title="How guardians prove identity" />
                <ul className="mt-4 list-none space-y-2 p-0">
                  {byMethod.map((m) => (
                    <li key={m.method} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-[#3d4551]">{METHOD_LABEL[m.method] ?? m.method}</span>
                      <span className="font-serif font-bold tabular-nums text-gov-navy">
                        {Number(m.total).toLocaleString("en-US")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
            <div>
              <SectionHeading kicker="Case pipeline" title="Applications by status" />
              <div className="mt-6 overflow-hidden rounded border border-gov-base-light">
                <table className="usa-table">
                  <thead>
                    <tr>
                      <th scope="col">Status</th>
                      <th scope="col">Meaning</th>
                      <th scope="col" className="text-right">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byStatus
                      .sort((a, b) => Number(b.total) - Number(a.total))
                      .map((s) => (
                        <tr key={s.status}>
                          <td className="font-bold text-gov-navy">
                            {STATUS_META[s.status]?.label ?? s.status}
                          </td>
                          <td className="text-xs text-[#3d4551]">{STATUS_META[s.status]?.blurb ?? ""}</td>
                          <td className="text-right font-serif font-bold tabular-nums">
                            {Number(s.total).toLocaleString("en-US")}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <SectionHeading kicker="Money flows" title="Posted deposits by source" />
              <div className="mt-6 overflow-hidden rounded border border-gov-base-light">
                <table className="usa-table">
                  <thead>
                    <tr>
                      <th scope="col">Source</th>
                      <th scope="col" className="text-right">Deposits</th>
                      <th scope="col" className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byType
                      .sort((a, b) => Number(b.total) - Number(a.total))
                      .map((t) => (
                        <tr key={t.type}>
                          <td className="font-bold text-gov-navy">{TYPE_LABEL[t.type] ?? t.type}</td>
                          <td className="text-right tabular-nums">{Number(t.n).toLocaleString("en-US")}</td>
                          <td className="text-right font-serif font-bold tabular-nums text-gov-green-dark">
                            {formatUSD(Number(t.total), false)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-6">
                <Callout tone="info" title="Open data">
                  These figures are published monthly in the Federal Fund Board&apos;s open data
                  catalog, together with the state administration agreements and the certified
                  custodian list.
                </Callout>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gov-navy py-12 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="max-w-3xl">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-gov-accent">
              By jurisdiction
            </p>
            <h2 className="mt-2 mb-0 font-serif text-[clamp(1.5rem,3vw,2.1rem)] font-bold">
              Registrations by state
            </h2>
            <div className="gov-rule mt-3" />
          </div>

          <div className="mt-8 grid gap-x-8 gap-y-2 md:grid-cols-2">
            {stats.byState.slice(0, 24).map((s) => {
              const pctVal = (Number(s.applications) / maxState) * 100;
              return (
                <div key={s.code} className="flex items-center gap-3">
                  <span className="w-36 shrink-0 truncate text-sm text-gov-primary-lighter">
                    {s.name}
                  </span>
                  <span className="h-3 flex-1 overflow-hidden rounded-full bg-white/15">
                    <span className="block h-full bg-gov-accent" style={{ width: `${pctVal}%` }} />
                  </span>
                  <span className="w-16 shrink-0 text-right text-sm font-bold tabular-nums">
                    {Number(s.applications)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {stats.byState.slice(0, 3).map((s, i) => (
              <div key={s.code} className="rounded border border-white/15 bg-white/5 p-4">
                <p className="m-0 text-[0.68rem] font-bold uppercase tracking-wider text-gov-accent">
                  {i === 0 ? "Leader" : i === 1 ? "Second" : "Third"}
                </p>
                <p className="m-0 mt-1 font-serif text-xl font-bold">{s.name}</p>
                <p className="m-0 text-xs text-gov-primary-light">
                  {Number(s.applications).toLocaleString("en-US")} children ·{" "}
                  {formatUSD(Number(s.postedCents), false)} deposited
                </p>
                <p className="m-0 mt-1 text-[0.7rem] text-gov-primary-light">
                  {getState(s.code)?.agency}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10">
            <Link href="/states" className="usa-button usa-button--accent">
              Full state match table
            </Link>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <SectionHeading
            kicker="Register extract"
            title="Most recent registrations"
            lede="Names are abbreviated and Social Security numbers are never published."
          />
          <div className="mt-6 overflow-x-auto rounded border border-gov-base-light">
            <table className="usa-table">
              <thead>
                <tr>
                  <th scope="col">Reference</th>
                  <th scope="col">Child</th>
                  <th scope="col">Born</th>
                  <th scope="col">State</th>
                  <th scope="col">Cohort</th>
                  <th scope="col">Filed</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.referenceNumber}>
                    <td className="font-mono text-xs">{r.referenceNumber}</td>
                    <td className="font-bold text-gov-navy">
                      {r.childFirstName} {r.childLastName.charAt(0)}.
                    </td>
                    <td>{r.childDob}</td>
                    <td>{getState(r.parentState)?.name ?? r.parentState}</td>
                    <td>{r.autoEnrollment ? "Automatic" : "Guardian-funded"}</td>
                    <td>{new Date(r.submittedAt).toLocaleDateString("en-US")}</td>
                    <td>{STATUS_META[r.status]?.label ?? r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}
