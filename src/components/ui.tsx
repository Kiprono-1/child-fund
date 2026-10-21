import Link from "next/link";
import type { ReactNode } from "react";
import { STATUS_META } from "@/lib/program";

export function Breadcrumbs({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-[0.78rem] text-gov-base">
        {trail.map((t, i) => (
          <li key={t.label} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">›</span>}
            {t.href ? (
              <Link href={t.href} className="text-gov-primary hover:underline">
                {t.label}
              </Link>
            ) : (
              <span className="font-semibold text-gov-navy" aria-current="page">
                {t.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({
  eyebrow,
  title,
  lede,
  trail,
  actions,
  aside,
}: {
  eyebrow?: string;
  title: string;
  lede?: ReactNode;
  trail: { label: string; href?: string }[];
  actions?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="border-b border-gov-base-light bg-gov-primary-lightest">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <Breadcrumbs trail={trail} />
        <div className="grid items-start gap-8 lg:grid-cols-[1.6fr_1fr]">
          <div>
            {eyebrow && (
              <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-gov-primary">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 text-[clamp(1.9rem,4.4vw,3rem)] font-bold leading-[1.1] text-gov-navy">
              {title}
            </h1>
            <div className="gov-rule mt-4" />
            {lede && (
              <div className="usa-prose mt-4 max-w-3xl text-[1.02rem] text-[#3d4551]">{lede}</div>
            )}
            {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
          </div>
          {aside && <div>{aside}</div>}
        </div>
      </div>
    </section>
  );
}

export function SectionHeading({
  kicker,
  title,
  lede,
  align = "left",
}: {
  kicker?: string;
  title: string;
  lede?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      {kicker && (
        <p className="m-0 text-xs font-bold uppercase tracking-[0.18em] text-gov-primary">
          {kicker}
        </p>
      )}
      <h2 className="mt-2 text-[clamp(1.5rem,3vw,2.1rem)] font-bold leading-tight text-gov-navy">
        {title}
      </h2>
      <div className={`gov-rule mt-3 ${align === "center" ? "mx-auto" : ""}`} />
      {lede && <div className="usa-prose mt-3 text-[0.98rem] text-[#3d4551]">{lede}</div>}
    </div>
  );
}

const TONES: Record<string, string> = {
  gray: "bg-gov-base-lighter text-gov-navy",
  blue: "bg-gov-primary-lighter text-gov-primary-darker",
  gold: "bg-[#fef0c8] text-[#7a5b00]",
  green: "bg-[#ddf9c7] text-gov-green-dark",
  red: "bg-[#f4e3db] text-gov-red-dark",
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, tone: "gray" };
  return <span className={`usa-tag ${TONES[meta.tone]}`}>{meta.label}</span>;
}

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: "info" | "warning" | "success" | "error";
  title?: string;
  children: ReactNode;
}) {
  const styles = {
    info: "border-gov-primary bg-gov-primary-lightest text-gov-navy",
    warning: "border-gov-accent bg-[#fff8e8] text-[#5c4400]",
    success: "border-gov-green bg-[#f0f9ec] text-gov-green-dark",
    error: "border-gov-red bg-[#fdf3f2] text-gov-red-dark",
  }[tone];
  return (
    <div className={`border-l-4 ${styles} rounded-r p-4 text-sm leading-relaxed`} role="note">
      {title && <p className="m-0 mb-1 font-bold">{title}</p>}
      <div className="m-0">{children}</div>
    </div>
  );
}

export function StatTile({
  value,
  label,
  sub,
  tone = "navy",
}: {
  value: ReactNode;
  label: string;
  sub?: string;
  tone?: "navy" | "gold" | "white";
}) {
  const skin =
    tone === "white"
      ? "bg-white text-gov-navy border-gov-base-light"
      : tone === "gold"
        ? "bg-gov-accent text-gov-navy-deep border-gov-accent-dark"
        : "bg-gov-navy text-white border-gov-navy-deep";
  return (
    <div className={`rounded border ${skin} px-5 py-4`}>
      <p className="m-0 font-serif text-[1.65rem] font-bold leading-none tabular-nums">{value}</p>
      <p className="m-0 mt-2 text-[0.78rem] font-bold uppercase tracking-wider opacity-80">
        {label}
      </p>
      {sub && <p className="m-0 mt-1 text-xs opacity-70">{sub}</p>}
    </div>
  );
}

export function FeatureCard({
  icon,
  title,
  children,
  href,
  cta,
}: {
  icon?: ReactNode;
  title: string;
  children: ReactNode;
  href?: string;
  cta?: string;
}) {
  const inner = (
    <>
      {icon && <div className="text-gov-primary">{icon}</div>}
      <h3 className="mt-3 mb-0 font-serif text-lg font-bold text-gov-navy">{title}</h3>
      <div className="usa-prose mt-2 text-sm text-[#3d4551]">{children}</div>
      {cta && (
        <p className="mt-4 mb-0 text-sm font-bold text-gov-primary">
          {cta} <span aria-hidden="true">→</span>
        </p>
      )}
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        className="usa-card group block h-full p-5 transition-shadow hover:border-gov-primary hover:shadow-md"
      >
        {inner}
      </Link>
    );
  }
  return <div className="usa-card h-full p-5">{inner}</div>;
}

export function StepList({ steps }: { steps: { title: string; body: ReactNode }[] }) {
  return (
    <ol className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-4">
      {steps.map((s, i) => (
        <li key={s.title} className="relative border-t-4 border-gov-primary pt-4">
          <span className="absolute -top-[1.05rem] left-0 flex h-8 w-8 items-center justify-center rounded-full bg-gov-accent font-serif text-sm font-bold text-gov-navy-deep">
            {i + 1}
          </span>
          <h3 className="mt-4 mb-1 font-serif text-base font-bold text-gov-navy">{s.title}</h3>
          <div className="usa-prose text-sm text-[#3d4551]">{s.body}</div>
        </li>
      ))}
    </ol>
  );
}

export function Icon({ name, className = "h-8 w-8" }: { name: string; className?: string }) {
  const paths: Record<string, ReactNode> = {
    baby: (
      <>
        <circle cx="12" cy="9" r="4" />
        <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        <path d="M9.5 8.5h.01M14.5 8.5h.01" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v6c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-3z" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    bank: (
      <>
        <path d="M3 10 12 4l9 6" />
        <path d="M5 10v9M9.5 10v9M14.5 10v9M19 10v9M3 21h18" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V6M4 20h16" />
        <path d="m7 16 3.5-4 3 2.5L20 7" />
      </>
    ),
    document: (
      <>
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4M9.5 12h6M9.5 15.5h6" />
      </>
    ),
    check: <path d="m5 12.5 4.5 4.5L19 7" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5.5l3.5 2" />
      </>
    ),
    pin: (
      <>
        <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    phone: (
      <path d="M6 3h4l2 5-2.5 1.5a12 12 0 0 0 5 5L16 12l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2z" />
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>
    ),
    star: <path d="m12 3 2.7 5.8 6.3.8-4.6 4.4 1.2 6.2L12 17.3 6.4 20.2l1.2-6.2L3 9.6l6.3-.8L12 3z" />,
    book: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
        <path d="M20 18v3H6.5" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name] ?? paths.star}
    </svg>
  );
}
