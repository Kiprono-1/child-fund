import { getState, type StateInfo } from "./states";

/** Statutory federal seed deposit for the automatic-enrollment cohort. */
export const FEDERAL_SEED_CENTS = 100000; // $1,000.00
/** Federal birthday supplement paid each year until the child turns 6. */
export const FEDERAL_SUPPLEMENT_CENTS = 15000; // $150.00 / year
/** Maximum a guardian may contribute to a single child account per year. */
export const ANNUAL_CONTRIBUTION_LIMIT_CENTS = 500000; // $5,000.00
/** Minimum initial deposit required per child at registration. */
export const MINIMUM_INITIAL_DEPOSIT_CENTS = 150000; // $1,500.00 per child
/** Automatic enrollment birth-year window. */
export const AUTO_ENROLLMENT_YEARS = [2025, 2026, 2027, 2028] as const;

export type ParticipationTier = "automatic" | "standard" | "legacy";

export type TierInfo = {
  tier: ParticipationTier;
  label: string;
  headline: string;
  autoEnrollment: boolean;
  federalSeedCents: number;
  federalSupplementCents: number;
  contributionAllowed: boolean;
  summary: string;
};

export function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function ageFromDob(dob?: string | null, now = new Date()): number | null {
  const d = parseDate(dob);
  if (!d) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

export function tierForDob(dob?: string | null): TierInfo {
  const d = parseDate(dob);
  const year = d ? d.getFullYear() : null;

  if (year !== null && (AUTO_ENROLLMENT_YEARS as readonly number[]).includes(year)) {
    return {
      tier: "automatic",
      label: "Automatic Enrollment Cohort",
      headline: `Born ${year} — fully federally funded`,
      autoEnrollment: true,
      federalSeedCents: FEDERAL_SEED_CENTS,
      federalSupplementCents: FEDERAL_SUPPLEMENT_CENTS,
      contributionAllowed: true,
      summary:
        "The U.S. Treasury opens the account automatically and wires the $1,000.00 federal seed deposit within 10 business days of identity verification, plus a $150.00 birthday supplement every year until the child turns 6. Your state match is added on top.",
    };
  }

  if (year !== null && year >= 2015) {
    return {
      tier: "standard",
      label: "Guardian-Funded Cohort",
      headline: `Born ${year} — guardian contributions accepted`,
      autoEnrollment: false,
      federalSeedCents: 0,
      federalSupplementCents: 0,
      contributionAllowed: true,
      summary:
        "Children born before January 1, 2025 are not part of the automatic federal seed cohort. A parent or legal guardian registers the child and funds the account directly; participating states still match guardian contributions.",
    };
  }

  return {
    tier: "legacy",
    label: "Legacy Cohort",
    headline: "Born before 2015 — transfer of an existing account",
    autoEnrollment: false,
    federalSeedCents: 0,
    federalSupplementCents: 0,
    contributionAllowed: true,
    summary:
      "Accounts opened for children born before 2015 are handled through the legacy transfer desk at your state treasury office. Contributions are still accepted up to the annual limit.",
  };
}

export type BenefitQuote = {
  stateCode: string;
  state?: StateInfo;
  tier: TierInfo;
  stateMatchCents: number;
  openingDayTotalCents: number;
  firstYearTotalCents: number;
  projectionAt18Cents: number;
  guardianContributionCents: number;
};

/**
 * Full funding quote for a child, used on the registration wizard and on the
 * account dashboard. Assumes a conservative 4.5% nominal annual return for the
 * CTF Growth Portfolio.
 */
export function quoteBenefits(opts: {
  dob?: string | null;
  stateCode?: string | null;
  guardianMonthlyCents?: number;
}): BenefitQuote {
  const tier = tierForDob(opts.dob);
  const state = getState(opts.stateCode);
  const stateMatchCents = tier.autoEnrollment ? (state?.stateMatchCents ?? 0) : 0;
  const guardianContributionCents = (opts.guardianMonthlyCents ?? 0) * 12;

  const openingDayTotalCents =
    tier.federalSeedCents + stateMatchCents + guardianContributionCents;
  const firstYearTotalCents = openingDayTotalCents + tier.federalSupplementCents;

  const age = ageFromDob(opts.dob) ?? 0;
  const yearsLeft = Math.max(0, 18 - age);
  const rate = 0.045;

  let balance = firstYearTotalCents / 100;
  const annualAddition = (tier.federalSupplementCents + guardianContributionCents) / 100;
  for (let i = 0; i < yearsLeft; i += 1) {
    balance = balance * (1 + rate) + annualAddition * (i < 5 ? 1 : 0);
  }

  return {
    stateCode: opts.stateCode ?? "",
    state,
    tier,
    stateMatchCents,
    openingDayTotalCents,
    firstYearTotalCents,
    guardianContributionCents,
    projectionAt18Cents: Math.round(balance * 100),
  };
}

export function formatUSD(cents: number, withCents = true): string {
  const value = (cents ?? 0) / 100;
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: withCents ? 2 : 0,
    maximumFractionDigits: withCents ? 2 : 0,
  });
}

export function formatDate(value?: string | Date | null): string {
  const d = typeof value === "string" ? parseDate(value) : value;
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const STATUS_META: Record<
  string,
  { label: string; tone: "gray" | "blue" | "gold" | "green" | "red"; blurb: string }
> = {
  submitted: {
    label: "Submitted",
    tone: "blue",
    blurb: "Your application was received and queued for federal intake review.",
  },
  under_review: {
    label: "Under review",
    tone: "blue",
    blurb: "A benefits specialist is reviewing the registration details.",
  },
  verification_required: {
    label: "Identity verification required",
    tone: "gold",
    blurb: "Upload the requested documents to complete verification.",
  },
  approved: {
    label: "Approved",
    tone: "green",
    blurb: "Verified. The child trust account is being opened with the custodian bank.",
  },
  funded: {
    label: "Funded — account open",
    tone: "green",
    blurb: "Federal and state deposits have been wired to the child's account.",
  },
  rejected: {
    label: "Action needed",
    tone: "red",
    blurb: "The application could not be approved as filed. See the case notes.",
  },
};

export const VERIFICATION_METHODS = [
  {
    id: "login_gov",
    label: "Login.gov verified account",
    detail: "Fastest option — usually approved the same business day.",
  },
  {
    id: "id_me",
    label: "ID.me identity proofing",
    detail: "Self-service video selfie check with a state-issued photo ID.",
  },
  {
    id: "document_upload",
    label: "Upload documents",
    detail: "Photo ID plus the child's certified birth certificate. 3–5 business days.",
  },
  {
    id: "in_person",
    label: "In person at a state treasury office",
    detail: "Bring originals; a specialist verifies you on the spot.",
  },
] as const;

export const ACCOUNT_TYPES = [
  {
    id: "ctf_savings",
    label: "CTF Savings Account",
    detail:
      "FDIC-insured deposit account held by an approved custodian bank. Principal protected, 3.90% APY program rate.",
  },
  {
    id: "ctf_growth",
    label: "CTF Growth Portfolio",
    detail:
      "Age-based diversified index portfolio managed by the Federal Fund Board. Higher long-term return, market risk applies.",
  },
  {
    id: "ctf_treasury",
    label: "CTF Treasury Ladder",
    detail:
      "Rolling Series I and 5-year Treasury holdings. Backed by the full faith and credit of the United States.",
  },
] as const;

export const RELATIONSHIPS = [
  "Parent (mother)",
  "Parent (father)",
  "Legal guardian",
  "Adoptive parent",
  "Foster parent (licensed)",
  "Grandparent (court appointed)",
] as const;

export const DOCUMENT_TYPES = [
  "Parent government photo ID (driver's license, state ID, passport)",
  "Child certified birth certificate",
  "Child Social Security card",
  "Court-appointed guardianship order",
  "Proof of U.S. residence (utility bill, lease)",
  "Custodian bank account statement",
] as const;
